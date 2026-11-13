const SUPABASE_URL = 'https://cbwywzbrijqlijwykxrb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jusl81rRe_vz1oYKATQkog__TSs2N9f';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let editingPkValue = null;

const TABLE_SCHEMAS = {
    rooms: { pk: 'room_id', cols: ['room_number', 'room_type_id', 'status'] },
    room_types: { pk: 'room_type_id', cols: ['type_name', 'description', 'price_per_night', 'max_capacity'] },
    customers: { pk: 'customer_id', cols: ['name', 'phone', 'email', 'password'] },
    staff: { pk: 'staff_id', cols: ['name', 'role', 'email', 'phone'] },
    promotions: { pk: 'promotion_id', cols: ['promotion_name', 'discount', 'start_date', 'end_date'] },
    room_bookings: { pk: 'booking_id', cols: ['customer_id', 'room_id', 'promotion_id', 'staff_id', 'check_in', 'check_out', 'total_amount', 'status'] },
    payments: { pk: 'payment_id', cols: ['booking_id', 'staff_id', 'amount', 'payment_method', 'status'] },
    categories: { pk: 'category_id', cols: ['category_name', 'description'] },
    menu_items: { pk: 'menu_id', cols: ['category_id', 'item_name', 'price', 'is_available'] },
    room_service_orders: { pk: 'order_id', cols: ['room_id', 'booking_id', 'staff_id', 'total_amount', 'status'] },
    order_details: { pk: 'detail_id', cols: ['order_id', 'menu_id', 'quantity', 'subtotal'] },
    tour_guides: { pk: 'guide_id', cols: ['name', 'phone', 'languages', 'license_no', 'status'] },
    tour_packages: { pk: 'package_id', cols: ['package_name', 'destination', 'duration_hours', 'price', 'max_capacity'] },
    tour_bookings: { pk: 'booking_id', cols: ['customer_id', 'package_id', 'guide_id', 'staff_id', 'tour_date', 'num_people', 'total_amount', 'status'] },
    reviews: { pk: 'review_id', cols: ['customer_id', 'room_booking_id', 'tour_booking_id', 'rating', 'comment'] }
};

window.onload = async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) setupLoggedInUI(session.user);
};

function setupLoggedInUI(user) {
    currentUser = user;
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('nav-links').style.display = 'flex';
    document.getElementById('user-display').innerText = user.email;
    showTab('crud-tab', document.querySelector('.nav-btn'));
    onSelectCrudTable();
    loadSelectedView();
}

async function register() {
    const name = document.getElementById('auth-name').value.trim();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const msg = document.getElementById('auth-msg');

    if (!email || !password) {
        msg.style.color = '#dc2626';
        msg.innerText = 'กรุณากรอกอีเมลและรหัสผ่าน';
        return;
    }

    msg.style.color = '#2563eb';
    msg.innerText = '⏳ กำลังสมัครสมาชิก...';

    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
        msg.style.color = '#dc2626';
        msg.innerText = 'สมัครไม่สำเร็จ: ' + error.message;
        return;
    }

    if (name) {
        await supabaseClient.from('customers').insert({ name, email, password: 'auth_managed' });
    }
    msg.style.color = 'green';
    msg.innerText = '✅ สมัครสมาชิกสำเร็จ! กดปุ่ม "เข้าสู่ระบบ (Login)" ได้เลย';
}

async function login() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const msg = document.getElementById('auth-msg');

    if (!email || !password) {
        msg.style.color = '#dc2626';
        msg.innerText = 'กรุณากรอกอีเมลและรหัสผ่าน';
        return;
    }

    msg.style.color = '#2563eb';
    msg.innerText = '⏳ กำลังเข้าสู่ระบบ...';

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        msg.style.color = '#dc2626';
        msg.innerText = 'เข้าสู่ระบบไม่สำเร็จ: ' + error.message;
        return;
    }

    setupLoggedInUI(data.user);
}

async function logout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

function showTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    if (btnElement) btnElement.classList.add('active');
}

function onSelectCrudTable() {
    resetDynamicForm();
    const tableName = document.getElementById('crud-table-selector').value;
    const schema = TABLE_SCHEMAS[tableName];
    const formContainer = document.getElementById('dynamic-form-fields');
    
    formContainer.innerHTML = schema.cols.map(col => `
        <div>
            <label>${col}</label>
            <input type="text" id="field-${col}" placeholder="กรอกค่า ${col}">
        </div>
    `).join('');

    loadCrudTableData();
}

