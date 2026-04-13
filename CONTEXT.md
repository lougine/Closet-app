# CONTEXT

## Project overview
This repository is a digital wardrobe platform with:
- A Node.js/Express backend API in `src/`.
- An Expo/React Native mobile app in `frontend/closet/`.

Based on implemented routes/controllers, the app supports:
- User auth (email/password register/login + Google access-token exchange).
- User profile management (profile image, banner image, banner preset, password, privacy).
- Garment CRUD with ownership scoping, favorites/hidden preferences, optional image upload, and image utilities.
- Outfit CRUD, date-based calendar retrieval, randomized outfit generation, and heuristic AI-like recommendations.
- Wear logging and usage history.
- Closet analytics (overview, categories, colours, most/least/never worn, cost-per-wear, usage trends).
- Community feed with posts, polls, likes, comments, poll voting.
- Seeder endpoint for generating a test user and linked data (guarded by env secret + disabled in production).
- Storage abstraction for local filesystem + optional Cloudinary, plus migration/integrity/repair scripts.

## Tech stack
### Backend runtime and API
- Node.js (CommonJS modules)
- Express `^5.2.1`
- CORS `^2.8.6`
- dotenv `^17.3.1`

### Database and data layer
- MongoDB
- Mongoose `^9.2.3`

### Auth and security
- jsonwebtoken `^9.0.3` (JWT sessions)
- bcryptjs `^3.0.3` (password hashing)

### Upload, media, and storage
- multer `^2.1.1` (multipart handling)
- file-type `^16.5.4` (content signature validation)
- image-size `^1.1.1` (dimension checks)
- form-data `^4.0.5` (Cloudinary upload form)
- Cloudinary API via native HTTPS requests (no cloudinary SDK)
- @aws-sdk/client-s3 `^3.883.0` (installed dependency; not used in current backend code paths)

### Testing and dev tools
- jest `^29.7.0`
- supertest `^7.1.1`
- mongodb-memory-server `^10.1.4`
- nodemon `^3.1.14` (installed)
- TypeScript `^5.9.3` (backend config allows JS, no compiled TS pipeline shown)

### Frontend (Expo app)
- Expo `^54.0.33`
- React `19.1.0`
- React Native `0.81.5`
- expo-router `~6.0.23`
- React Navigation family:
  - @react-navigation/native
  - @react-navigation/native-stack
  - @react-navigation/bottom-tabs
  - @react-navigation/material-top-tabs
  - @react-navigation/elements
- Auth/session and device APIs:
  - expo-auth-session
  - expo-secure-store
  - expo-web-browser
  - expo-constants
  - expo-file-system
  - expo-image-picker
  - expo-haptics
  - expo-splash-screen
  - expo-status-bar
  - expo-system-ui
  - expo-linking
  - expo-image
- UI and misc:
  - react-native-reanimated
  - react-native-gesture-handler
  - react-native-safe-area-context
  - react-native-screens
  - react-native-svg
  - react-native-svg-transformer
  - react-native-pager-view
  - react-native-vision-camera
  - react-native-worklets
  - uuid
- Fonts:
  - @expo-google-fonts/are-you-serious
  - @expo-google-fonts/inter
  - @expo-google-fonts/playfair-display
  - @expo-google-fonts/poppins
- Linting:
  - eslint
  - eslint-config-expo

## Folder structure
```text
.
|- backups/                         # CSV/JSON examples and backup artifacts for storage migration/restore workflows
|- docs/                            # Operational docs (Atlas+Compass setup, storage rollout checklist)
|- frontend/
|  |- closet/                       # Expo React Native client app
|     |- app/                       # Expo Router screens and route groups
|     |- assets/                    # Images/icons/static assets
|     |- components/                # Reusable UI components
|     |- constants/                 # App constants and API URL/header helpers
|     |- context/                   # React context providers (user/theme/calendar/wardrobe state)
|     |- hooks/                     # Custom hooks
|     |- scripts/                   # Local dev scripts (e.g., API env sync)
|     |- services/                  # Network/service modules (auth exchange, upload request wrapper, etc.)
|     |- Styles/                    # Styling helpers/themes
|- scripts/                         # Backend maintenance/migration scripts (verify/repair/restore/backfill/import/export/orphan cleanup)
|- src/
|  |- config/                       # Environment bootstrap, Mongo connection, upload/storage configuration
|  |- controllers/                  # Route handlers and domain logic
|  |- middleware/                   # JWT auth, multipart/image validation, object/date/query validation
|  |- models/                       # Mongoose schemas/models
|  |- routes/                       # Express route definitions and middleware wiring
|  |- services/
|  |  |- storage/                   # Storage abstraction with local/cloudinary drivers and health metrics
|  |- utils/                        # Shared utilities (image URL/path parsing, metadata shaping, orphan cleanup)
|- tests/
|  |- integration/                  # Integration tests for API behavior, storage health/migration, community, analytics, styling
|- uploads/                         # Local managed image storage directory
|- server.js                        # Process entrypoint: loads env and starts Express app
|- package.json                     # Backend dependency and script manifest
|- jest.config.cjs                  # Jest test runner config
|- tsconfig.json                    # Backend TS config (JS allowed, Node16 module target)
|- jsconfig.json                    # JS tooling config
```

