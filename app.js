/* ====== ตั้งค่า (แก้ 2 ค่านี้ก่อน) ====== */
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

/* ตารางที่จัดการได้: แก้ชื่อตาราง/คอลัมน์ให้ตรงกับฐานข้อมูลจริง */
const TABLES = {
  rooms:      { label: 'rooms (ห้องพัก)', pk: 'room_id',     fields: ['room_number', 'room_type_id', 'status'] },
  room_types: { label: 'room_types (ประเภทห้อง)', pk: 'room_type_id', fields: ['type_name', 'price'] },
  customers:  { label: 'customers (ลูกค้า)', pk: 'customer_id', fields: ['name', 'phone', 'email'] },
  bookings:   { label: 'bookings (การจอง)', pk: 'booking_id', fields: ['customer_id', 'room_id', 'check_in', 'check_out'] },
  tours:      { label: 'tours (ทัวร์)', pk: 'tour_id', fields: ['tour_name', 'price'] }
};
/* ชื่อ View ที่ใช้ในรายงานสรุป (ใส่ให้ครบ 6 อัน) */
const VIEWS = ['view_1', 'view_2', 'view_3', 'view_4', 'view_5', 'view_6'];

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let current = Object.keys(TABLES)[0], rows = [], editId = null, userEmail = '';

function toast(msg, bad) {
  const t = $('toast'); t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : '');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.className = 'toast', 2800);
}

/* ====== AUTH ====== */
async function init() {
  const { data } = await sb.auth.getSession();
  data.session ? enter(data.session.user) : ($('login').hidden = false);
}
function enter(user) {
  userEmail = user.email; $('user-email').textContent = userEmail;
  $('login').hidden = true; $('app').hidden = false;
  $('table-select').innerHTML = Object.entries(TABLES).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('');
  $('view-select').innerHTML = VIEWS.map(v => `<option>${esc(v)}</option>`).join('');
  buildForm(); loadTable();
  if (!$('chat-box').children.length) addMsg('bot', 'สวัสดีครับ ผมคือผู้ช่วย AI ของระบบ มีอะไรให้ช่วยไหมครับ');
}
$('login-form').addEventListener('submit', async e => {
  e.preventDefault(); $('login-err').textContent = '';
  const { data, error } = await sb.auth.signInWithPassword({ email: $('login-email').value, password: $('login-pass').value });
  error ? $('login-err').textContent = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : enter(data.user);
});
$('btn-logout').addEventListener('click', async () => {
  await sb.auth.signOut(); $('app').hidden = true; $('login').hidden = false;
});

/* ====== TABS ====== */
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === b));
  ['crud', 'report', 'ai'].forEach(n => $('tab-' + n).hidden = n !== b.dataset.tab);
  if (b.dataset.tab === 'report') loadView();
}));

