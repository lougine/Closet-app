const mongoose = require('mongoose');

const Garment = require('../src/models/garment');
const User = require('../src/models/user');
const Outfit = require('../src/models/outfit');
const CommunityPost = require('../src/models/communityPost');
const { extractFilenameFromImageUrl } = require('../src/utils/imageFileUtils');

const MODEL_CONFIG = [
  {
    label: 'Garment',
    model: Garment,
    fields: [{ key: 'imageUrl', metadataKey: 'imageMetadata', emptyValue: null }],
    query: { imageUrl: { $exists: true, $ne: null } },
  },
  {
    label: 'User',
    model: User,
    fields: [
      { key: 'profilePicture', metadataKey: 'profilePictureMetadata', emptyValue: null },
      { key: 'bannerImage', metadataKey: 'bannerImageMetadata', emptyValue: null },
    ],
    query: {
      $or: [
        { profilePicture: { $exists: true, $ne: null } },
        { bannerImage: { $exists: true, $ne: null } },
      ],
    },
  },
  {
    label: 'Outfit',
    model: Outfit,
    fields: [{ key: 'previewImage', metadataKey: 'previewImageMetadata', emptyValue: '' }],
    query: { previewImage: { $exists: true, $ne: null, $ne: '' } },
  },
  {
    label: 'CommunityPost',
    model: CommunityPost,
    fields: [{ key: 'imageUrl', metadataKey: null, emptyValue: null }],
    query: { imageUrl: { $exists: true, $ne: null } },
  },
];

const collectImageReferences = async () => {
  const references = [];

  for (const config of MODEL_CONFIG) {
    const projectionKeys = config.fields
      .flatMap((field) => [field.key, field.metadataKey].filter(Boolean));
    const fieldProjection = projectionKeys.join(' ');
    const docs = await config.model.find(config.query).select(fieldProjection).lean();

    for (const doc of docs) {
      for (const field of config.fields) {
        const imageUrl = doc[field.key];
        if (!imageUrl) continue;

        references.push({
          modelLabel: config.label,
          model: config.model,
          docId: doc._id,
          docIdString: String(doc._id),
          field: field.key,
          metadataField: field.metadataKey,
          hasMetadataObject: Boolean(field.metadataKey && doc[field.metadataKey]),
          emptyValue: field.emptyValue,
          imageUrl,
          filename: extractFilenameFromImageUrl(imageUrl),
        });
      }
    }
  }

  return references;
};

const writeReferenceValue = async (reference, value) => {
  if (!reference || !mongoose.Types.ObjectId.isValid(reference.docIdString)) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const setPayload = {
    [reference.field]: value,
  };

  if (reference.metadataField && reference.hasMetadataObject) {
    setPayload[`${reference.metadataField}.imageUrl`] = value;
    setPayload[`${reference.metadataField}.secureUrl`] = value;
  }

  return reference.model.updateOne(
    { _id: reference.docId },
    { $set: setPayload }
  );
};

module.exports = {
  collectImageReferences,
  writeReferenceValue,
};