## Data models
### User (`src/models/user.js`)
Fields:
- `name: String` required, unique, indexed
- `email: String` required, unique, indexed
- `password: String` required (hashed)
- `profilePicture: String | null`
- `profilePictureMetadata: imageMetadataSchema | null`
- `bannerImage: String | null`
- `bannerImageMetadata: imageMetadataSchema | null`
- `bannerPreset: String` default `"pink"`
- `age: Number | null` min 1 max 99
- `gender: String | null`
- `clothingSize: String | null`
- `shoesSize: String | null`
- `heightCm: Number | null` min 1 max 272
- `weightKg: Number | null` min 1 max 300
- `bodyType: String | null`
- `outfitFormula: String | null`
- `styleWords: String[]` default `[]`
- `closetGoal: String | null`
- `shoppingFrequency: String | null`
- `stylePreferences: String[]` default `[]`
- `preferences.style: String[]`
- `preferences.favoriteColors: String[]`
- `timestamps: true`

Relationships:
- Owns many garments via `Garment.owner`.
- Owns many outfits via `Outfit.owner`.
- Owns many usage events via `Usage.user`.
- Referenced in community likes/comments/posts.

Lifecycle hooks:
- Post/pre delete hooks cascade delete owned Garment, Outfit, Usage records.

### Garment (`src/models/garment.js`)
Fields:
- `name: String` required
- `category: String` required
- `color: String`
- `season: String`
- `purchasePrice: Number` min 0
- `imageUrl: String`
- `imageMetadata: imageMetadataSchema | null`
- `isFavorite: Boolean` default `false`
- `isHidden: Boolean` default `false`
- `owner: ObjectId<User>` required
- `timestamps: true`

Relationships:
- Belongs to one user (`owner`).
- Referenced by outfits (`Outfit.garments[]`) and usages (`Usage.garment`).

### Outfit (`src/models/outfit.js`)
Fields:
- `name: String` required
- `garments: ObjectId<Garment>[]`
- `date: Date`
- `previewImage: String` default `""`
- `previewImageMetadata: imageMetadataSchema | null`
- `isLookbook: Boolean` default `false`
- `owner: ObjectId<User>` required
- `timestamps: true`

Relationships:
- Belongs to one user.
- Contains many garment references.
- Referenced by usage events via `Usage.outfit`.

### Usage (`src/models/usage.js`)
Fields:
- `user: ObjectId<User>` required, indexed
- `garment: ObjectId<Garment>` required, indexed
- `outfit: ObjectId<Outfit> | null` indexed
- `wornDate: Date` required, default now, indexed
- `timestamps: true`

Indexes:
- `{ user: 1, garment: 1, wornDate: -1 }`
- `{ user: 1, wornDate: -1 }`

### CommunityPost (`src/models/communityPost.js`)
Fields:
- `author: ObjectId<User>` required, indexed
- `type: 'post' | 'poll'` default `post`, indexed
- `caption: String` max 500, default `""`
- `imageUrl: String | null`
- `tags: String[]` default `[]`
- `likes: ObjectId<User>[]`
- `commentsCount: Number` default 0
- `poll.question: String | null` max 180
- `poll.options: { text: String, votes: ObjectId<User>[] }[]` (option text max 120)
- `poll.endsAt: Date | null`
- `timestamps: true`

Indexes:
- `{ createdAt: -1 }`
- `{ author: 1, createdAt: -1 }`

