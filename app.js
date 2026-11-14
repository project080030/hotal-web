
document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("crud-form");
    const tableSelect = document.getElementById("table-select");
    const refreshBtn = document.querySelector(".btn-refresh");
    const tableBody = document.querySelector(".agoda-table tbody");

    let editingId = null;

    // โหลดข้อมูล
    async function loadRooms() {
        try {
            const response = await fetch("/api/rooms");

            if (!response.ok) {
                throw new Error("ไม่สามารถโหลดข้อมูลได้");
            }

            const data = await response.json();

            tableBody.innerHTML = "";

            data.slice(0, 20).forEach(room => {
                const tr = document.createElement("tr");

                const values = [
                    room.room_id,
                    room.room_number,
                    room.room_type_id,
                    room.status
                ];

                const action = document.createElement("td");
                action.className = "text-center";

                const group = document.createElement("div");
                group.className = "action-btn-group";

                const editBtn = document.createElement("button");
                editBtn.type = "button";
                editBtn.className = "btn-tbl-edit";
                editBtn.textContent = "แก้ไข";

                editBtn.addEventListener("click", () => {
                    editingId = room.room_id;

                    document.getElementById("room_number").value =
                        room.room_number ?? "";

                    document.getElementById("room_type_id").value =
                        room.room_type_id ?? "";

                    document.getElementById("status").value =
                        room.status ?? "";

                    document.querySelector(
                        ".btn-agoda-primary"
                    ).innerHTML = "บันทึกการแก้ไข";
                });

                const deleteBtn = document.createElement("button");
                deleteBtn.type = "button";
                deleteBtn.className = "btn-tbl-delete";
                deleteBtn.textContent = "ลบ";

                deleteBtn.addEventListener("click", async () => {
                    if (!confirm("ต้องการลบข้อมูลนี้หรือไม่?")) return;

                    try {
                        const result = await fetch(
                            `/api/rooms/${room.room_id}`,
                            { method: "DELETE" }
                        );

                        if (!result.ok) {
                            throw new Error("ลบข้อมูลไม่สำเร็จ");
                        }

                        alert("ลบข้อมูลสำเร็จ");
                        loadRooms();

                    } catch (error) {
                        alert(error.message);
                    }
                });

                group.append(editBtn, deleteBtn);
                action.appendChild(group);
                tr.appendChild(action);

                values.forEach(value => {
                    const td = document.createElement("td");
                    td.textContent = value ?? "-";
                    tr.appendChild(td);
                });

                tableBody.appendChild(tr);
            });

        } catch (error) {
            console.error(error);
            alert("โหลดข้อมูลไม่สำเร็จ: " + error.message);
        }
    }

    // เพิ่มและแก้ไขข้อมูล
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {
            room_number: document.getElementById("room_number").value,
            room_type_id: document.getElementById("room_type_id").value,
            status: document.getElementById("status").value
        };

        if (!payload.room_number || !payload.room_type_id || !payload.status) {
            alert("กรุณากรอกข้อมูลให้ครบ");
            return;
        }

        try {
            const url = editingId
                ? `/api/rooms/${editingId}`
                : "/api/rooms";

            const response = await fetch(url, {
                method: editingId ? "PUT" : "POST",
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

            document.querySelector(
                ".btn-agoda-primary"
            ).innerHTML = "เพิ่มข้อมูลใหม่";

            loadRooms();

        } catch (error) {
            alert(error.message);
        }
    });

    // ยกเลิกการแก้ไข
    form.addEventListener("reset", () => {
        editingId = null;

        document.querySelector(
            ".btn-agoda-primary"
        ).innerHTML = "เพิ่มข้อมูลใหม่";
    });

    // รีเฟรช
    refreshBtn.addEventListener("click", loadRooms);

    // เปลี่ยนตาราง
    tableSelect.addEventListener("change", () => {
        alert("ตารางที่เลือก: " + tableSelect.value +
              " — ต้องตั้งค่า API ของตารางนี้เพิ่มเติม");
    });

    // เริ่มต้น
    loadRooms();

});
