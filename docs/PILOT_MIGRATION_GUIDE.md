# Pilot CSV migration guide

**This is CSV migration assistance: not full EHR conversion.**

Use for a first live pilot practice to bring a limited patient demographics file into EyeQ after readiness checks pass.

## Supported

- Patient demographics CSV (name, DOB, email, phone, optional MRN/external id)
- Preview / validation summary
- Duplicate detection (external id + name/DOB)
- Dry run
- Error CSV export
- Import audit logs (`IMPORT` / batch metadata)

## Not supported (do not claim otherwise)

- Full chart history, imaging archives, claim history conversion
- Automatic rollback of production writes without backup restore
- Silent overwrite of existing patients

## Workflow

1. Export a clean CSV from the source system (practice-owned).
2. Open EyeQ CSV import (tasks / import UI).
3. **Preview**: review valid / invalid / duplicate counts.
4. **Dry run**: no writes; confirms counts under controlled pilot.
5. Fix source data; re-preview.
6. **Import**: controlled pilot requires dry-run confirmation first.
7. Spot-check 5-10 patients in chart view (consent, DOB, phone).
8. Download error CSV for any row failures and resolve offline.

## Rollback guidance

1. Prefer fixing forward for small error sets.
2. For large bad imports: restore from pre-import Postgres backup (`docs/BACKUP_RESTORE.md`).
3. Use audit logs to identify import batch timestamps: do not delete PHI without practice approval.

## Pilot safety

- Demo org may import for demos.
- Controlled live pilot blocks unverified imports (must dry-run + confirm).
- Keep imports small for the first week.