### CommunityComment (`src/models/communityComment.js`)
Fields:
- `post: ObjectId<CommunityPost>` required, indexed
- `author: ObjectId<User>` required, indexed
- `text: String` required, max 500
- `timestamps: true`

Indexes:
- `{ post: 1, createdAt: -1 }`

### Shared image metadata sub-schema
Used in User/Garment/Outfit model metadata fields:
- `imageUrl`, `provider`, `publicId`, `secureUrl`, `assetId`, `version`, `resourceType`, `format`, `width`, `height`, `bytes`, `mimeType`, `originalFilename`, `uploadedAt`.

## API routes inventory
Auth legend:
- `Public`: no JWT required
- `Protected`: `authMiddleware` required

### Health and root
- `GET /` - Public - Basic API alive message (`API is running`).
- `GET /api/health` - Public - Storage health snapshot (driver config + failure counters).

### Auth (`/api/auth`)
- `POST /api/auth/register` - Public - Register with `name,email,password`; returns JWT token.
- `POST /api/auth/login` - Public - Login with credentials; returns JWT token.
- `POST /api/auth/google/exchange` - Public - Exchange Google access token (userinfo endpoint) for app JWT.

### Users (`/api/users`) - all Protected
- `GET /api/users/me` - Returns current user profile (password excluded, includes `username` alias).
- `PUT /api/users/me` - Updates mutable profile fields (explicitly blocks password/profile/banner image updates here).
- `PUT /api/users/me/profile-image` - Multipart upload `profileImage`; validates image and updates profile image + metadata.
- `PUT /api/users/me/banner-image` - Multipart upload `bannerImage`; validates image and updates banner image + metadata.
- `PUT /api/users/me/banner-preset` - Updates `bannerPreset`.
- `PUT /api/users/me/password` - Verifies current password and updates hash.
- `PUT /api/users/me/privacy` - Writes `preferences.privacy`.
- `GET /api/users/me/notifications` - Returns `{ notifications: [] }` placeholder. Incomplete.
- `GET /api/users/me/activity` - Returns hardcoded sample activity array placeholder. Incomplete.

### Protected upload serving (`/api/uploads`) - all Protected
- `GET /api/uploads/:filename` - Validates safe filename, confirms requesting user owns a record referencing it, serves local file if present or proxies from managed remote storage URL.

### Garments (`/api/garments`) - all Protected
- `GET /api/garments` - List user garments with optional `category,color` filters and computed `wearCount`.
- `POST /api/garments/search-images` - Search external reference images via Serper API; filters/scoring applied.
- `POST /api/garments/remove-background-url` - Sends image URL to remove.bg and returns base64/data URL.
- `POST /api/garments` - Multipart upload `image` + create garment.
- `GET /api/garments/:id` - Get one owned garment.
- `PATCH /api/garments/:id/preferences` - Update `isFavorite`/`isHidden`.
- `PUT /api/garments/:id/preferences` - Same handler as PATCH.
- `PUT /api/garments/:id` - Multipart upload `image` optional + update garment; old image cleanup.
- `DELETE /api/garments/:id` - Delete garment and associated image file.

### Usage (`/api/usage`) - all Protected
- `POST /api/usage/log` - Validate IDs/date; create single wear event.
- `POST /api/usage/bulk-log` - Validate array/date; create multiple wear events.
- `GET /api/usage/history` - Paginated usage history with optional garment/date filters.

### Outfits (`/api/outfits`) - all Protected
- `GET /api/outfits/randomize` - Balanced random outfit generation with optional count.
- `POST /api/outfits/recommendations` - Heuristic recommendation generator (event + temperature context).
- `POST /api/outfits` - Create outfit; validates garment ownership and auto-creates usage entries.
- `GET /api/outfits` - List outfits populated with garments, mapped for calendar client.
- `GET /api/outfits/date/:date` - List outfits for UTC day.
- `PUT /api/outfits/:id` - Validate ID; optional multipart `coverImage`; update outfit and usage links.
- `PUT /api/outfits/:id/cover` - Validate ID; optional multipart `coverImage`; update only cover-related fields.
- `DELETE /api/outfits/:id` - Validate ID; delete outfit + linked usage + orphan-safe preview cleanup.

