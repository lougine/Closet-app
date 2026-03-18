const mongoose = require('mongoose');

const pollOptionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    votes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { _id: false }
);

const communityPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['post', 'poll'],
      default: 'post',
      index: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    imageUrl: {
      type: String,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    poll: {
      question: {
        type: String,
        trim: true,
        maxlength: 180,
        default: null,
      },
      options: {
        type: [pollOptionSchema],
        default: [],
      },
      endsAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
);

communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
