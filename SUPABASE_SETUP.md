# Supabase setup for Personal Healthcare v5

1. Create a Supabase project.
2. Open SQL Editor and run `supabase-setup.sql`.
3. In Authentication → URL Configuration:
   - Set Site URL to your deployed app URL.
   - Add the deployed app URL to allowed Redirect URLs.
4. In the app → Cloud Sync:
   - Paste Project URL.
   - Paste the publishable key (or legacy anon key).
   - Do NOT use the `service_role` key in the browser.
5. Enter your email and request a Magic Link / OTP.
6. After sign-in, press `Sync Now`.

## Data model
v5 stores one JSON snapshot per authenticated user in:
`public.health_snapshots`

This keeps the first cloud version simple and preserves the v1–v5 app schema. A future v6 can normalize BP, weight, labs and medication into separate tables for querying/analytics.

## Security
RLS policies in `supabase-setup.sql` restrict SELECT/INSERT/UPDATE/DELETE to rows where `auth.uid() = user_id`.

## Conflict behavior
The app stores:
- Cloud `updated_at`
- local updated timestamp
- last-synced cloud timestamp
- last-synced local timestamp
- revision

If both Cloud and device changed since the previous sync, v5 stops and asks which copy should win.