async function loadCrudTableData() {
    const tableName = document.getElementById('crud-table-selector').value;
    const schema = TABLE_SCHEMAS[tableName];
    const container = document.getElementById('crud-table-container');
    document.getElementById('crud-table-title').innerText = `ข้อมูลในตาราง: ${tableName} (แสดง 20 แถวล่าสุด)`;
    container.innerHTML = '<p>กำลังโหลด...</p>';

    const { data, error } = await supabaseClient.from(tableName).select('*').order(schema.pk, { ascending: false }).limit(20);
    if (error) return container.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    if (!data || data.length === 0) return container.innerHTML = '<p>ยังไม่มีข้อมูลในตารางนี้</p>';

    const firstRow = data.at(0);
    const headers = Object.keys(firstRow);
    let html = '<table><thead><tr><th>จัดการ</th>';
    headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';

    data.forEach(row => {
        const pkVal = row[schema.pk];
        const rowJson = encodeURIComponent(JSON.stringify(row));
        html += `<tr>
            <td>
                <button class="btn-edit" onclick="editDynamicRecord('${rowJson}')">แก้ไข</button>
                <button class="btn-del" onclick="deleteDynamicRecord(${pkVal})">ลบ</button>
            </td>`;
        headers.forEach(h => html += `<td>${row[h] !== null ? row[h] : '-'}</td>`);
        html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function editDynamicRecord(encodedRow) {
    const row = JSON.parse(decodeURIComponent(encodedRow));
    const tableName = document.getElementById('crud-table-selector').value;
    const schema = TABLE_SCHEMAS[tableName];

    editingPkValue = row[schema.pk];
    schema.cols.forEach(col => {
        const input = document.getElementById(`field-${col}`);
        if (input) input.value = row[col] !== null ? row[col] : '';
    });

    document.getElementById('btn-save-record').innerText = `💾 บันทึกการแก้ไข (ID: ${editingPkValue})`;
    document.getElementById('btn-cancel-record').style.display = 'inline-block';
}

function resetDynamicForm() {
    editingPkValue = null;
    document.querySelectorAll('#dynamic-form-fields input').forEach(inp => inp.value = '');
    document.getElementById('btn-save-record').innerText = '➕ เพิ่มข้อมูลใหม่';
    document.getElementById('btn-cancel-record').style.display = 'none';
}

async function saveDynamicRecord() {
    const tableName = document.getElementById('crud-table-selector').value;
    const schema = TABLE_SCHEMAS[tableName];
    const payload = {};

    schema.cols.forEach(col => {
        const val = document.getElementById(`field-${col}`).value.trim();
        payload[col] = val === '' ? null : val;
    });

    if (editingPkValue !== null) {
        const { error } = await supabaseClient.from(tableName).update(payload).eq(schema.pk, editingPkValue);
        if (error) return alert('แก้ไขไม่สำเร็จ: ' + error.message);
    } else {
        const { error } = await supabaseClient.from(tableName).insert(payload);
        if (error) return alert('เพิ่มข้อมูลไม่สำเร็จ: ' + error.message);
    }

    resetDynamicForm();
    loadCrudTableData();
}

async function deleteDynamicRecord(pkVal) {
    const tableName = document.getElementById('crud-table-selector').value;
    const schema = TABLE_SCHEMAS[tableName];
    if (!confirm(`ยืนยันการลบข้อมูล ID: ${pkVal} จากตาราง ${tableName}?`)) return;

    const { error } = await supabaseClient.from(tableName).delete().eq(schema.pk, pkVal);
    if (error) return alert('ลบไม่สำเร็จ (อาจมีข้อมูลตารางอื่นอ้างอิงอยู่): ' + error.message);
    loadCrudTableData();
}

async function loadSelectedView() {
    const viewName = document.getElementById('view-selector').value;
    const container = document.getElementById('view-result-container');
    container.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

    const { data, error } = await supabaseClient.from(viewName).select('*').limit(20);
    if (error) return container.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    if (!data || data.length === 0) return container.innerHTML = '<p>ไม่มีข้อมูลใน View นี้</p>';

    container.innerHTML = buildHtmlTable(data);
}

function buildHtmlTable(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) return '';
    const firstRow = dataArray.at(0);
    const headers = Object.keys(firstRow);
    let html = '<table><thead><tr>';
    headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';
    dataArray.forEach(row => {
        html += '<tr>';
        headers.forEach(h => html += `<td>${row[h] !== null ? row[h] : '-'}</td>`);
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

async function sendChat() {
    const input = document.getElementById('chat-input');
    const question = input.value.trim();
    if (!question) return;

