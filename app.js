// =========================================================
// Hotel & Tour System - Supabase Production Setup
// =========================================================
const SUPABASE_URL = 'https://cbwywzbrijqlijwykxrb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jusl81rRe_vz1oYKATQkog__TSs2N9f';

// สร้าง Supabase Client Instance จาก CDN SDK
const _supabase = (window.supabase && window.supabase.createClient) 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("crud-form");
    const tableSelect = document.getElementById("table-select");
    const refreshBtn = document.getElementById("btn-refresh") || document.querySelector(".btn-refresh");
    const tableBody = document.getElementById("table-body") || document.querySelector(".agoda-table tbody");
    const submitBtn = document.getElementById("btn-submit") || document.querySelector(".btn-agoda-primary");

    let editingId = null;

    // 1. ฟังก์ชันโหลดข้อมูลตาราง rooms จาก Supabase
    async function loadRooms() {
        if (!tableBody) return;

        if (!_supabase) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#ef4444;">Error: โหลด Supabase SDK ไม่สำเร็จ</td></tr>`;
            return;
        }

        try {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#94a3b8;">กำลังดึงข้อมูลจาก Supabase...</td></tr>`;

            const { data, error } = await _supabase
                .from('rooms')
                .select('*')
                .order('room_id', { ascending: false })
                .limit(20);

            if (error) throw error;

            tableBody.innerHTML = "";

            if (!data || data.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#94a3b8;">ไม่พบข้อมูลห้องพักในระบบ</td></tr>`;
                return;
            }

            data.forEach(room => {
                const tr = document.createElement("tr");

                // คอลัมน์ปุ่มจัดการ
                const actionTd = document.createElement("td");
                actionTd.style.textAlign = "center";

                const btnGroup = document.createElement("div");
                btnGroup.style.display = "flex";
                btnGroup.style.gap = "0.4rem";
                btnGroup.style.justifyContent = "center";

                // ปุ่มแก้ไข
                const editBtn = document.createElement("button");
                editBtn.type = "button";
                editBtn.className = "btn-tbl-edit";
                editBtn.innerHTML = '<i class="fa-solid fa-pen"></i> แก้ไข';
                editBtn.onclick = () => {
                    editingId = room.room_id;
                    document.getElementById("room_number").value = room.room_number ?? "";
                    document.getElementById("room_type_id").value = room.room_type_id ?? "";
                    document.getElementById("status").value = room.status ?? "";

                    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกการแก้ไข';
                    window.scrollTo({ top: 250, behavior: 'smooth' });
                };

                // ปุ่มลบ
                const deleteBtn = document.createElement("button");
                deleteBtn.type = "button";
                deleteBtn.className = "btn-tbl-delete";
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> ลบ';
                deleteBtn.onclick = async () => {
                    if (!confirm(`ยืนยันการลบห้องพักหมายเลข ${room.room_number}?`)) return;

                    try {
                        const { error: delErr } = await _supabase
                            .from('rooms')
                            .delete()
                            .eq('room_id', room.room_id);

                        if (delErr) throw delErr;
                        alert("ลบข้อมูลสำเร็จ");
                        loadRooms();
                    } catch (err) {
                        alert("Error: " + err.message);
                    }
                };

                btnGroup.append(editBtn, deleteBtn);
                actionTd.appendChild(btnGroup);
                tr.appendChild(actionTd);

                // คอลัมน์ข้อมูล
                [room.room_id, room.room_number, room.room_type_id, room.status].forEach(val => {
                    const td = document.createElement("td");
                    td.textContent = val ?? "-";
                    tr.appendChild(td);
                });

                tableBody.appendChild(tr);
            });

        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#ef4444;">Error: ${error.message}</td></tr>`;
        }
    }

    // 2. ฟังก์ชัน Submit เพิ่ม / แก้ไข
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!_supabase) {
                alert("Supabase ไม่พร้อมใช้งาน");
                return;
            }

            const payload = {
                room_number: document.getElementById("room_number").value.trim(),
                room_type_id: document.getElementById("room_type_id").value.trim(),
                status: document.getElementById("status").value.trim()
            };

            if (!payload.room_number || !payload.room_type_id || !payload.status) {
                alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
                return;
            }

            try {
                if (editingId) {
                    const { error } = await _supabase
                        .from('rooms')
                        .update(payload)
                        .eq('room_id', editingId);

                    if (error) throw error;
                    alert("แก้ไขข้อมูลสำเร็จ");
                } else {
                    const { error } = await _supabase
                        .from('rooms')
                        .insert([payload]);

                    if (error) throw error;
                    alert("เพิ่มข้อมูลสำเร็จ");
                }

                editingId = null;
                form.reset();
                if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> เพิ่มข้อมูลใหม่';
                loadRooms();

            } catch (err) {
                alert("Error: " + err.message);
            }
        });

        form.addEventListener("reset", () => {
            editingId = null;
            if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> เพิ่มข้อมูลใหม่';
        });
    }

    // 3. Event Handling
    if (refreshBtn) refreshBtn.addEventListener("click", loadRooms);

    if (tableSelect) {
        tableSelect.addEventListener("change", () => {
            const titleEl = document.getElementById("current-table-title");
            if (titleEl) titleEl.textContent = tableSelect.value;
            
            if (tableSelect.value === "rooms") {
                loadRooms();
            } else {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#94a3b8;">ตาราง ${tableSelect.value} ยังไม่ได้เปิดใช้งานในหน้านี้</td></tr>`;
            }
        });
    }

    // โหลดครั้งแรก
    loadRooms();
});
