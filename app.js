// =========================================================
// Hotel & Tour System - Vercel Serverless API (/api/rooms)
// =========================================================

// ตัวอย่าง Mock Data สำหรับระบบ (หรือเปลี่ยนใช้ Supabase Client ได้)
let roomsDatabase = [
  { room_id: 70, room_number: "710", room_type_id: 4, status: "maintenance" },
  { room_id: 69, room_number: "709", room_type_id: 3, status: "occupied" },
  { room_id: 68, room_number: "708", room_type_id: 1, status: "available" }
];

export default async function handler(req, res) {
  // ตั้งค่า CORS & Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    // 1. GET: ดึงรายการห้องพักทั้งหมด
    if (req.method === 'GET') {
      return res.status(200).json(roomsDatabase);
    }

    // 2. POST: เพิ่มห้องพักใหม่
    if (req.method === 'POST') {
      const { room_number, room_type_id, status } = req.body || {};
      
      if (!room_number || !room_type_id || !status) {
        return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
      }

      const newRoom = {
        room_id: roomsDatabase.length > 0 ? Math.max(...roomsDatabase.map(r => r.room_id)) + 1 : 1,
        room_number: String(room_number),
        room_type_id: Number(room_type_id),
        status: String(status)
      };

      roomsDatabase.unshift(newRoom);
      return res.status(201).json(newRoom);
    }

    // 3. PUT: แก้ไขข้อมูลห้องพักตาม ID
    if (req.method === 'PUT') {
      const targetId = Number(id || req.url.split('/').pop());
      const { room_number, room_type_id, status } = req.body || {};

      const index = roomsDatabase.findIndex(r => r.room_id === targetId);
      if (index === -1) {
        return res.status(404).json({ error: "ไม่พบข้อมูลห้องพักที่ต้องการแก้ไข" });
      }

      roomsDatabase[index] = {
        ...roomsDatabase[index],
        room_number: room_number ?? roomsDatabase[index].room_number,
        room_type_id: room_type_id ? Number(room_type_id) : roomsDatabase[index].room_type_id,
        status: status ?? roomsDatabase[index].status
      };

      return res.status(200).json(roomsDatabase[index]);
    }

    // 4. DELETE: ลบห้องพักตาม ID
    if (req.method === 'DELETE') {
      const targetId = Number(id || req.url.split('/').pop());
      
      const initialLength = roomsDatabase.length;
      roomsDatabase = roomsDatabase.filter(r => r.room_id !== targetId);

      if (roomsDatabase.length === initialLength) {
        return res.status(404).json({ error: "ไม่พบข้อมูลห้องพักที่ต้องการลบ" });
      }

      return res.status(200).json({ message: "ลบข้อมูลสำเร็จ", room_id: targetId });
    }

    return res.status(405).json({ error: "Method Not Allowed" });

  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error: " + error.message });
  }
}
