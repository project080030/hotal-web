// ไฟล์ api/rooms.js
export default async function handler(req, res) {
  // ตั้งค่า CORS ให้เรียกใช้ได้
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ตัวอย่าง Mock Data หรือเชื่อมฐานข้อมูล
  if (req.method === 'GET') {
    return res.status(200).json([
      { room_id: 68, room_number: "708", room_type_id: 1, status: "available" },
      { room_id: 69, room_number: "709", room_type_id: 3, status: "occupied" },
      { room_id: 70, room_number: "710", room_type_id: 4, status: "maintenance" }
    ]);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
