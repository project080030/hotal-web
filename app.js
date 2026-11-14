document.addEventListener("DOMContentLoaded", () => {

    // Helper ในการดึง Element แบบยืดหยุ่น (รองรับทั้ง Class ใหม่ และ ID เดิม)
    const form = document.getElementById("crud-form");
    const tableSelect = document.getElementById("table-select");
    const refreshBtn = document.querySelector(".btn-refresh") || document.getElementById("btn-refresh");
    const tableBody = document.querySelector(".agoda-table tbody") || document.getElementById("table-body") || document.querySelector("tbody");
    
    // ปุ่ม Submit หลัก (บันทึก/เพิ่มข้อมูล)
    const submitBtn = document.querySelector(".btn-agoda-primary") || document.querySelector("button[type='submit']") || document.getElementById("btn-submit");

    let editingId = null;

    // 1. ฟังก์ชันโหลดข้อมูลตาราง rooms
    async function loadRooms() {
        if (!tableBody) return;

        try {
            const response = await fetch("/api/rooms");

            if (!response.ok) {
                throw new Error("ไม่สามารถโหลดข้อมูลได้");
            }

            const data = await response.json();

            // ล้างข้อมูลเดิมในตารางก่อนเรนเดอร์ใหม่
            tableBody.innerHTML = "";

            if (!Array.isArray(data) || data.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1rem; color:#64748b;">ไม่พบข้อมูลในระบบ</td></tr>`;
                return;
            }

            data.slice(0, 20).forEach(room => {
                const tr = document.createElement("tr");

                // คอลัมน์จัดการ (ปุ่มแก้ไข & ลบ)
                const actionTd = document.createElement("td");
                actionTd.className = "text-center";

                const btnGroup = document.createElement("div");
                btnGroup.className = "action-btn-group";
                btnGroup.style.display = "flex";
                btnGroup.style.gap = "0.4rem";
                btnGroup.style.justifyContent = "center";

                // ปุ่มแก้ไข
                const editBtn = document.createElement("button");
                editBtn.type = "button";
                editBtn.className = "btn-tbl-edit";
                editBtn.textContent = "แก้ไข";

                editBtn.addEventListener("click", () => {
                    editingId = room.room_id;

                    const inputNum = document.getElementById("room_number");
                    const inputType = document.getElementById("room_type_id");
                    const inputStatus = document.getElementById("status");

                    if (inputNum) inputNum.value = room.room_number ?? "";
                    if (inputType) inputType.value = room.room_type_id ?? "";
                    if (inputStatus) inputStatus.value = room.status ?? "";

                    if (submitBtn) submitBtn.innerHTML = "💾 บันทึกการแก้ไข";
                    
                    // เลื่อนหน้าจอไปที่ฟอร์มเพื่อแก้ไขสะดวก
                    if (form) form.scrollIntoView({ behavior: 'smooth' });
                });

                // ปุ่มลบ
                const deleteBtn = document.createElement("button");
                deleteBtn.type = "button";
                deleteBtn.className = "btn-tbl-delete";
                deleteBtn.textContent = "ลบ";

                deleteBtn.addEventListener("click", async () => {
                    if (!confirm(`ต้องการลบห้องพักหมายเลข ${room.room_number} หรือไม่?`)) return;

                    try {
                        const result = await fetch(`/api/rooms/${room.room_id}`, { 
                            method: "DELETE" 
                        });

                        if (!result.ok) {
                            throw new Error("ลบข้อมูลไม่สำเร็จ");
                        }

                        alert("ลบข้อมูลสำเร็จ");
                        loadRooms();

                    } catch (error) {
                        alert("Error: " + error.message);
                    }
                });

                btnGroup.append(editBtn, deleteBtn);
                actionTd.appendChild(btnGroup);
                tr.appendChild(actionTd);

                // คอลัมน์ข้อมูล
                const values = [
                    room.room_id,
                    room.room_number,
                    room.room_type_id,
                    room.status
                ];

                values.forEach(value => {
                    const td = document.createElement("td");
                    td.textContent = value ?? "-";
                    tr.appendChild(td);
                });

                tableBody.appendChild(tr);
            });

        } catch (error) {
            console.error(error);
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef4444; padding:1rem;">Error: ${error.message}</td></tr>`;
            }
        }
    }

    // 2. ฟังก์ชันเพิ่มและแก้ไขข้อมูล (Submit Form)
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const inputNum = document.getElementById("room_number");
            const inputType = document.getElementById("room_type_id");
            const inputStatus = document.getElementById("status");

            const payload = {
                room_number: inputNum ? inputNum.value.trim() : "",
                room_type_id: inputType ? inputType.value.trim() : "",
                status: inputStatus ? inputStatus.value.trim() : ""
            };

            if (!payload.room_number || !payload.room_type_id || !payload.status) {
                alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
                return;
            }

            try {
                const url = editingId ? `/api/rooms/${editingId}` : "/api/rooms";
                const method = editingId ? "PUT" : "POST";

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error("บันทึกข้อมูลไม่สำเร็จ");
                }

                alert(editingId ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มข้อมูลสำเร็จ");

                editingId = null;
                form.reset();

                if (submitBtn) submitBtn.innerHTML = "+ เพิ่มข้อมูลใหม่";

                loadRooms();

            } catch (error) {
                alert("Error: " + error.message);
            }
        });

        // 3. ฟังก์ชันยกเลิกการแก้ไข (Reset Form)
        form.addEventListener("reset", () => {
            editingId = null;
            if (submitBtn) submitBtn.innerHTML = "+ เพิ่มข้อมูลใหม่";
        });
    }

    // 4. ปุ่มรีเฟรชข้อมูล
    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadRooms);
    }

    // 5. Dropdown เปลี่ยนตาราง
    if (tableSelect) {
        tableSelect.addEventListener("change", () => {
            const currentTitle = document.getElementById("current-table-title") || document.getElementById("current-table-name");
            if (currentTitle) {
                currentTitle.textContent = tableSelect.value;
            }
            
            if (tableSelect.value === "rooms") {
                loadRooms();
            } else {
                alert("ตารางที่เลือก: " + tableSelect.value + " — ระบบตั้งค่า API ไว้เฉพาะตาราง rooms ครับ");
            }
        });
    }

    // เริ่มต้นทำงานดึงข้อมูล
    loadRooms();
});