### Analytics (`/api/analytics`) - all Protected
- `GET /api/analytics/overview` - Total items, wardrobe usage %, outfits worn count, total outfits, wear events, avg wear/item.
- `GET /api/analytics/categories` - Category breakdown.
- `GET /api/analytics/colours` - Colour distribution.
- `GET /api/analytics/most-worn` - Top worn garments.
- `GET /api/analytics/least-worn` - Least worn garments (non-zero).
- `GET /api/analytics/never-worn` - Garments with zero wear.
- `GET /api/analytics/cost-per-wear` - Item list + summary stats.
- `GET /api/analytics/usage-trends` - Monthly/day/category trends + summary.

### Community (`/api/community`) - all Protected
- `GET /api/community/feed` - Paginated feed with optional `filter` and text/tag search.
- `POST /api/community/posts` - Create post or poll.
- `POST /api/community/posts/:postId/like` - Toggle like/unlike.
- `GET /api/community/posts/:postId/comments` - Paginated comments for post.
- `POST /api/community/posts/:postId/comments` - Add comment and increment post counter.
- `POST /api/community/posts/:postId/vote` - Cast/shift poll vote by option index.

### Seeder (`/api/seed`) - Protected
- `POST /api/seed/generate-user` - Generates synthetic user + garments/outfits/usage; requires `x-seed-secret`, `ENABLE_SEED_ENDPOINT=true`, and non-production runtime.

## Auth & JWT strategy
### Token issuance
- JWT issued in:
  - `authController.register`
  - `authController.login`
  - `authController.exchangeGoogleToken`
  - `seedController.generateUserWithData`
- Token payload: `{ userId }`
- Signature secret: `process.env.JWT_SECRET`
- Expiration: `7d`

### Token validation
- `src/middleware/authMiddleware.js`:
  - Reads `Authorization` header.
  - Expects `Bearer <token>` format.
  - Verifies token with `JWT_SECRET`.
  - Accepts payload key fallback in order: `userId`, `id`, `_id`.
  - Sets `req.user` with normalized `userId` string.

### Protected vs public route groups
Public:
- `/`
- `/api/auth/*`
- `/api/health`

Protected:
- `/api/users/*`
- `/api/uploads/*`
- `/api/garments/*`
- `/api/usage/*`
- `/api/outfits/*`
- `/api/analytics/*`
- `/api/community/*`
- `/api/seed/*`

### Refresh token logic
- No refresh token model/endpoint/rotation currently implemented.
- Session renewal is done by re-login or re-exchange with Google access token.

## File upload handling
### Upload middleware stack
- `createImageUpload(fieldName)` in `src/middleware/imageUploadMiddleware.js` uses multer disk storage.
- Destination: `uploads/` at project root (created recursively if missing).
- Generated filename format: `<fieldName>-<timestamp>-<randomhex><safeExt>`.

### Validation pipeline
1. Multer `fileFilter` enforces MIME starts with `image/`.
2. Content signature validated with `file-type` (`fromFile`) to prevent spoofed MIME.
3. Dimensions read with `image-size` and checked against limits:
   - max dimension from `IMAGE_UPLOAD_MAX_DIMENSION_PX` (default 6000)
   - max megapixels from `IMAGE_UPLOAD_MAX_MEGAPIXELS` (default 25)
4. Multer size limit from `IMAGE_UPLOAD_MAX_MB` (default 5MB).

If validation/storage fails, uploaded temp file is deleted and mapped error responses are returned (`400/413/502` depending on code).

### Storage providers
- Primary storage abstraction in `src/services/storage/index.js`.
- Drivers:
  - Local (`localStorageDriver`) always available.
  - Cloudinary (`cloudinaryStorageDriver`) enabled only when all cloud vars present.
- Behavior:
  - If primary is local: metadata provider `local`, file remains in `uploads/`.
  - If primary is cloudinary: file uploaded to Cloudinary; local copy optionally deleted based on `STORAGE_KEEP_LOCAL_COPY`.
- Upload metadata normalized into model metadata fields by `buildImageMetadata`.

### Routes accepting multipart files
- `PUT /api/users/me/profile-image` (`profileImage`)
- `PUT /api/users/me/banner-image` (`bannerImage`)
- `POST /api/garments` (`image`)
- `PUT /api/garments/:id` (`image`)
- `PUT /api/outfits/:id` (`coverImage`)
- `PUT /api/outfits/:id/cover` (`coverImage`)

