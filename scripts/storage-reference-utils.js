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
    fields: [{ key: 'imageUrl', emptyValue: null }],
    query: { imageUrl: { $exists: true, $ne: null } },
  },
  {
    label: 'User',
    model: User,
    fields: [
      { key: 'profilePicture', emptyValue: null },
      { key: 'bannerImage', emptyValue: null },
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
    fields: [{ key: 'previewImage', emptyValue: '' }],
    query: { previewImage: { $exists: true, $ne: null, $ne: '' } },
  },
  {
    label: 'CommunityPost',
    model: CommunityPost,
    fields: [{ key: 'imageUrl', emptyValue: null }],
    query: { imageUrl: { $exists: true, $ne: null } },
  },
];

const collectImageReferences = async () => {
  const references = [];

  for (const config of MODEL_CONFIG) {
    const fieldProjection = config.fields.map((field) => field.key).join(' ');
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

  return reference.model.updateOne(
    { _id: reference.docId },
    { $set: { [reference.field]: value } }
  );
};

module.exports = {
  collectImageReferences,
  writeReferenceValue,
};
