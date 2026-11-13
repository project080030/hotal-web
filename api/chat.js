```javascript
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { question, userEmail } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า Environment Variables บน Server' });
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

    const geminiEndpoint = 'https://googleapis.com' + GEMINI_API_KEY;

    try {
        const promptSql = 'คุณคือผู้เชี่ยวชาญ PostgreSQL จงแปลงคำถามของผู้ใช้เป็นคำสั่ง SQL (SELECT เท่านั้น ห้ามมีเครื่องหมาย ; ปิดท้าย และห้ามใช้ markdown) ' +
            'ใช้โครงสร้างฐานข้อมูลนี้: ' + dbSchema + ' ' +
            'หากเป็นคำถามทั่วไปที่ไม่เกี่ยวกับฐานข้อมูล ให้ตอบว่า NO_SQL ' +
            'คำถาม: "' + question + '"';

        const geminiRes1 = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptSql }] }] })
        });
        const geminiData1 = await geminiRes1.json();
        const candidate1 = geminiData1.candidates ? geminiData1.candidates[0] : null;
        const part1 = candidate1 && candidate1.content && candidate1.content.parts ? candidate1.content.parts[0] : null;
        let generatedSql = part1 && part1.text ? part1.text.trim() : 'NO_SQL';
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

            const geminiRes2 = await fetch(geminiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptAnswer }] }] })
            });
            const geminiData2 = await geminiRes2.json();
            const candidate2 = geminiData2.candidates ? geminiData2.candidates[0] : null;
            const part2 = candidate2 && candidate2.content && candidate2.content.parts ? candidate2.content.parts[0] : null;
            finalAnswer = part2 && part2.text ? part2.text : 'พบข้อมูลตามตารางด้านล่างครับ';
        } else {
            generatedSql = null;
            const geminiGeneral = await fetch(geminiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'ตอบคำถามนี้ในฐานะผู้ช่วยระบบโรงแรมและทัวร์: ' + question }] }] })
            });
            const generalData = await geminiGeneral.json();
            const candidateGen = generalData.candidates ? generalData.candidates[0] : null;
            const partGen = candidateGen && candidateGen.content && candidateGen.content.parts ? candidateGen.content.parts[0] : null;
            finalAnswer = partGen && partGen.text ? partGen.text : 'สวัสดีครับ มีอะไรให้ช่วยไหมครับ';
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
