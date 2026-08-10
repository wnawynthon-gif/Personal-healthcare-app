# Personal Healthcare App v6.3

## New in v6.3
- Multi-file image/PDF import
- Auto document classification: lab/health check, chest X-ray, ultrasound, ECG, other
- Image preprocessing and automatic 90°/270° OCR retry when confidence is poor
- More robust known-lab extraction from Thai/English health-check forms
- Structured Findings/Impression/ECG summary saved separately from lab rows
- Imported medical-document history
- Import remains review-first: user can edit text, document type, summary, and rows before save

- iPad/Safari OCR fix: explicit worker/core/language paths + English fallback
- OCR failures now show the real error and keep manual review available
- Service worker changed to network-first for app updates
- Image OCR in the browser with Tesseract.js (English + Thai)
- PDF text extraction with PDF.js
- OCR fallback for scanned PDF pages
- Raw extracted text preview
- Heuristic lab-row detection
- Editable Preview before confirmation
- Select/unselect detected results
- Reference low/high fields before saving
- Confirmed results feed the existing Health Analysis engine
- Source file name stored with imported lab records
- Existing Supabase sync, RLS, BP, weight, medication, reminders and Doctor Report remain compatible

## Privacy behavior
The selected document is read locally in the browser. It is not uploaded to Supabase merely by selecting it.
Only confirmed extracted lab records become part of the health database and can then be synced by the existing Supabase sync controls.

## Important OCR limitations
- OCR is not guaranteed to read every laboratory layout correctly.
- Always verify test name, result, unit and reference range in Preview before confirming.
- PDF files with an embedded text layer are generally more reliable than photos/scans.
- HEIC support depends on Safari/iOS decoding support.
- Internet is needed the first time OCR/PDF libraries and OCR language data are loaded.

## Deploy
Upload all v6.2 files to the existing GitHub Pages repository root and replace the older v6/v6.1 files.
No new Supabase project or table is required.