# Personal Healthcare v8.2 — AI Health Report

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


## v8.0.1 GitHub Pages fix
- Added `.nojekyll` to bypass Jekyll processing.
- Added `404.html` fallback.
- Removed Vercel-only configuration from the GitHub Pages package.

## v8.1 Smart Import
- เก็บไฟล์จริงใน IndexedDB ของ browser (ไม่ใช่ metadata อย่างเดียว)
- HEIC/HEIF → JPEG preview ใน browser ด้วย heic2any
- JPG/PNG/HEIC OCR ด้วย Tesseract.js
- PDF: ดึง text ด้วย PDF.js; ถ้าหน้ามี text น้อยจะ fallback OCR
- Auto-detect: BP, Weight, Pulse, Glucose และ lab พื้นฐาน
- Review table ก่อน Save ทุกครั้ง
- Duplicate check ก่อนเข้า Dashboard
- ไฟล์ที่อัปโหลดใน v8.0 ต้องอัปโหลดใหม่ 1 ครั้ง เพราะ v8.0 ไม่เคยเก็บ binary file ไว้

หมายเหตุ: OCR เป็นการช่วยอ่านข้อมูล ไม่ควรใช้แทนการตรวจค่าต้นฉบับ ผู้ใช้ต้องตรวจตัวเลขก่อน Save

## v8.1.1 hotfix
- Fixed duplicate `renderFiles()` definition that caused the legacy Document Inbox renderer to override Smart Import UI.
- Re-uploading the same file now restores its binary into IndexedDB instead of creating another duplicate card.

## v8.1.2
- Handles ERR_LIBHEIF on iPad with a clear fallback instead of a dead-end error.
- JPG/PNG are the recommended OCR input on iPad; HEIC can still be stored in Document Inbox.
- PDF/CSV/JSON import remains supported.


## v8.2
Primary workflow:
`Camera / Photos → OpenAI Vision → structured health results → Review & Confirm → Dashboard`

Security:
- OpenAI API key is NOT stored in GitHub Pages.
- Calls go through a Supabase Edge Function.
- The browser sends compressed JPEG data to the function.
- Structured output forces consistent fields for health results.
  
Deploy v8.2
