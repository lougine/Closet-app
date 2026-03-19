# Storage Rollout Checklist

## 1) Preflight
- Confirm Cloudinary account and API credentials are generated.
- Set `STORAGE_PRIMARY_DRIVER=local` and `STORAGE_KEEP_LOCAL_COPY=true` in non-production first.
- Confirm uploads work locally with `npm test -- tests/integration/image-upload.test.js`.
- Validate health endpoint returns storage status: `GET /api/health`.

## 2) Backfill
- Run dry-run first: `npm run storage:backfill -- --dry-run`.
- Review `STORAGE_BACKFILL_SUMMARY` for missing local files.
- Execute real backfill: `npm run storage:backfill`.

## 3) Integrity Verification
- Check primary integrity mode: `npm run storage:verify -- --require=primary`.
- For stricter validation in migration window: `npm run storage:verify -- --require=all`.
- If malformed URLs are reported, create repair backup and dry-run:
- `npm run storage:repair -- --backup --dry-run`
- Apply only after review:
- `npm run storage:repair -- --backup --apply`

## 4) Cutover
- Set `STORAGE_PRIMARY_DRIVER=cloudinary`.
- Keep `STORAGE_KEEP_LOCAL_COPY=true` during first cutover period.
- Monitor `GET /api/health` failure counters and last failure fields.
- Re-run verify in primary mode after deployment.

## 5) Rollback
- If needed, switch back to `STORAGE_PRIMARY_DRIVER=local`.
- Restore repaired references from backup file:
- `npm run storage:restore -- --backup=backups/<file>.json`
- Re-run verify in primary mode.

## 6) Post-cutover hardening
- After stability window, optionally set `STORAGE_KEEP_LOCAL_COPY=false`.
- Run orphan cleanup dry-run then live:
- `npm run cleanup:orphans -- --dry-run`
- `npm run cleanup:orphans`

## 7) Bulk image restore to Cloudinary (manual mapping)
- Use when DB records exist but image fields are empty and you have source files.
- Generate a template from current records:
- `npm run storage:export-image-template`
- Fill `imagePath` values in the generated CSV.
- Prepare a CSV mapping file with header: `model,id,field,imagePath`.
- Sample file: `backups/cloudinary-import-sample.csv`.
- Dry-run first:
- `npm run storage:import-images -- --csv=backups/cloudinary-import-sample.csv --dry-run`
- Execute import:
- `npm run storage:import-images -- --csv=backups/cloudinary-import-sample.csv`
- Optional to avoid replacing already set image fields:
- `npm run storage:import-images -- --csv=backups/cloudinary-import-sample.csv --skip-existing`

Supported mappings:
- `garment` -> `imageUrl`
- `user` -> `profilePicture`, `bannerImage`
- `outfit` -> `previewImage`
- `communitypost` -> `imageUrl`
