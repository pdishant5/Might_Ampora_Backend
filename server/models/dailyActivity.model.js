import mongoose from 'mongoose';

const dailyActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // 'YYYY-MM-DD' format
    required: true
  },
  steps: {
    type: Number,
    default: 0
  },
  drivenKm: {
    type: Number,
    default: 0
  },
  savedCO2: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }
});

// Indexes
dailyActivitySchema.index({ userId: 1, date: -1 });
dailyActivitySchema.index({ userId: 1, date: 1 }, { unique: true }); // One entry per user per day
dailyActivitySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index - auto-delete after 7 days

export default mongoose.model('DailyActivity', dailyActivitySchema);
