# Intake drop-folder

Drop the Google Form **CSV export** here (e.g. `Website Intake Form.csv`), then start the
intake agent:

> "Run the **intake** agent for *<Business Name>* from the CSV in `intake/`."

The agent reads the CSV from this folder, then for that client:
1. fills `clients/<slug>/brief.md` from the row (design direction + inspiration, with
   `(confirm: …)` notes on anything unclear),
2. downloads their Drive uploads into `clients/<slug>/assets/` (optional — needs rclone).

Then the **build** agent turns the brief into the real site.

> ⚠️ CSV files dropped here are **tracked in git** (see README → *Client data policy*).
> They contain PII for **every** form submission, not just the client you're building for,
> and git history is permanent — so this repo's remote **must be private**. The
> `deploy-prod` workflow strips `intake/` from the public `prod` branch.
