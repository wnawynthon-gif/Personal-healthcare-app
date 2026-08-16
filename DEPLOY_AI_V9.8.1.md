# Deploy AI Medication Label v9.8.1

The existing Supabase function name remains `analyze-health-report`. Replace its source with:

`supabase/functions/analyze-health-report/index.ts`

Then deploy the function with JWT verification enabled. Keep the existing `OPENAI_API_KEY` secret. No database SQL migration is required.

After deployment, the same function supports both request tasks:

- `health_report` — existing lab/health-report extraction.
- `medication_label` — medicine label extraction and editable reminder suggestions.

The website never receives the OpenAI API key. Medication extraction always requires Review & Confirm before saving.
