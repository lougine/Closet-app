const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'styled_outfit_shared', 
        'new_post',            
        'new_follower',        
        'like',                 
        'comment',              
      ],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 280,
    },
    outfit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outfit',
      default: null,
    },
    communityPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityPost',
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);