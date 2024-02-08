import mongoose, { Schema } from 'mongoose';

const notificationSchema = new mongoose.Schema({
  for: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['FRIEND_EVENT', 'ORGANISED_EVENT', 'PROPOSAL_STATUS', 'PLAY_STATUS', 'INVITATION'],
  },
  metaData: Schema.Types.Mixed,
  status: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
