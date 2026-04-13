const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER,
} = require('../../../config/upload');

const isEnabled = () => Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

const isSafeFilename = (filename) => /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/.test(filename || '');

const toManagedPublicId = (filename) => {
  const safeFilename = String(filename || '').trim();
  if (!isSafeFilename(safeFilename)) {
    return null;
  }

  return `${CLOUDINARY_FOLDER}/${safeFilename}`;
};

const signParams = (params) => {
  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${canonical}${CLOUDINARY_API_SECRET}`)
    .digest('hex');
};

const performRequest = (options, bodyBuffer) => new Promise((resolve, reject) => {
  const req = https.request(options, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      let json;
      try {
        json = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        reject(new Error(`Unexpected Cloudinary response (${res.statusCode})`));
        return;
      }

      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(json);
        return;
      }

      const cloudinaryMessage = json.error?.message || `Cloudinary request failed (${res.statusCode})`;
      const err = new Error(cloudinaryMessage);
      err.code = 'CLOUDINARY_REQUEST_FAILED';
      err.statusCode = res.statusCode;
      reject(err);
    });
  });

  req.on('error', reject);

  if (bodyBuffer) {
    req.write(bodyBuffer);
  }

  req.end();
});

const performFormRequest = (requestPath, form) => new Promise((resolve, reject) => {
  const options = {
    hostname: 'api.cloudinary.com',
    path: requestPath,
    method: 'POST',
    headers: form.getHeaders(),
  };

  const req = https.request(options, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      let json;
      try {
        json = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        reject(new Error(`Unexpected Cloudinary response (${res.statusCode})`));
        return;
      }

      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(json);
        return;
      }

      const cloudinaryMessage = json.error?.message || `Cloudinary request failed (${res.statusCode})`;
      const err = new Error(cloudinaryMessage);
      err.code = 'CLOUDINARY_REQUEST_FAILED';
      err.statusCode = res.statusCode;
      reject(err);
    });
  });

  req.on('error', reject);
  form.pipe(req);
});

const encodePublicIdForDelivery = (publicId) => publicId
  .split('/')
  .map((segment) => encodeURIComponent(segment))
  .join('/');

const registerUploadedFile = async (file) => {
  if (!file?.path || !file?.filename) {
    return null;
  }

  if (!isEnabled()) {
    const err = new Error('Cloudinary storage is not configured.');
    err.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw err;
  }

  const publicId = toManagedPublicId(file.filename);
  if (!publicId) {
    const err = new Error('Invalid filename for cloud upload.');
    err.code = 'INVALID_STORAGE_FILENAME';
    throw err;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({
    overwrite: 'true',
    public_id: publicId,
    timestamp,
  });

  const form = new FormData();
  form.append('file', fs.createReadStream(path.resolve(file.path)));
  form.append('api_key', CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('public_id', publicId);
  form.append('overwrite', 'true');
  form.append('signature', signature);

  const response = await performFormRequest(`/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload`, form);

  return {
    provider: 'cloudinary',
    managedUrl: response.secure_url || null,
    publicId: response.public_id,
    secureUrl: response.secure_url,
    assetId: response.asset_id || null,
    version: Number.isFinite(response.version) ? response.version : null,
    resourceType: response.resource_type || null,
    format: response.format || null,
    width: Number.isFinite(response.width) ? response.width : null,
    height: Number.isFinite(response.height) ? response.height : null,
    bytes: Number.isFinite(response.bytes) ? response.bytes : (Number.isFinite(file?.size) ? file.size : null),
    mimeType: file?.mimetype || null,
    originalFilename: file?.originalname || null,
    uploadedAt: new Date().toISOString(),
  };
};

const deleteManagedFile = async (filename) => {
  if (!isEnabled()) {
    return false;
  }

  const publicId = toManagedPublicId(filename);
  if (!publicId) {
    return false;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({
    invalidate: 'true',
    public_id: publicId,
    timestamp,
  });

  const payload = JSON.stringify({
    public_id: publicId,
    invalidate: true,
    api_key: CLOUDINARY_API_KEY,
    timestamp,
    signature,
  });

  const response = await performRequest({
    hostname: 'api.cloudinary.com',
    path: `/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/destroy`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, payload);

  return response.result === 'ok' || response.result === 'not found';
};

const listManagedFiles = async () => {
  if (!isEnabled()) {
    return [];
  }

  const authHeader = Buffer
    .from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`)
    .toString('base64');

  const files = [];
  let nextCursor = null;

  do {
    const query = new URLSearchParams({
      prefix: `${CLOUDINARY_FOLDER}/`,
      max_results: '500',
    });

    if (nextCursor) {
      query.set('next_cursor', nextCursor);
    }

    const response = await performRequest({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/resources/image/upload?${query.toString()}`,
      method: 'GET',
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    });

    const batchFiles = (response.resources || [])
      .map((resource) => String(resource.public_id || '').split('/').pop())
      .filter((name) => isSafeFilename(name));

    files.push(...batchFiles);
    nextCursor = response.next_cursor || null;
  } while (nextCursor);

  return Array.from(new Set(files));
};

const getManagedReadUrl = async (filename) => {
  if (!isEnabled()) {
    return null;
  }

  const publicId = toManagedPublicId(filename);
  if (!publicId) {
    return null;
  }

  const encodedPublicId = encodePublicIdForDelivery(publicId);
  return `https://res.cloudinary.com/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload/${encodedPublicId}`;
};

module.exports = {
  isEnabled,
  registerUploadedFile,
  deleteManagedFile,
  listManagedFiles,
  getManagedReadUrl,
};
