# Personal Healthcare v8.0

เวอร์ชันนี้สร้างใหม่ให้ Import เสถียรกว่าเดิม โดยไม่ผูกการ Save กับการตรวจไฟล์ทั้งก้อน

## จุดสำคัญใน v8.0
- Import Center 3 ขั้น: Upload → Review/Mapping → Save
- CSV parser รองรับ quoted fields และ comma ในข้อความ
- JSON import
- Auto column mapping + เปลี่ยน mapping เองได้
- Preview และแก้ไขค่าก่อน Save
- Row-level validation: แถวเสียไม่ทำให้แถวดีบันทึกไม่ได้
- Duplicate detection
- Local autosave ด้วย localStorage
- Optional Supabase REST sync
- Dashboard น้ำหนัก / ความดัน / ชีพจร
- SVG trend charts ไม่ต้องใช้ library ภายนอก
- Medication list + daily reminder time
- Document Inbox สำหรับ PDF/JPG/PNG metadata
- JSON backup export
- Responsive สำหรับมือถือ

## เปิดใช้งาน
1. เปิด `index.html` ได้ทันที หรือ deploy โฟลเดอร์นี้ขึ้น Vercel/GitHub Pages
2. ถ้าจะใช้ Supabase:
   - รัน `supabase_schema_v8.sql`
   - เปิด Settings
   - ใส่ Project URL และ Anon Key
   - ทดสอบการเชื่อมต่อ

## CSV Template
คอลัมน์แนะนำ:
`date,type,value,value2,unit,note`

ตัวอย่าง:
`2026-08-11T08:00:00,blood_pressure,128,82,mmHg,morning`

ประเภทที่รองรับ:
- weight
- blood_pressure
- pulse
- glucose
- lab
- exercise
- note

## หมายเหตุด้านสุขภาพ
ระบบเป็นเครื่องมือช่วยจัดข้อมูลและเตือนแนวโน้ม ไม่ใช่การวินิจฉัยโรค
เกณฑ์ความดันใน UI ใช้เพื่อ flag ให้ติดตาม:
- NHS: ความดันที่บ้าน 135/85 mmHg ขึ้นไปถือว่าสูง
- ค่ามากกว่า 180/120 mmHg ต้องวัดซ้ำและประเมินอาการ; ถ้ามีอาการฉุกเฉินให้ขอความช่วยเหลือฉุกเฉินทันที

## สิ่งที่ v8.0 ยังไม่ทำ
- OCR PDF/รูปใน browser แบบออฟไลน์
- Push notification ระดับระบบ
- Supabase Auth onboarding UI
- Storage upload binary ไป Supabase Storage

ไฟล์เหล่านี้วางโครงไว้ให้เพิ่มใน v8.1 ได้โดยไม่ต้องรื้อ Import Center
