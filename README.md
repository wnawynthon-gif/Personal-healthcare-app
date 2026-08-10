# Personal Healthcare App v5

## New in v5
- Real Supabase cloud adapter
- Email Magic Link / OTP sign-in
- Auth session persistence
- Cross-device JSON snapshot sync
- Upload / Download / Sync Now controls
- Revision + updated_at conflict detection
- Manual conflict resolution
- Sync history
- Supabase SQL schema + RLS policies
- v4 → v5 local data migration
- Continues to work Local-only without cloud configuration

## Files
- `index.html`
- `styles.css`
- `app.js`
- `sw.js`
- `manifest.json`
- `supabase-setup.sql`
- `SUPABASE_SETUP.md`
- `lab-import-sample.csv`

## Deploy
Host the folder over HTTPS (GitHub Pages, Netlify, Vercel static hosting, Cloudflare Pages, etc.).
Then configure the deployed URL in Supabase Auth redirect settings.

## Security notes
Use only the Supabase publishable key / legacy anon key in browser code. Never paste a service-role secret into this app.
The SQL setup enables Row Level Security so authenticated users can access only their own snapshot.

## Reminder limitation
Cloud sync does not itself provide exact closed-app medication notifications. Reliable background notification scheduling still needs a push/native notification layer.

## Medical safety
The app tracks and summarizes user-entered data. It does not diagnose disease, prescribe medicine, or replace clinician advice.
