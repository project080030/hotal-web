document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("crud-form");
    const tableSelect = document.getElementById("table-select");
    const refreshBtn = document.getElementById("btn-refresh") || document.querySelector(".btn-refresh");
    const tableBody = document.getElementById("table-body") || document.querySelector(".agoda-table tbody");
    const submitBtn = document.getElementById("btn-submit") || document.querySelector(".btn-agoda-primary");

    let editingId = null;

    // 1. ฟังก์ชันโหลดข้อมูลห้องพัก
    async function loadRooms() {
        if (!tableBody) return;

        try {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#94a3b8;">กำลังโหลดข้อมูล...</td></tr>`;

            const response = await fetch("/api/rooms");

            if (!response.ok) {
                throw new Error("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
            }

            const data = await response.json();
            tableBody.innerHTML = "";

            if (!Array.isArray(data) || data.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#94a3b8;">ไม่พบข้อมูลห้องพักในระบบ</td></tr>`;
                return;
            }

            data.slice(0, 20).forEach(room => {
                const tr = document.createElement("tr");

                // Action Column
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
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                };

                const deleteBtn = document.createElement("button");
                deleteBtn.type = "button";
                deleteBtn.className = "btn-tbl-delete";
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> ลบ';
                deleteBtn.onclick = async () => {
                    if (!confirm(`ยืนยันการลบห้องพักหมายเลข ${room.room_number}?`)) return;

                    try {
                        const res = await fetch(`/api/rooms/${room.room_id}`, { method: "DELETE" });
                        if (!res.ok) throw new Error("ลบข้อมูลไม่สำเร็จ");
                        alert("ลบข้อมูลเรียบร้อยแล้ว");
                        loadRooms();
                    } catch (err) {
                        alert(err.message);
                    }
                };

                btnGroup.append(editBtn, deleteBtn);
                actionTd.appendChild(btnGroup);
                tr.appendChild(actionTd);

                // Data Columns
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
                const url = editingId ? `/api/rooms/${editingId}` : "/api/rooms";
                const method = editingId ? "PUT" : "POST";

                const res = await fetch(url, {
                    method: method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error("บันทึกข้อมูลไม่สำเร็จ");

                alert(editingId ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มข้อมูลสำเร็จ");
                editingId = null;
                form.reset();
                if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> เพิ่มข้อมูลใหม่';
                loadRooms();

            } catch (err) {
                alert(err.message);
            }
        });

        form.addEventListener("reset", () => {
            editingId = null;
            if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> เพิ่มข้อมูลใหม่';
        });
    }

    // 3. Event Refresh & Select
    if (refreshBtn) refreshBtn.addEventListener("click", loadRooms);

    if (tableSelect) {
        tableSelect.addEventListener("change", () => {
            const titleEl = document.getElementById("current-table-title");
            if (titleEl) titleEl.textContent = tableSelect.value;
            if (tableSelect.value === "rooms") {
                loadRooms();
            } else {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#94a3b8;">ตาราง ${tableSelect.value} ยังไม่เปิดใช้งาน API</td></tr>`;
            }
        });
    }

    // โหลดครั้งแรก
    loadRooms();
});
