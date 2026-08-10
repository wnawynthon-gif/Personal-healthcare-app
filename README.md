# Personal Healthcare App v6.1

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


## New in v6.1
- Safe multi-row Lab CSV import on the Results page
- Preview before any data is written
- Validation of required name/value/date fields
- Supports quoted CSV fields and DD/MM/YYYY or YYYY-MM-DD dates
- Optional ref_low, ref_high, ref_mode, range and category fields
- Confirmed rows flow directly into the existing v6 Health Analysis engine
- Existing local data and Supabase schema remain compatible
