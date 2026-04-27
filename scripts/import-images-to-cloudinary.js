require('dotenv').config({ override: true });
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const Garment = require('../src/models/garment');
const User = require('../src/models/user');
const Outfit = require('../src/models/outfit');
const CommunityPost = require('../src/models/communityPost');
const cloudinaryStorageDriver = require('../src/services/storage/drivers/cloudinaryStorageDriver');

const SUPPORTED_MODELS = {
  garment: {
    label: 'Garment',
    model: Garment,
    fields: {
      imageUrl: {
        imageField: 'imageUrl',
        metadataField: 'imageMetadata',
      },
    },
  },
  user: {
    label: 'User',
    model: User,
    fields: {
      profilePicture: {
        imageField: 'profilePicture',
        metadataField: 'profilePictureMetadata',
      },
      bannerImage: {
        imageField: 'bannerImage',
        metadataField: 'bannerImageMetadata',
      },
    },
  },
  outfit: {
    label: 'Outfit',
    model: Outfit,
    fields: {
      previewImage: {
        imageField: 'previewImage',
        metadataField: 'previewImageMetadata',
      },
    },
  },
  communitypost: {
    label: 'CommunityPost',
    model: CommunityPost,
    fields: {
      imageUrl: {
        imageField: 'imageUrl',
        metadataField: null,
      },
    },
  },
};

const parseArgs = (argv = process.argv.slice(2)) => {
  const csvArg = argv.find((arg) => arg.startsWith('--csv='));
  const csvPath = csvArg ? csvArg.slice('--csv='.length).trim() : '';

  return {
    csvPath,
    dryRun: argv.includes('--dry-run'),
    skipExisting: argv.includes('--skip-existing'),
  };
};

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

const normalizeHeader = (value) => String(value || '').trim().toLowerCase();

const parseCsvRows = async (csvPath) => {
  const raw = await fs.readFile(csvPath, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  if (lines.length === 0) {
    throw new Error('CSV is empty. Expected header: model,id,field,imagePath');
  }

  const header = parseCsvLine(lines[0]).map(normalizeHeader);
  const indexMap = {
    model: header.indexOf('model'),
    id: header.indexOf('id'),
    field: header.indexOf('field'),
    imagePath: header.indexOf('imagepath'),
  };

  if (Object.values(indexMap).some((idx) => idx < 0)) {
    throw new Error('CSV header must include: model,id,field,imagePath');
  }

  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    return {
      rowNumber: rowIndex + 2,
      model: String(values[indexMap.model] || '').trim(),
      id: String(values[indexMap.id] || '').trim(),
      field: String(values[indexMap.field] || '').trim(),
      imagePath: String(values[indexMap.imagePath] || '').trim(),
    };
  });
};

const toAbsolutePath = (baseDir, maybeRelativePath) => {
  if (path.isAbsolute(maybeRelativePath)) {
    return maybeRelativePath;
  }

  return path.resolve(baseDir, maybeRelativePath);
};

const sanitizeSegment = (value) => {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
};

const buildUploadFilename = ({ model, field, docId, sourcePath }) => {
  const ext = path.extname(sourcePath) || '.jpg';
  const baseName = path.basename(sourcePath, ext);
  const timestamp = Date.now();

  const modelPart = sanitizeSegment(model) || 'item';
  const fieldPart = sanitizeSegment(field) || 'image';
  const idPart = sanitizeSegment(docId) || 'doc';
  const basePart = sanitizeSegment(baseName) || 'file';

  return `${modelPart}-${fieldPart}-${idPart}-${timestamp}-${basePart}${ext.toLowerCase()}`;
};

const buildImageMetadataFromUpload = (storageUpload, imageUrl, originalFilename) => {
  if (!storageUpload) return null;

  return {
    imageUrl,
    provider: storageUpload.provider || 'cloudinary',
    publicId: storageUpload.publicId || null,
    secureUrl: storageUpload.secureUrl || null,
    assetId: storageUpload.assetId || null,
    version: Number.isFinite(storageUpload.version) ? storageUpload.version : null,
    resourceType: storageUpload.resourceType || null,
    format: storageUpload.format || null,
    width: Number.isFinite(storageUpload.width) ? storageUpload.width : null,
    height: Number.isFinite(storageUpload.height) ? storageUpload.height : null,
    bytes: Number.isFinite(storageUpload.bytes) ? storageUpload.bytes : null,
    mimeType: storageUpload.mimeType || null,
    originalFilename: originalFilename || null,
    uploadedAt: storageUpload.uploadedAt ? new Date(storageUpload.uploadedAt) : new Date(),
  };
};