### Managed image retrieval
- `GET /api/uploads/:filename` verifies ownership before serving image.
- Reads local file first; if missing and cloud driver active, fetches remote URL and streams response payload.

### Storage-related scripts
- `storage:backfill` - Upload existing referenced local files to Cloudinary.
- `storage:verify` - Validate references against local/cloud/primary/all requirements.
- `storage:repair` - Detect and clear malformed image URLs (with optional backup/apply).
- `storage:restore` - Restore repaired references from backup file.
- `storage:import-images` - Bulk import files into Cloudinary and write DB image fields.
- `storage:export-image-template` - Export CSV template for manual image mapping.
- `cleanup:orphans` - Remove orphaned user/image data with retention policy.

## What's incomplete
Confirmed incomplete/stubbed or partially implemented areas:
- `GET /api/users/me/notifications` returns static empty array placeholder.
- `GET /api/users/me/activity` returns hardcoded sample activity placeholder.
- No refresh token/session rotation flow.
- No formal request validation schema for many endpoints (validation middleware exists but not universally applied).
- No explicit global Express error middleware; each controller handles errors ad hoc.
- No role/permission model beyond owner checks and route auth.
- No CI pipeline files (`.github/workflows/*`) found.
- No `.env.example` template found to document required environment variables for new contributors.
- Frontend `app.json` contains duplicate `ios` keys; in JSON the latter key overwrites the earlier one (likely unintended config loss for `supportsTablet`/`bundleIdentifier`).

## Conventions & patterns
### Naming and structure
- CommonJS pattern throughout backend (`require`, `module.exports`).
- Route files are grouped by domain and mounted in `src/app.js`.
- Controllers contain most domain logic; models are plain Mongoose schemas.
- Ownership scoping pattern is consistent: queries include `owner: req.user.userId` (or `user:` for usage).

### Response patterns
No single enforced envelope. Common shapes:
- Success data direct JSON object/array (e.g., garment/outfit lists).
- Action confirmations: `{ message: "..." }`.
- Validation/auth failures: `{ message: "..." }`.
- Server errors: `{ error: error.message }`.

This is functional but inconsistent for client parsing (`message` vs `error`, wrapped vs unwrapped payloads).

### Error handling
- Most controller methods use `try/catch` and return `500` with `error.message`.
- Upload middleware has explicit error code mapping (`LIMIT_FILE_SIZE`, invalid signature/dimensions, storage failures).
- DB connection failures terminate process (`process.exit(1)`).

### Data and storage patterns
- Image URLs are normalized to `/uploads/<filename>` logical URL even when physically stored in Cloudinary.
- Metadata subdocuments preserve provider-specific upload details.
- Utilities centralize filename safety checks and path resolution to avoid traversal issues.

### Testing patterns
- Integration tests under `tests/integration` with `mongodb-memory-server`.
- Tests cover upload validation, storage health/migration scripts, community features, usage analytics, calendar outfits, and seeding.

## Deployment & CI setup
### Present
- `.env` file exists locally (not committed details here).
- Runtime startup via `server.js`.
- `Dockerfile` exists at repo root.
- `docker-compose.yml` exists at repo root.
- Jest integration test setup.
- Operational docs:
  - Atlas + Compass setup
  - Storage rollout and rollback checklist

### Missing (as of current repo state)
- No GitHub Actions or other CI config in repo.
- No platform deployment manifest (Railway/Render/Heroku/Procfile) beyond Docker assets.
- No `.env.example` template documenting required vars.
- No explicit production process manager config (PM2/ecosystem file).

## Key decisions & constraints
### Environment variables (confirmed keys used)
- Core:
  - `PORT`
  - `HOST`
  - `MONGO_URI`
  - `MONGO_DB_NAME`
  - `JWT_SECRET`
- Upload/storage:
  - `IMAGE_UPLOAD_MAX_MB`
  - `IMAGE_UPLOAD_MAX_DIMENSION_PX`
  - `IMAGE_UPLOAD_MAX_MEGAPIXELS`
  - `ORPHAN_UPLOAD_RETENTION_DAYS`
  - `STORAGE_PRIMARY_DRIVER` (`local` or `cloudinary`)
  - `STORAGE_KEEP_LOCAL_COPY`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - `CLOUDINARY_FOLDER`
- External APIs:
  - `SERPER_API_KEY`
  - `REMOVE_BG_API_KEY`
