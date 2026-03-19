const buildImageMetadata = (file, imageUrl) => {
  if (!file) return null;

  const storage = file.storage || {};
  return {
    imageUrl: imageUrl || storage.managedUrl || null,
    provider: storage.provider || 'local',
    publicId: storage.publicId || null,
    secureUrl: storage.secureUrl || null,
    assetId: storage.assetId || null,
    version: Number.isFinite(storage.version) ? storage.version : null,
    resourceType: storage.resourceType || null,
    format: storage.format || null,
    width: Number.isFinite(storage.width) ? storage.width : null,
    height: Number.isFinite(storage.height) ? storage.height : null,
    bytes: Number.isFinite(storage.bytes) ? storage.bytes : (Number.isFinite(file.size) ? file.size : null),
    mimeType: storage.mimeType || file.mimetype || null,
    originalFilename: storage.originalFilename || file.originalname || null,
    uploadedAt: storage.uploadedAt ? new Date(storage.uploadedAt) : new Date(),
  };
};

module.exports = {
  buildImageMetadata,
};
