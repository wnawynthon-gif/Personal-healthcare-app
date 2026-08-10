# Personal Healthcare App v6

## New in v6
- Health Analysis page
- Lab analysis using laboratory reference ranges as primary comparison
- Structured low/high/max/min reference inputs
- HbA1c, lipids and eGFR conservative guidance flags
- Lab trends and charts
- Clinical Review Summary
- CSV v6 import
- Smart Sync that does not increment revision when health data is unchanged
- Existing v5 Supabase/RLS remains compatible

## Deploy
Replace v5 static files in the same GitHub Pages repository with v6 files. Your existing Supabase project and RLS policies can remain unchanged.

## Medical safety
This app highlights data for review; it does not diagnose disease or change medication. Laboratory reference ranges and clinician-set targets take priority over general guidance.
