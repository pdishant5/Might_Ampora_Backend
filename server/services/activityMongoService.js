import DailyActivity from '../models/dailyActivity.model.js';
import MonthlySummary from '../models/monthlySummary.model.js';
import dayjs from 'dayjs';

/**
 * Save or update daily activity for a user
 * @param {string} userId - User ID
 * @param {object} data - Activity data (steps, drivenKm, savedCO2)
 * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
 */
export async function saveUserActivity(userId, data, date = null) {
  const activityDate = date || dayjs().format('YYYY-MM-DD');
  
  // Upsert (update if exists, create if not)
  const activity = await DailyActivity.findOneAndUpdate(
    { userId, date: activityDate },
    { 
      ...data,
      expiresAt: new Date(new Date(activityDate).getTime() + 7 * 24 * 60 * 60 * 1000)
    },
    { upsert: true, new: true }
  );

  console.log(`✅ Activity saved for ${userId} on ${activityDate}`);
  return activity;
}

/**
 * Get activity for a specific date
 * @param {string} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 */
export async function getActivityByDate(userId, date) {
  const activity = await DailyActivity.findOne({ userId, date });
  return activity;
}

/**
 * Get past 7 days of activity (including today)
 * @param {string} userId - User ID
 */
export async function getPastWeekActivity(userId) {
  const today = dayjs();
  const sevenDaysAgo = today.subtract(6, 'day').format('YYYY-MM-DD');
  
  const activities = await DailyActivity.find({
    userId,
    date: { $gte: sevenDaysAgo }
  })
  .sort({ date: -1 })
  .limit(7);

  return activities;
}

/**
 * Update monthly summary (called at midnight)
 * @param {string} userId - User ID
 * @param {string} month - Month in YYYY-MM format
 * @param {object} dailyData - Daily activity data to add to monthly totals
 */
export async function updateMonthlySummary(userId, month, dailyData) {
  const { steps = 0, drivenKm = 0, savedCO2 = 0 } = dailyData;

  const summary = await MonthlySummary.findOneAndUpdate(
    { userId, month },
    {
      $inc: {
        totalSteps: steps,
        totalDrivenKm: drivenKm,
        totalSavedCO2: savedCO2,
        daysTracked: 1
      },
      $set: { updatedAt: new Date() }
    },
    { upsert: true, new: true }
  );

  console.log(`📊 Monthly summary updated for ${userId} - ${month}`);
  return summary;
}

/**
 * Get current month's summary
 * @param {string} userId - User ID
 */
export async function getCurrentMonthlySummary(userId) {
  const currentMonth = dayjs().format('YYYY-MM');
  
  const summary = await MonthlySummary.findOne({ userId, month: currentMonth });
  return summary;
}

/**
 * Get monthly summary for a specific month
 * @param {string} userId - User ID
 * @param {string} month - Month in YYYY-MM format
 */
export async function getMonthlySummary(userId, month) {
  const summary = await MonthlySummary.findOne({ userId, month });
  return summary;
}

/**
 * Reset monthly summary (called on 1st of new month)
 * @param {string} userId - User ID
 * @param {string} newMonth - New month in YYYY-MM format
 */
export async function resetMonthlySummary(userId, newMonth) {
  const summary = await MonthlySummary.create({
    userId,
    month: newMonth,
    totalSteps: 0,
    totalDrivenKm: 0,
    totalSavedCO2: 0,
    daysTracked: 0
  });

  console.log(`🔄 New monthly summary created for ${userId} - ${newMonth}`);
  return summary;
}
