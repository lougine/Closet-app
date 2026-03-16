# Image Upload Functionality

This document describes the image upload functionality implemented for the Digital Wardrobe Backend.

## Overview

The backend now supports secure image uploads for garments, with automatic storage of media paths in the database and protected static file access.

## Features

- **File Upload**: Support for image uploads using multipart/form-data
- **Secure Storage**: Images stored in `uploads/` directory with unique filenames
- **Database Integration**: Image paths stored in garment `imageUrl` field
- **Protected Access**: Static files served through authenticated `/api/uploads` endpoint
- **File Validation**: Only image files allowed, 5MB size limit

## API Endpoints

### Create Garment with Image
```
POST /api/garments
Content-Type: multipart/form-data

Form fields:
- name: string (required)
- category: string (required)
- color: string (optional)
- season: string (optional)
- image: file (optional) - Image file to upload
```

### Update Garment with Image
```
PUT /api/garments/:id
Content-Type: multipart/form-data

Form fields:
- name: string
- category: string
- color: string
- season: string
- image: file (optional) - New image file to upload
```

### Access Uploaded Images
```
GET /api/uploads/:filename
Authorization: Bearer <token>
```

## Frontend Integration

Use the `buildImageUrl()` function from `constants/api.ts` to construct image URLs:

```typescript
import { buildImageUrl } from '../constants/api';

// garment.imageUrl contains '/uploads/filename.jpg'
const imageUrl = buildImageUrl(garment.imageUrl);
```

## File Storage

- **Directory**: `uploads/`
- **Naming**: `image-{timestamp}-{random}.{extension}`
- **Security**: Files served only through authenticated endpoints
- **Cleanup**: Consider implementing periodic cleanup for unused images

## Dependencies

- `multer`: ^1.4.5-lts.1 (for file uploads)

## Security Considerations

- All upload endpoints require authentication
- File type validation (images only)
- File size limits (5MB)
- Unique filenames prevent conflicts
- Static file access requires authentication

## Future Enhancements

- Image optimization/resizing
- Cloud storage integration (AWS S3, Cloudinary)
- Image metadata extraction
- Batch upload support
- Image deletion cleanup