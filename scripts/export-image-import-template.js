require('dotenv').config({ override: true });
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const Garment = require('../src/models/garment');
const User = require('../src/models/user');
const Outfit = require('../src/models/outfit');
const CommunityPost = require('../src/models/communityPost');

const parseArgs = (argv = process.argv.slice(2)) => {
  const outArg = argv.find((arg) => arg.startsWith('--out='));
  return {
    outPath: outArg ? outArg.slice('--out='.length).trim() : 'backups/cloudinary-import-template.csv',
    includeExisting: argv.includes('--include-existing'),
  };
};

const escapeCsv = (value) => {
  const text = String(value == null ? '' : value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
};

const addRow = (rows, model, id, field, note) => {
  rows.push([model, id, field, '', note]);
};

const buildTemplateRows = async (options = {}) => {
  const includeExisting = Boolean(options.includeExisting);
  const rows = [];

  const garments = await Garment.find({}).select('_id name imageUrl').lean();
  for (const garment of garments) {
    if (!includeExisting && garment.imageUrl) continue;
    addRow(rows, 'garment', garment._id, 'imageUrl', `Garment: ${garment.name || ''}`.trim());
  }

  const users = await User.find({}).select('_id name email profilePicture bannerImage').lean();
  for (const user of users) {
    if (includeExisting || !user.profilePicture) {
      addRow(rows, 'user', user._id, 'profilePicture', `User: ${user.name || ''} <${user.email || ''}>`.trim());
    }
    if (includeExisting || !user.bannerImage) {
      addRow(rows, 'user', user._id, 'bannerImage', `User: ${user.name || ''} <${user.email || ''}>`.trim());
    }
  }

  const outfits = await Outfit.find({}).select('_id name previewImage').lean();
  for (const outfit of outfits) {
    if (!includeExisting && outfit.previewImage) continue;
    addRow(rows, 'outfit', outfit._id, 'previewImage', `Outfit: ${outfit.name || ''}`.trim());
  }

  const posts = await CommunityPost.find({}).select('_id caption imageUrl').lean();
  for (const post of posts) {
    if (!includeExisting && post.imageUrl) continue;
    const caption = String(post.caption || '').replace(/\s+/g, ' ').slice(0, 80);
    addRow(rows, 'communitypost', post._id, 'imageUrl', `Post: ${caption}`.trim());
  }

  return rows;
};

const runExport = async (options = {}) => {
  await connectDB();

  const rows = await buildTemplateRows(options);
  const header = ['model', 'id', 'field', 'imagePath', 'note'];
  const csvLines = [header.join(',')];

  for (const row of rows) {
    csvLines.push(row.map(escapeCsv).join(','));
  }

  const outPath = path.resolve(process.cwd(), options.outPath || 'backups/cloudinary-import-template.csv');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, csvLines.join('\n') + '\n', 'utf8');

  return {
    outPath,
    rows: rows.length,
  };
};

const runCli = async (argv = process.argv.slice(2)) => {
  const options = parseArgs(argv);
  const summary = await runExport(options);
  console.log('STORAGE_EXPORT_IMAGE_TEMPLATE_SUMMARY=' + JSON.stringify(summary));
  return summary;
};

if (require.main === module) {
  runCli()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('STORAGE_EXPORT_IMAGE_TEMPLATE_FAILED', error);
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        console.error('STORAGE_EXPORT_IMAGE_TEMPLATE_DISCONNECT_FAILED', disconnectError);
      }
      process.exit(1);
    });
}

module.exports = {
  parseArgs,
  buildTemplateRows,
  runExport,
  runCli,
};
