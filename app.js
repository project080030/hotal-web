
// =====================================================
// 1. SUPABASE CONFIGURATION
// =====================================================

const PROJECT_ID = 'cbwywzbrijqlijwykxrb';
const SUPABASE_URL = 'https://' + PROJECT_ID + '.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jusl81rRe_vz1oYKATQkog__TSs2N9f';

let currentUser = null;
let accessToken = SUPABASE_ANON_KEY;
let editingPkValue = null;


// =====================================================
// 2. DATABASE TABLE SCHEMAS
// =====================================================

const TABLE_SCHEMAS = {
    rooms: { pk: 'room_id', cols: ['room_number', 'room_type_id', 'status'] },
    room_types: { pk: 'room_type_id', cols: ['type_name', 'description', 'price_per_night', 'max_capacity'] },
    customers: { pk: 'customer_id', cols: ['name', 'phone', 'email', 'password'] },
    staff: { pk: 'staff_id', cols: ['name', 'role', 'email', 'phone'] },
    promotions: { pk: 'promotion_id', cols: ['promotion_name', 'discount', 'start_date', 'end_date'] },
    room_bookings: {
        pk: 'booking_id',
        cols: ['customer_id', 'room_id', 'promotion_id', 'staff_id', 'check_in', 'check_out', 'total_amount', 'status']
    },
    payments: { pk: 'payment_id', cols: ['booking_id', 'staff_id', 'amount', 'payment_method', 'status'] },
    categories: { pk: 'category_id', cols: ['category_name', 'description'] },
    menu_items: { pk: 'menu_id', cols: ['category_id', 'item_name', 'price', 'is_available'] },
    room_service_orders: { pk: 'order_id', cols: ['room_id', 'booking_id', 'staff_id', 'total_amount', 'status'] },
    order_details: { pk: 'detail_id', cols: ['order_id', 'menu_id', 'quantity', 'subtotal'] },
    tour_guides: { pk: 'guide_id', cols: ['name', 'phone', 'languages', 'license_no', 'status'] },
    tour_packages: { pk: 'package_id', cols: ['package_name', 'destination', 'duration_hours', 'price', 'max_capacity'] },
    tour_bookings: {
        pk: 'booking_id',
        cols: ['customer_id', 'package_id', 'guide_id', 'staff_id', 'tour_date', 'num_people', 'total_amount', 'status']
    },
    reviews: { pk: 'review_id', cols: ['customer_id', 'room_booking_id', 'tour_booking_id', 'rating', 'comment'] }
};


// =====================================================
// 3. API HEADER MANAGEMENT
// =====================================================

function getHeaders(extraHeaders) {
    const headers = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + accessToken
    };

    if (extraHeaders) {
        Object.keys(extraHeaders).forEach(function (key) {
            headers[key] = extraHeaders[key];
        });
    }

    return headers;
}


// =====================================================
// 4. AUTHENTICATION INITIALIZATION
// =====================================================

window.onload = function () {
    const savedUser = localStorage.getItem('hotel_user');
    const savedToken = localStorage.getItem('hotel_token');

    if (savedUser && savedToken) {
        try {
            accessToken = savedToken;
            setupLoggedInUI(JSON.parse(savedUser));
        } catch (err) {
            localStorage.removeItem('hotel_token');
            localStorage.removeItem('hotel_user');
        }
    }
};


// =====================================================
// 5. LOGIN UI SETUP
// =====================================================

function setupLoggedInUI(user) {
    currentUser = user;

    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('nav-links').style.display = 'flex';
    document.getElementById('user-display').innerText = user.email;

    showTab('crud-tab', document.querySelector('.nav-btn'));
    onSelectCrudTable();
    loadSelectedView();
}


// =====================================================
// 6. REGISTER
// =====================================================

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

    try {
        const res = await fetch(SUPABASE_URL + '/auth/v1/signup', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await res.json();

        if (!res.ok) {
            msg.style.color = '#dc2626';
            msg.innerText = 'สมัครไม่สำเร็จ: ' +
                (data.msg || data.error_description || data.message || 'ตรวจสอบอีเมล/รหัสผ่าน');
            return;
        }

        if (name) {
            const customerRes = await fetch(SUPABASE_URL + '/rest/v1/customers', {
                method: 'POST',
                headers: getHeaders({ 'Prefer': 'return=minimal' }),
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: 'auth_managed'
                })
            });

            if (!customerRes.ok) {
                throw new Error('สมัครสมาชิกสำเร็จ แต่บันทึกข้อมูลลูกค้าไม่สำเร็จ');
            }
        }

        msg.style.color = 'green';
        msg.innerText = '✅ สมัครสมาชิกสำเร็จ! กดปุ่ม "เข้าสู่ระบบ (Login)" ได้เลย';

    } catch (err) {
        msg.style.color = '#dc2626';
        msg.innerText = 'เกิดข้อผิดพลาด: ' + err.message;
    }
}


