require('dotenv').config({ override: true });
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const Outfit = require('../src/models/outfit');
const CommunityPost = require('../src/models/communityPost');

const toIdString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
};

const isSelfStyledOutfit = (outfit) => {
  const ownerId = toIdString(outfit?.owner);
  const creatorId = toIdString(outfit?.createdBy);
  const audienceId = toIdString(outfit?.styledForUserId);

  if (!ownerId || !creatorId || ownerId !== creatorId) return false;
  if (!audienceId) return true;
  return audienceId === ownerId;
};

const buildCaption = (outfit) => {
  const outfitName = String(outfit?.name || '').trim();
  return outfitName ? `Styled ${outfitName}` : 'Styled a fit';
};

const parseCliOptions = (argv = process.argv.slice(2)) => {
  const dryRun = argv.includes('--dry-run');
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null;

  return {
    dryRun,
    limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null,
  };
};

const runBackfill = async (options = {}) => {
  const dryRun = Boolean(options.dryRun);
  const limit = options.limit || null;
  const summary = {
    dryRun,
    scanned: 0,
    eligible: 0,
    skippedNotSelfStyled: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
  };

  const query = Outfit.find({
    $expr: { $eq: ['$owner', '$createdBy'] },
  })
    .select('_id owner createdBy styledForUserId name previewImage')
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  if (limit) {
    query.limit(limit);
  }

  const outfits = await query;

  for (const outfit of outfits) {
    summary.scanned += 1;

    if (!isSelfStyledOutfit(outfit)) {
      summary.skippedNotSelfStyled += 1;
      continue;
    }

    summary.eligible += 1;
    if (dryRun) continue;

    const result = await CommunityPost.updateOne(
      { sourceOutfitId: outfit._id },
      {
        $set: {
          author: outfit.owner,
          type: 'post',
          sourceType: 'outfit',
          sourceOutfitId: outfit._id,
          caption: buildCaption(outfit),
          imageUrl: outfit.previewImage || null,
          poll: { question: null, options: [], endsAt: null },
        },
        $setOnInsert: {
          tags: ['fit', 'styled-fit'],
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount > 0) {
      summary.created += 1;
    } else if (result.modifiedCount > 0) {
      summary.updated += 1;
    } else {
      summary.unchanged += 1;
    }
  }

  return summary;
};

const runCli = async () => {
  const options = parseCliOptions();
  await connectDB();
  const summary = await runBackfill(options);
  console.log('SELF_STYLED_COMMUNITY_BACKFILL_SUMMARY=' + JSON.stringify(summary));
  return summary;
};

if (require.main === module) {
  runCli()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('SELF_STYLED_COMMUNITY_BACKFILL_FAILED', error);
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        console.error('SELF_STYLED_COMMUNITY_BACKFILL_DISCONNECT_FAILED', disconnectError);
      }
      process.exit(1);
    });
}

module.exports = {
  parseCliOptions,
  runBackfill,
};
