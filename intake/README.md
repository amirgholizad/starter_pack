# Intake drop-folder

Drop the Google Form **CSV export** here (e.g. `Website Intake Form.csv`), then start the
intake agent:

> "Run the **intake** agent for *<Business Name>* from the CSV in `intake/`."

The agent reads the CSV from this folder, then for that client:
1. installs the client-privacy `.gitignore` rules (from `.gitignore.template`),
2. fills `clients/<slug>/brief.md` from the row (derived Supabase schema + v0 design
   direction, with `(confirm: …)` notes),
3. downloads their Drive uploads into `clients/<slug>/assets/`.

> CSV files dropped here are **gitignored** — they contain PII for every submission and
> must never be committed. Only this README is tracked.
