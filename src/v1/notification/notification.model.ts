import mongoose, { Schema } from 'mongoose';

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['FRIEND_EVENT'],
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