const validateRow = async (row, options = {}) => {
  const issues = [];
  const modelKey = String(row.model || '').toLowerCase();
  const modelConfig = SUPPORTED_MODELS[modelKey];

  if (!modelConfig) {
    issues.push(`unsupported model '${row.model}'`);
    return { issues };
  }

  if (!mongoose.Types.ObjectId.isValid(row.id)) {
    issues.push(`invalid id '${row.id}'`);
    return { issues };
  }

  const fieldConfig = modelConfig.fields[row.field];
  if (!fieldConfig) {
    issues.push(`unsupported field '${row.field}' for model '${row.model}'`);
    return { issues };
  }

  if (!row.imagePath) {
    issues.push('imagePath is empty');
    return { issues };
  }

  const absoluteImagePath = toAbsolutePath(options.baseDir || process.cwd(), row.imagePath);

  try {
    await fs.access(absoluteImagePath);
  } catch {
    issues.push(`image file not found '${absoluteImagePath}'`);
    return { issues };
  }

  const existingDoc = await modelConfig.model.findById(row.id).lean();
  if (!existingDoc) {
    issues.push(`document not found for id '${row.id}'`);
    return { issues };
  }

  if (options.skipExisting && existingDoc[fieldConfig.imageField]) {
    issues.push('skipped-existing-image');
    return {
      issues,
      skipOnly: true,
    };
  }

  return {
    issues,
    modelKey,
    modelConfig,
    fieldConfig,
    absoluteImagePath,
    existingDoc,
  };
};

const importImages = async (options = {}) => {
  const { csvPath, dryRun = false, skipExisting = false } = options;
  if (!csvPath) {
    throw new Error('Missing required --csv=<path> argument.');
  }

  if (!cloudinaryStorageDriver.isEnabled()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
  }

  const absoluteCsvPath = path.resolve(process.cwd(), csvPath);
  const csvBaseDir = path.dirname(absoluteCsvPath);
  const rows = await parseCsvRows(absoluteCsvPath);

  await connectDB();

  const summary = {
    dryRun,
    skipExisting,
    csvPath: absoluteCsvPath,
    rowsRead: rows.length,
    uploaded: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };

  for (const row of rows) {
    const validation = await validateRow(row, {
      baseDir: csvBaseDir,
      skipExisting,
    });

    if (validation.issues.length > 0) {
      if (validation.skipOnly) {
        summary.skipped += 1;
      } else {
        summary.failed += 1;
      }

      summary.results.push({
        row: row.rowNumber,
        status: validation.skipOnly ? 'skipped' : 'failed',
        details: validation.issues.join('; '),
      });
      continue;
    }

    if (dryRun) {
      summary.skipped += 1;
      summary.results.push({
        row: row.rowNumber,
        status: 'dry-run',
        details: `ready to upload ${validation.absoluteImagePath}`,
      });
      continue;
    }

    try {
      const uploadFilename = buildUploadFilename({
        model: row.model,
        field: row.field,
        docId: row.id,
        sourcePath: validation.absoluteImagePath,
      });

      const uploadResult = await cloudinaryStorageDriver.registerUploadedFile({
        filename: uploadFilename,
        path: validation.absoluteImagePath,
      });

      const imageUrl = uploadResult.secureUrl || uploadResult.managedUrl || null;
      if (!imageUrl) {
        throw new Error('Cloudinary upload did not return a secure URL.');
      }
      const updatePayload = {
        [validation.fieldConfig.imageField]: imageUrl,
      };

      if (validation.fieldConfig.metadataField) {
        updatePayload[validation.fieldConfig.metadataField] = buildImageMetadataFromUpload(
          uploadResult,
          imageUrl,
          path.basename(validation.absoluteImagePath),
        );
      }

      const updateResult = await validation.modelConfig.model.updateOne(
        { _id: validation.existingDoc._id },
        { $set: updatePayload },
      );

      summary.uploaded += 1;
      summary.updated += Number(updateResult.modifiedCount || 0);

      summary.results.push({
        row: row.rowNumber,
        status: 'updated',
        details: `${validation.modelConfig.label}.${validation.fieldConfig.imageField} <- ${imageUrl}`,
      });
    } catch (error) {
      summary.failed += 1;
      summary.results.push({
        row: row.rowNumber,
        status: 'failed',
        details: error.message || String(error),
      });
    }
  }

  return summary;
};

const runCli = async (argv = process.argv.slice(2)) => {
  const options = parseArgs(argv);
  const summary = await importImages(options);
  console.log('STORAGE_IMPORT_IMAGES_SUMMARY=' + JSON.stringify(summary));

  if (summary.failed > 0) {
    process.exitCode = 1;
  }

  return summary;
};

if (require.main === module) {
  runCli()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(process.exitCode || 0);
    })
    .catch(async (error) => {
      console.error('STORAGE_IMPORT_IMAGES_FAILED', error);
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        console.error('STORAGE_IMPORT_IMAGES_DISCONNECT_FAILED', disconnectError);
      }
      process.exit(1);
    });
}

module.exports = {
  parseArgs,
  parseCsvRows,
  importImages,
  runCli,
};