/* ====== CRUD ====== */
function buildForm() {
  const t = TABLES[current];
  $('form-fields').innerHTML = t.fields.map(f => `<label>${esc(f)}<input name="${esc(f)}" placeholder="กรอก ${esc(f)}"></label>`).join('');
  $('table-title').innerHTML = `ข้อมูลในตาราง: <b>${esc(current)}</b> <span class="muted">(แสดง 20 แถวล่าสุด)</span>`;
  resetForm();
}
function resetForm() {
  editId = null; $('crud-form').reset();
  $('btn-save').textContent = 'เพิ่มข้อมูลใหม่'; $('btn-cancel').hidden = true;
}
function renderTable(el, data, cols, withActions) {
  if (!data.length) { el.innerHTML = `<tr><td class="empty">ยังไม่มีข้อมูล</td></tr>`; return; }
  el.innerHTML = `<thead><tr>${withActions ? '<th>จัดการ</th>' : ''}${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>` +
    data.map((r, i) => `<tr>${withActions ? `<td class="acts"><button class="btn ghost sm" data-edit="${i}">แก้ไข</button><button class="btn del sm" data-del="${i}">ลบ</button></td>` : ''}${cols.map(c => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('') + '</tbody>';
}
async function loadTable() {
  const t = TABLES[current];
  const { data, error } = await sb.from(current).select('*').order(t.pk, { ascending: false }).limit(20);
  if (error) { toast('โหลดข้อมูลไม่สำเร็จ: ' + error.message, true); rows = []; renderTable($('data-table'), [], []); return; }
  rows = data; renderTable($('data-table'), rows, [t.pk, ...t.fields], true);
}
$('table-select').addEventListener('change', e => { current = e.target.value; buildForm(); loadTable(); });
$('btn-refresh').addEventListener('click', loadTable);
$('btn-cancel').addEventListener('click', resetForm);
$('crud-form').addEventListener('submit', async e => {
  e.preventDefault();
  const t = TABLES[current], payload = {};
  t.fields.forEach(f => { const v = e.target.elements[f].value.trim(); payload[f] = v === '' ? null : v; });
  const q = editId === null ? sb.from(current).insert(payload) : sb.from(current).update(payload).eq(t.pk, editId);
  const { error } = await q;
  if (error) return toast('บันทึกไม่สำเร็จ: ' + error.message, true);
  toast(editId === null ? 'เพิ่มข้อมูลแล้ว' : 'บันทึกการแก้ไขแล้ว'); resetForm(); loadTable();
});
$('data-table').addEventListener('click', async e => {
  const t = TABLES[current], b = e.target.closest('button'); if (!b) return;
  if (b.dataset.edit !== undefined) {
    const r = rows[b.dataset.edit]; editId = r[t.pk];
    t.fields.forEach(f => $('crud-form').elements[f].value = r[f] ?? '');
    $('btn-save').textContent = 'บันทึกการแก้ไข'; $('btn-cancel').hidden = false; scrollTo({ top: 0, behavior: 'smooth' });
  } else if (b.dataset.del !== undefined && confirm('ยืนยันการลบข้อมูลนี้?')) {
    const { error } = await sb.from(current).delete().eq(t.pk, rows[b.dataset.del][t.pk]);
    error ? toast('ลบไม่สำเร็จ: ' + error.message, true) : (toast('ลบข้อมูลแล้ว'), loadTable());
  }
});

/* ====== REPORT ====== */
async function loadView() {
  const { data, error } = await sb.from($('view-select').value).select('*').limit(100);
  if (error) { toast('โหลดรายงานไม่สำเร็จ: ' + error.message, true); return renderTable($('report-table'), [], []); }
  renderTable($('report-table'), data, data[0] ? Object.keys(data[0]) : [], false);
}
$('view-select').addEventListener('change', loadView);

/* ====== CHAT (บันทึก chat_logs ที่ฝั่ง /api/chat) ====== */
let sid; try { sid = sessionStorage.sid || (sessionStorage.sid = crypto.randomUUID()); } catch { sid = Date.now() + '-' + Math.random(); }
const history = [];
function addMsg(who, text) {
  const d = document.createElement('div'); d.className = 'msg ' + who; d.textContent = text;
  $('chat-box').appendChild(d); $('chat-box').scrollTop = 1e9; return d;
}
$('chat-form').addEventListener('submit', async e => {
  e.preventDefault();
  const text = $('chat-input').value.trim(); if (!text) return;
  $('chat-input').value = ''; $('chat-send').disabled = true;
  addMsg('user', text); const wait = addMsg('bot typing', 'กำลังพิมพ์…');
  try {
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sid, user_email: userEmail, message: text, history: history.slice(-10) }) });
    const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status);
    wait.className = 'msg bot'; wait.textContent = j.reply;
    history.push({ role: 'user', content: text }, { role: 'assistant', content: j.reply });
  } catch (err) { wait.className = 'msg bot'; wait.textContent = 'ขออภัย เกิดข้อผิดพลาด: ' + err.message; }
  $('chat-send').disabled = false; $('chat-input').focus();
});

init();
