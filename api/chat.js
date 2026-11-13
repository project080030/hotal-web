export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { question, userEmail } = req.body || {};
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า Environment Variables บน Vercel' });
    }

    const dbSchema = 'Tables: ' +
        'customers (customer_id, name, phone, email, created_at), ' +
        'staff (staff_id, name, role, email, phone), ' +
        'room_types (room_type_id, type_name, description, price_per_night, max_capacity), ' +
        'rooms (room_id, room_number, room_type_id, status), ' +
        'promotions (promotion_id, promotion_name, discount, start_date, end_date), ' +
        'room_bookings (booking_id, customer_id, room_id, promotion_id, staff_id, booking_date, check_in, check_out, total_amount, status), ' +
        'payments (payment_id, booking_id, staff_id, amount, payment_date, payment_method, status), ' +
        'categories (category_id, category_name, description), ' +
        'menu_items (menu_id, category_id, item_name, price, is_available), ' +
        'room_service_orders (order_id, room_id, booking_id, staff_id, order_date, total_amount, status), ' +
        'order_details (detail_id, order_id, menu_id, quantity, subtotal), ' +
        'tour_guides (guide_id, name, phone, languages, license_no, status), ' +
        'tour_packages (package_id, package_name, destination, duration_hours, price, max_capacity), ' +
        'tour_bookings (booking_id, customer_id, package_id, guide_id, staff_id, tour_date, num_people, total_amount, status), ' +
        'reviews (review_id, customer_id, room_booking_id, tour_booking_id, rating, comment, created_at). ' +
        'Views: view_room_bookings, view_room_service_details, view_tour_bookings, view_payment_summary, view_all_reviews, view_available_rooms.';

    const geminiHost = 'generativelanguage' + '.googleapis.com';
    const models = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-3.8-flash'];

    async function askGemini(promptText) {
        let lastError = 'ไม่สามารถติดต่อ AI ได้';
        for (let i = 0; i < models.length; i++) {
            const url = 'https://' + geminiHost + '/v1beta/models/' + models[i] + ':generateContent?key=' + GEMINI_API_KEY;
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
                });
                const data = await response.json();
                if (response.ok && data.candidates && data.candidates.length > 0) {
                    return data.candidates[0].content.parts[0].text;
                }
                lastError = data.error ? data.error.message : JSON.stringify(data);
            } catch (e) {
                lastError = e.message;
            }
        }
        throw new Error('Gemini API Error: ' + lastError);
    }

    try {
        const promptSql = 'คุณคือผู้เชี่ยวชาญ PostgreSQL จงแปลงคำถามของผู้ใช้เป็นคำสั่ง SQL (SELECT เท่านั้น ห้ามมีเครื่องหมาย ; ปิดท้าย และห้ามใช้ markdown) ' +
            'ใช้โครงสร้างฐานข้อมูลนี้: ' + dbSchema + ' ' +
            'หากเป็นคำถามทั่วไปที่ไม่เกี่ยวกับฐานข้อมูล ให้ตอบว่า NO_SQL ' +
            'คำถาม: "' + question + '"';

        let generatedSql = await askGemini(promptSql);
        generatedSql = generatedSql.replace(/```sql|```|;/g, '').trim();

        let queryResult = [];
        let finalAnswer = '';

        if (generatedSql !== 'NO_SQL' && generatedSql.toLowerCase().startsWith('select')) {
            const sbRes = await fetch(SUPABASE_URL + '/rest/v1/rpc/exec_read_only_sql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ query_text: generatedSql })
            });

            if (!sbRes.ok) {
                const errText = await sbRes.text();
                throw new Error('รัน SQL ไม่สำเร็จ: ' + errText);
            }
            queryResult = await sbRes.json();

            const promptAnswer = 'จากคำถาม: "' + question + '" ' +
                'และข้อมูลที่ได้จากฐานข้อมูล: ' + JSON.stringify(queryResult).slice(0, 3000) + ' ' +
                'จงสรุปคำตอบเป็นภาษาไทยให้ชัดเจน กระชับ และสุภาพ';

            finalAnswer = await askGemini(promptAnswer);
        } else {
            generatedSql = null;
            finalAnswer = await askGemini('ตอบคำถามนี้ในฐานะผู้ช่วยระบบโรงแรมและทัวร์: ' + question);
        }

        await fetch(SUPABASE_URL + '/rest/v1/chat_logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                user_email: userEmail || 'guest',
                question: question,
                generated_sql: generatedSql,
                ai_answer: finalAnswer
            })
        });

        return res.status(200).json({
            answer: finalAnswer,
            sql: generatedSql,
            data: queryResult
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