- Safety toggles:
  - `AUTO_CLEANUP_ORPHANS`
  - `ALLOW_ATLAS_ORPHAN_CLEANUP`
  - `ALLOW_TEST_ATLAS`
  - `ENABLE_SEED_ENDPOINT`
  - `SEED_API_SECRET`

### Architectural decisions
- Single JWT bearer token model with 7-day expiry.
- Route-level auth middleware via `router.use(authMiddleware)` per protected module.
- Storage abstraction layer supports local-first and Cloudinary migration without changing logical image URL format.
- Upload access is private and ownership-checked through `/api/uploads/:filename` rather than public static hosting.
- Usage tracking is event-based and used as source for analytics (not denormalized counters).

### Operational constraints and safeguards
- Test runtime blocks accidental Atlas connection unless explicitly allowed.
- Orphan cleanup against Atlas is blocked unless explicitly allowed.
- Seeder endpoint blocked in production and requires secret header.
- Filename/path safety checks restrict upload retrieval/deletion to safe patterns.

### Known inconsistencies/risks to track
- Inconsistent API response envelope (`message` vs `error` vs raw payload).
- No centralized validation strategy for all endpoints.
- Frontend includes local context state (`userContext`) that can diverge from backend source-of-truth if used broadly.
- Installed but currently unused dependency: `@aws-sdk/client-s3`.

## Potential improvements
Prioritized improvements that fit the current architecture:

### 1) API contract and error consistency
- Adopt a consistent response envelope for success and errors (e.g., `{ data, meta }` and `{ error: { code, message, details } }`).
- Add a global Express error handler and route-level async wrapper to remove duplicated `try/catch` boilerplate.
- Introduce stable error codes for frontend branching (auth expired, validation failed, ownership denied, etc.).

### 2) Validation and security hardening
- Apply request validation middleware to all mutating endpoints (`POST/PUT/PATCH/DELETE`) with shared schemas.
- Add per-route rate limits for sensitive flows (`/api/auth/*`, image upload endpoints, remove.bg and Serper proxy endpoints).
- Add security headers (`helmet`) and explicit CORS allowlist by environment.
- Move token strategy toward short-lived access tokens + refresh token rotation/revocation support.

### 3) Data model and query performance
- Add indexes for frequent filter/sort paths in garments/outfits/community feed (including compound owner+date patterns).
- Add partial indexes where appropriate for sparse fields.
- Add pagination defaults and hard caps consistently across all list endpoints.
- Consider soft-delete strategy (or archive collection) for recoverability instead of immediate hard delete.

### 4) Storage and media lifecycle
- Add background job/queue support for heavy image workflows (resizing, metadata extraction, delayed cleanup).
- Persist image derivatives (thumbnail/preview) to reduce mobile bandwidth and improve feed latency.
- Add signed URL strategy for private cloud assets where direct proxying becomes expensive.
- Add periodic integrity job schedule with report artifacts (verify + orphan cleanup + anomaly summary).

### 5) Observability and operations
- Introduce structured logging (`pino`/`winston`) with request IDs and correlation IDs across backend and scripts.
- Add health/readiness checks for DB and storage dependencies separately.
- Add metrics for endpoint latency/error rate and storage provider failures.
- Add CI pipeline for lint + test + basic security scanning on PRs.

### 6) Developer experience
- Add `.env.example` and startup validation docs for required/optional env vars.
- Add script-level dry-run defaults where mutation is risky (`repair`, `restore`, `cleanup`).
- Add OpenAPI/Swagger spec generation to keep frontend/backend contracts synchronized.
- Remove unused deps (e.g., `@aws-sdk/client-s3`) or complete their integration intentionally.

### 7) Frontend reliability and product polish
- Fix duplicate `ios` key in `frontend/closet/app.json`.
- Introduce typed API client layer with centralized auth refresh/retry policy.
- Add optimistic update + rollback patterns for likes/comments/preferences to improve perceived performance.
- Add offline-aware caching strategy for core wardrobe/outfit/calendar reads.

### 8) Testing strategy expansion
- Add unit tests for utility-heavy modules (image utils, metadata mapping, storage reference parsing).
- Add contract tests for key endpoints and error payload shapes.
- Add end-to-end smoke tests for register/login/upload/create outfit flow.
- Add regression tests for storage migration scripts using representative backup fixtures.
