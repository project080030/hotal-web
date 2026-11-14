// =========================================================
// Hotel & Tour System - Dynamic Multi-Table App
// =========================================================
const SUPABASE_URL = 'https://cbwywzbrijqlijwykxrb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jusl81rRe_vz1oYKATQkog__TSs2N9f';

const _supabase = (window.supabase && window.supabase.createClient) 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("crud-form");
    const tableSelect = document.getElementById("table-select");
    const refreshBtn = document.getElementById("btn-refresh") || document.querySelector(".btn-refresh");
    const tableBody = document.getElementById("table-body") || document.querySelector(".agoda-table tbody");
    const tableHead = document.querySelector("#data-table thead tr");
    const submitBtn = document.getElementById("btn-submit") || document.querySelector(".btn-agoda-primary");
    const formFieldsContainer = document.getElementById("form-fields") || document.querySelector(".form-grid");

    let currentTable = "rooms";
    let editingId = null;

    // 1. สร้าง Form Inputs อัตโนมัติตามคอลัมน์ของตาราง
    function generateFormFields(columns) {
        if (!formFieldsContainer) return;
        formFieldsContainer.innerHTML = "";

        // ข้ามคอลัมน์แรก (Primary Key / ID Auto Increment)
        const editableColumns = columns.slice(1);

        editableColumns.forEach(col => {
            const fieldDiv = document.createElement("div");
            fieldDiv.className = "form-group";
            fieldDiv.innerHTML = `
                <label for="${col}">${col.toUpperCase()}</label>
                <div class="input-icon-wrapper">
                    <i class="fa-solid fa-pen-to-square input-icon"></i>
                    <input type="text" id="${col}" name="${col}" placeholder="กรอกค่า ${col}" autocomplete="off">
                </div>
            `;
            formFieldsContainer.appendChild(fieldDiv);
        });
    }

    // 2. ฟังก์ชันโหลดข้อมูลตารางแบบ Dynamic
    async function loadTableData(tableName) {
        if (!tableBody || !_supabase) return;

        currentTable = tableName;
        editingId = null;
        if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> เพิ่มข้อมูลใหม่';

        const titleEl = document.getElementById("current-table-title");
        if (titleEl) titleEl.textContent = currentTable;

        try {
            tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:1.5rem; color:#94a3b8;">กำลังดึงข้อมูลตาราง ${currentTable}...</td></tr>`;

            const { data, error } = await _supabase
                .from(currentTable)
                .select('*')
                .limit(20);

            if (error) throw error;

            tableBody.innerHTML = "";

            if (!data || data.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:1.5rem; color:#94a3b8;">ไม่พบข้อมูลในตาราง ${currentTable}</td></tr>`;
                return;
            }

            // ดึงรายชื่อคอลัมน์
            const columns = Object.keys(data[0]);

            // สร้าง Form Inputs ใหม่ให้ตรงกับตารางที่เลือก
            generateFormFields(columns);

            // อัปเดตหัวตาราง (THEAD)
            if (tableHead) {
                tableHead.innerHTML = `<th style="width: 140px; text-align: center;">จัดการ</th>` + 
                    columns.map(col => `<th>${col.toUpperCase()}</th>`).join('');
            }

            // เรนเดอร์ข้อมูล (TBODY)
            data.forEach(row => {
                const tr = document.createElement("tr");

                // คอลัมน์ปุ่มจัดการ
                const actionTd = document.createElement("td");
                actionTd.style.textAlign = "center";

                const btnGroup = document.createElement("div");
                btnGroup.style.display = "flex";
                btnGroup.style.gap = "0.4rem";
                btnGroup.style.justifyContent = "center";

                const primaryKey = columns[0];

                // ปุ่มแก้ไข
                const editBtn = document.createElement("button");
                editBtn.type = "button";
                editBtn.className = "btn-tbl-edit";
                editBtn.innerHTML = '<i class="fa-solid fa-pen"></i> แก้ไข';
                editBtn.onclick = () => {
                    editingId = row[primaryKey];
                    columns.forEach(col => {
                        const input = document.getElementById(col);
                        if (input) input.value = row[col] ?? "";
                    });
                    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกการแก้ไข';
                    window.scrollTo({ top: 250, behavior: 'smooth' });
                };

                // ปุ่มลบ
                const deleteBtn = document.createElement("button");
                deleteBtn.type = "button";
                deleteBtn.className = "btn-tbl-delete";
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> ลบ';
                deleteBtn.onclick = async () => {
                    if (!confirm(`ยืนยันลบข้อมูล ID: ${row[primaryKey]} ในตาราง ${currentTable}?`)) return;

                    try {
                        const { error: delErr } = await _supabase
                            .from(currentTable)
                            .delete()
                            .eq(primaryKey, row[primaryKey]);

                        if (delErr) throw delErr;
                        alert("ลบข้อมูลสำเร็จ");
                        loadTableData(currentTable);
                    } catch (err) {
                        alert("Error: " + err.message);
                    }
                };

                btnGroup.append(editBtn, deleteBtn);
                actionTd.appendChild(btnGroup);
                tr.appendChild(actionTd);

                // คอลัมน์ข้อมูล
                columns.forEach(col => {
                    const td = document.createElement("td");
                    td.textContent = row[col] ?? "-";
                    tr.appendChild(td);
                });

                tableBody.appendChild(tr);
            });

        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:1.5rem; color:#ef4444;">Error: ${error.message}</td></tr>`;
        }
    }

    // 3. ฟังก์ชัน Submit เพิ่ม / แก้ไข
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const inputs = form.querySelectorAll("input[id]");
            const payload = {};
            let hasValue = false;

            inputs.forEach(input => {
                if (input.value.trim() !== "") {
                    payload[input.id] = input.value.trim();
                    hasValue = true;
                }
            });

            if (!hasValue) {
                alert("กรุณากรอกข้อมูลอย่างน้อย 1 ช่อง");
                return;
            }

            try {
                if (editingId) {
                    const { data: sample } = await _supabase.from(currentTable).select('*').limit(1);
                    const primaryKey = sample && sample.length > 0 ? Object.keys(sample[0])[0] : 'id';

                    const { error } = await _supabase
                        .from(currentTable)
                        .update(payload)
                        .eq(primaryKey, editingId);

                    if (error) throw error;
                    alert("แก้ไขข้อมูลสำเร็จ");
                } else {
                    const { error } = await _supabase
                        .from(currentTable)
                        .insert([payload]);

                    if (error) throw error;
                    alert("เพิ่มข้อมูลสำเร็จ");
                }

                editingId = null;
                form.reset();
                if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> เพิ่มข้อมูลใหม่';
                loadTableData(currentTable);

            } catch (err) {
                alert("Error: " + err.message);
            }
        });

        form.addEventListener("reset", () => {
            editingId = null;
            if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> เพิ่มข้อมูลใหม่';
        });
    }

    // 4. ผูก Event เปลี่ยนตาราง & รีเฟรช & ออกจากระบบ
    if (tableSelect) {
        tableSelect.addEventListener("change", (e) => {
            loadTableData(e.target.value);
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => loadTableData(currentTable));
    }

    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("ต้องการออกจากระบบหรือไม่?")) {
                localStorage.clear();
                alert("ออกจากระบบเรียบร้อยแล้ว");
                location.reload();
            }
        });
    }

    // โหลดครั้งแรก
    loadTableData("rooms");
});
