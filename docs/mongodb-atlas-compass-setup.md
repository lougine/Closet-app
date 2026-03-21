# MongoDB Atlas + Compass Setup

## Goal
Use MongoDB Atlas as the hosted database while continuing to manage data from MongoDB Compass.

## 1) Create Atlas resources
1. In Atlas, create a project and a cluster (M0 free tier is enough to start).
2. Create a database user with read/write permissions.
3. In Network Access, allow your current public IP.

## 2) Get Atlas connection string
1. In Atlas, click Connect.
2. Choose Drivers and copy the SRV URI.
3. Replace `<username>` and `<password>`.
4. Keep query options like `retryWrites=true&w=majority`.

## 3) Configure backend environment
Set these values in your runtime `.env` file:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=digital-wardrobe
MONGO_DB_NAME=digital_wardrobe
```

Notes:
- `MONGO_DB_NAME` is recommended so your app consistently uses the same DB in Atlas.
- Keep special characters in passwords URL-encoded.

## 4) Connect Compass to the same Atlas cluster
1. Open MongoDB Compass.
2. Paste the same `MONGO_URI` (or use Atlas -> Connect -> Compass option).
3. Connect and select database `digital_wardrobe` (or your chosen DB name).

This gives you:
- Atlas hosting for production-grade cloud MongoDB.
- Compass for visual CRUD/query/index management.

## 5) Verify app connectivity
1. Start backend.
2. Confirm startup log shows `MongoDB connected`.
3. Use Compass to verify app-created collections/documents appear in the selected DB.

## 6) Common Atlas issues
- Authentication failed:
  - Check username/password.
  - URL-encode password special characters.
- Timeout / server selection error:
  - Add your IP to Atlas Network Access.
  - Confirm firewall/proxy allows outbound TLS.
- Connected but wrong database:
  - Set `MONGO_DB_NAME` explicitly in `.env`.

## 7) Recommended security baseline
- Never commit `.env` with real credentials.
- Use least-privilege DB users.
- Rotate credentials periodically.
- Restrict allowed IP ranges once deployed.
