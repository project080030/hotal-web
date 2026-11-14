// ดึง Supabase Client จากที่ประกาศไว้ในโปรเจกต์เดิม
// (ตัวอย่าง: const supabase = window.supabaseClient หรือ supabase.createClient)

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("crud-form");
    const tableSelect = document.getElementById("table-select");
    const refreshBtn = document.getElementById("btn-refresh") || document.querySelector(".btn-refresh");
    const tableBody = document.getElementById("table-body") || document.querySelector(".agoda-table tbody");
    const submitBtn = document.getElementById("btn-submit") || document.querySelector(".btn-agoda-primary");

    let editingId = null;

    // 1. โหลดข้อมูลตรงจาก Supabase Database
    async function loadRooms() {
        if (!tableBody) return;

        try {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#94a3b8;">กำลังดึงข้อมูลจาก Supabase...</td></tr>`;

            // ดึงข้อมูลตาราง rooms จาก Supabase โดยตรง
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .order('room_id', { ascending: false })
                .limit(20);

            if (error) throw error;

            tableBody.innerHTML = "";

            if (!data || data.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#94a3b8;">ไม่พบข้อมูลห้องพัก</td></tr>`;
                return;
            }

            data.forEach(room => {
                const tr = document.createElement("tr");

                // คอลัมน์จัดการ (ปุ่มแก้ไข & ลบ)
                const actionTd = document.createElement("td");
                actionTd.style.textAlign = "center";

                const btnGroup = document.createElement("div");
                btnGroup.className = "action-btn-group";
                btnGroup.style.display = "flex";
                btnGroup.style.gap = "0.4rem";
                btnGroup.style.justifyContent = "center";

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
                };

                const deleteBtn = document.createElement("button");
                deleteBtn.type = "button";
                deleteBtn.className = "btn-tbl-delete";
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> ลบ';
                deleteBtn.onclick = async () => {
                    if (!confirm(`ยืนยันลบห้องพักหมายเลข ${room.room_number}?`)) return;

                    try {
                        const { error: delErr } = await supabase
                            .from('rooms')
                            .delete()
                            .eq('room_id', room.room_id);

                        if (delErr) throw delErr;
                        alert("ลบข้อมูลสำเร็จ");
                        loadRooms();
                    } catch (err) {
                        alert(" Error: " + err.message);
                    }
                };

                btnGroup.append(editBtn, deleteBtn);
                actionTd.appendChild(btnGroup);
                tr.appendChild(actionTd);

                // แสดงคอลัมน์ข้อมูล
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

    // 2. เพิ่ม/แก้ไขข้อมูลใน Supabase
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

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
                    const { error } = await supabase
                        .from('rooms')
                        .update(payload)
                        .eq('room_id', editingId);
                    if (error) throw error;
                    alert("แก้ไขข้อมูลสำเร็จ");
                } else {
                    const { error } = await supabase
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

    if (refreshBtn) refreshBtn.addEventListener("click", loadRooms);
    loadRooms();
});
