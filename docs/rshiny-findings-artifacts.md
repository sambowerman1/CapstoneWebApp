# R Shiny Findings Artifacts

The `findings` page now renders from precomputed artifacts generated from the R Shiny analysis logic.

## Artifact Location

- `public/data/rshiny/findings-artifacts.json`

## Regenerate Artifacts

From `CapstoneWebApp`:

```bash
npm run export-rshiny-findings
```

This runs:

- `scripts/export-rshiny-findings-artifacts.R`

## Data Inputs

The exporter reads:

- `openclaw/all_states_summarized.csv` (preferred)
- `EDA/rshiny-capstone/all_states_summarized.csv` (fallback)
- `EDA/rshiny-capstone/us_states_demographics.csv`
- `EDA/rshiny-capstone/us_counties_demographics.csv`
- `EDA/rshiny-capstone/2016_US_County_Level_Presidential_Results.csv`
- `EDA/rshiny-capstone/2020_US_County_Level_Presidential_Results.csv`
- `EDA/rshiny-capstone/2024_US_County_Level_Presidential_Results.csv`

## Notes

- The artifact includes tab definitions, component definitions, and precomputed filter variants.
- Chart rendering in Next.js is schema-driven and does not require runtime R/Shiny.