// =====================================================
// 7. LOGIN
// =====================================================

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

    try {
        const res = await fetch(
            SUPABASE_URL + '/auth/v1/token?grant_type=password',
            {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        const data = await res.json();

        if (!res.ok) {
            msg.style.color = '#dc2626';
            msg.innerText = 'เข้าสู่ระบบไม่สำเร็จ: ' +
                (data.error_description || data.msg || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            return;
        }

        accessToken = data.access_token;

        localStorage.setItem('hotel_token', accessToken);
        localStorage.setItem('hotel_user', JSON.stringify(data.user));

        setupLoggedInUI(data.user);

    } catch (err) {
        msg.style.color = '#dc2626';
        msg.innerText = 'เกิดข้อผิดพลาด: ' + err.message;
    }
}


// =====================================================
// 8. LOGOUT
// =====================================================

function logout() {
    localStorage.removeItem('hotel_token');
    localStorage.removeItem('hotel_user');

    currentUser = null;
    accessToken = SUPABASE_ANON_KEY;

    location.reload();
}


// =====================================================
// 9. NAVIGATION / TAB MANAGEMENT
// =====================================================

function showTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(function (el) {
        el.style.display = 'none';
    });

    document.querySelectorAll('.nav-btn').forEach(function (el) {
        el.classList.remove('active');
    });

    document.getElementById(tabId).style.display = 'block';

    if (btnElement) {
        btnElement.classList.add('active');
    }
}


// =====================================================
// 10. CRUD TABLE SELECTION
// =====================================================

function onSelectCrudTable() {
    resetDynamicForm();

    const tableName = document.getElementById('crud-table-selector').value;
    const schema = TABLE_SCHEMAS[tableName];
    const formContainer = document.getElementById('dynamic-form-fields');

    if (!schema) return;

    let formHtml = '';

    schema.cols.forEach(function (col) {
        formHtml += `
            <div>
                <label>${col}</label>
                <input
                    type="text"
                    id="field-${col}"
                    placeholder="กรอกค่า ${col}"
                >
            </div>
        `;
    });

    formContainer.innerHTML = formHtml;

    loadCrudTableData();
}


// =====================================================
// 11. LOAD CRUD TABLE DATA
// =====================================================

async function loadCrudTableData() {
    const tableName = document.getElementById('crud-table-selector').value;
    const schema = TABLE_SCHEMAS[tableName];
    const container = document.getElementById('crud-table-container');

    if (!schema) return;

    document.getElementById('crud-table-title').innerText =
        'ข้อมูลในตาราง: ' + tableName + ' (แสดง 20 แถวล่าสุด)';

    container.innerHTML = '<p>กำลังโหลด...</p>';

    try {
        const res = await fetch(
            SUPABASE_URL + '/rest/v1/' + tableName +
            '?select=*&order=' + schema.pk + '.desc&limit=20',
            {
                headers: getHeaders()
            }
        );

        const data = await res.json();

        if (!res.ok) {
            container.textContent = 'Error: ' + (data.message || JSON.stringify(data));
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p>ยังไม่มีข้อมูลในตารางนี้</p>';
            return;
        }

        const headers = Object.keys(data[0]);

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>จัดการ</th>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach(function (row) {
            const pkVal = JSON.stringify(row[schema.pk]);
            const rowJson = encodeURIComponent(JSON.stringify(row));

            html += `
                <tr>
                    <td>
                        <button class="btn-edit"
                            onclick="editDynamicRecord('${rowJson}')">
                            แก้ไข
                        </button>

                        <button class="btn-del"
                            onclick='deleteDynamicRecord(${pkVal})'>
                            ลบ
                        </button>
                    </td>

                    ${headers.map(h => `<td>${row[h] ?? '-'}</td>`).join('')}
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;

    } catch (err) {
        container.textContent = 'Error: ' + err.message;
    }
}


// =====================================================
// 12. EDIT DYNAMIC RECORD
// =====================================================

function editDynamicRecord(encodedRow) {
    const row = JSON.parse(decodeURIComponent(encodedRow));

    const tableName = document.getElementById('crud-table-selector').value;
    const schema = TABLE_SCHEMAS[tableName];

    editingPkValue = row[schema.pk];

    schema.cols.forEach(function (col) {
        const input = document.getElementById('field-' + col);

        if (input) {
            input.value = row[col] !== null ? row[col] : '';
        }
    });

    document.getElementById('btn-save-record').innerText =
        '💾 บันทึกการแก้ไข (ID: ' + editingPkValue + ')';

    document.getElementById('btn-cancel-record').style.display = 'inline-block';
}


// =====================================================
// 13. RESET DYNAMIC FORM
// =====================================================

function resetDynamicForm() {
    editingPkValue = null;

    document.querySelectorAll('#dynamic-form-fields input').forEach(function (inp) {
        inp.value = '';
    });

    document.getElementById('btn-save-record').innerText = '➕ เพิ่มข้อมูลใหม่';
    document.getElementById('btn-cancel-record').style.display = 'none';
}


// =====================================================
// 14. SAVE / INSERT / UPDATE RECORD
// =====================================================

async function saveDynamicRecord() {
    const tableName = document.getElementById('crud-table-selector').value;
    const schema = TABLE_SCHEMAS[tableName];

    if (!schema) return;

    const payload = {};

    schema.cols.forEach(function (col) {
        const val = document.getElementById('field-' + col).value.trim();
        payload[col] = val === '' ? null : val;
    });

    try {
        let res;

        if (editingPkValue !== null) {
            res = await fetch(
                SUPABASE_URL + '/rest/v1/' + tableName +
                '?' + schema.pk + '=eq.' + encodeURIComponent(editingPkValue),
                {
                    method: 'PATCH',
                    headers: getHeaders({ 'Prefer': 'return=minimal' }),
                    body: JSON.stringify(payload)
                }
            );

        } else {
            res = await fetch(SUPABASE_URL + '/rest/v1/' + tableName, {
                method: 'POST',
                headers: getHeaders({ 'Prefer': 'return=minimal' }),
                body: JSON.stringify(payload)
            });
        }

        if (!res.ok) {
            const errData = await res.json();
            return alert('บันทึกไม่สำเร็จ: ' + (errData.message || JSON.stringify(errData)));
        }

        resetDynamicForm();
        loadCrudTableData();

    } catch (err) {
        alert('Error: ' + err.message);
    }
}


// =====================================================
// 15. DELETE DYNAMIC RECORD
// =====================================================

async function deleteDynamicRecord(pkVal) {
    const tableName = document.getElementById('crud-table-selector').value;
    const schema = TABLE_SCHEMAS[tableName];

    if (!schema) return;

    if (!confirm(
        'ยืนยันการลบข้อมูล ID: ' + pkVal +
        ' จากตาราง ' + tableName + '?'
    )) {
        return;
    }

    try {
        const res = await fetch(
            SUPABASE_URL + '/rest/v1/' + tableName +
            '?' + schema.pk + '=eq.' + encodeURIComponent(pkVal),
            {
                method: 'DELETE',
                headers: getHeaders({ 'Prefer': 'return=minimal' })
            }
        );

        if (!res.ok) {
            const errData = await res.json();
            return alert(
                'ลบไม่สำเร็จ (อาจมีข้อมูลตารางอื่นอ้างอิงอยู่): ' +
                (errData.message || JSON.stringify(errData))
            );
        }

        loadCrudTableData();

    } catch (err) {
        alert('Error: ' + err.message);
    }
}


// =====================================================
// 16. LOAD DATABASE VIEW
// =====================================================

async function loadSelectedView() {
    const viewName = document.getElementById('view-selector').value;
    const container = document.getElementById('view-result-container');

    container.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

    try {
        const res = await fetch(
            SUPABASE_URL + '/rest/v1/' + viewName + '?select=*&limit=20',
            {
                headers: getHeaders()
            }
        );

        const data = await res.json();

        if (!res.ok) {
            container.textContent = 'Error: ' + (data.message || JSON.stringify(data));
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p>ไม่มีข้อมูลใน View นี้</p>';
            return;
        }

        container.innerHTML = buildHtmlTable(data);

    } catch (err) {
        container.textContent = 'Error: ' + err.message;
    }
}


// =====================================================
// 17. BUILD HTML TABLE
// =====================================================

function buildHtmlTable(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return '';
    }

    const headers = Object.keys(dataArray[0]);

    let html = `
        <table>
            <thead>
                <tr>
                    ${headers.map(h => `<th>${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    dataArray.forEach(function (row) {
        html += '<tr>';

        headers.forEach(function (h) {
            html += `<td>${row[h] ?? '-'}</td>`;
        });

        html += '</tr>';
    });

    html += `
            </tbody>
        </table>
    `;

    return html;
}


// =====================================================
// 18. AI CHAT SYSTEM
// =====================================================

async function sendChat() {
    const input = document.getElementById('chat-input');
    const question = input.value.trim();

    if (!question) return;

    const historyBox = document.getElementById('chat-history');
    const loadingBox = document.getElementById('chat-loading');

    historyBox.innerHTML += `
        <div class="user-message">${question}</div>
    `;

    input.value = '';
    loadingBox.style.display = 'block';

    historyBox.scrollTop = historyBox.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                question: question,
                userEmail: currentUser ? currentUser.email : 'guest'
            })
        });

        const result = await response.json();

        loadingBox.style.display = 'none';

        if (!response.ok) {
            throw new Error(result.error || 'เกิดข้อผิดพลาดจาก Server');
        }

        let aiHtml = `
            <div class="ai-message">
                ${result.answer}
            </div>
        `;

        if (result.data && result.data.length > 0) {
            aiHtml += buildHtmlTable(result.data);
        }

        if (result.sql) {
            aiHtml += `
                <div class="sql-result">
                    <strong>🔍 หลักฐาน SQL ที่ใช้:</strong>
                    <pre>${result.sql}</pre>
                </div>
            `;
        }

        historyBox.innerHTML += aiHtml;

    } catch (err) {
        loadingBox.style.display = 'none';

        historyBox.innerHTML += `
            <div class="error-message">
                ❌ Error: ${err.message}
            </div>
        `;
    }

    historyBox.scrollTop = historyBox.scrollHeight;
}


// =====================================================
// END OF JAVASCRIPT
// =====================================================
