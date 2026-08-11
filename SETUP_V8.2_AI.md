# Personal Healthcare v8.2 — AI Health Report Setup

## Architecture
GitHub Pages (frontend) → Supabase Edge Function → OpenAI Responses API

**Do not place OPENAI_API_KEY in index.html/app.js/localStorage/GitHub.**
The API key is a server-side secret only.

## 1) Deploy the website
Upload the root files to the same GitHub Pages repository as previous versions:
- index.html
- 404.html
- app.js
- styles.css
- manifest.webmanifest
- .nojekyll
- etc.

Wait until `pages build and deployment` is green.

## 2) Create Supabase Edge Function
In Supabase, create a function named:

`analyze-health-report`

Copy the contents of:
`supabase/functions/analyze-health-report/index.ts`

Deploy it with JWT verification enabled.

Function URL:
`https://YOUR_PROJECT_REF.supabase.co/functions/v1/analyze-health-report`

## 3) Add OpenAI secret
Set a Supabase Edge Function secret:

Name:
`OPENAI_API_KEY`

Value:
your OpenAI API key

Never put this key into the website.

## 4) Configure v8.2
Open Personal Healthcare → Settings → AI Health Analysis

Enter:
- Edge Function URL
- Supabase Anon Key

Press `บันทึก AI Config`.

## 5) Test
Open `AI วิเคราะห์ผลตรวจ`
1. Tap `ถ่ายรูปผลตรวจ` or choose images.
2. Select one or more report pages.
3. Tap `วิเคราะห์ด้วย AI`.
4. Review every extracted value against the original.
5. Select values to keep.
6. Tap `ยืนยันและบันทึกเข้า Dashboard`.

## Image behavior
v8.2 first asks the iPad/iPhone browser to decode the selected image and re-encodes it as JPEG before upload to AI.
This avoids the previous browser-side libheif OCR path for many camera photos.
If the device cannot decode a particular HEIC, take a screenshot and upload the PNG/JPEG screenshot.

## Safety
The AI extraction is not a medical diagnosis. Values can be misread. The UI intentionally requires Review & Confirm before saving.
