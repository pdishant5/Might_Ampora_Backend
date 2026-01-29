import mongoose from 'mongoose';

const monthlySummarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String, // 'YYYY-MM' format
    required: true
  },
  totalSteps: {
    type: Number,
    default: 0
  },
  totalDrivenKm: {
    type: Number,
    default: 0
  },
  totalSavedCO2: {
    type: Number,
    default: 0
  },
  daysTracked: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days (3 months) from now
  }
});

// Indexes
monthlySummarySchema.index({ userId: 1, month: -1 }, { unique: true }); // One entry per user per month
monthlySummarySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index - auto-delete after 3 months

export default mongoose.model('MonthlySummary', monthlySummarySchema);
