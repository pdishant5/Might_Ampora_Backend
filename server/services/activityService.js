import redis from "../config/redis.js";
import dayjs from "dayjs";
import { getPast7Days } from "../utils/dateUtils.js";

/**
    * Save or update a user's daily activity for the given date
*/
export async function saveUserActivity(userId, data, date = null) {
    const activityDate = date || dayjs().format("YYYY-MM-DD");
    const key = `user:${userId}:activity:${activityDate}`;

    // Save the new activity (overwrite if exists)
    await redis.set(key, JSON.stringify(data));
    console.log(`✅ Activity saved for ${userId} on ${activityDate}`);

    // Maintain only last 7 days of activity
    await cleanupOldActivity(userId);

    return { key, ...data };
}

/**
 * Delete data older than the last 7 days for a user
 */
async function cleanupOldActivity(userId) {
    // Get all keys for this user
    const keys = await redis.keys(`user:${userId}:activity:*`);
    if (keys.length <= 7) return; // nothing to delete

    // Extract date part from key and sort ascending
    const sortedKeys = keys.sort((a, b) => {
        const dateA = a.split(":").pop();
        const dateB = b.split(":").pop();
        return new Date(dateA) - new Date(dateB);
    });

    // Keep only latest 7, delete older ones
    const keysToDelete = sortedKeys.slice(0, sortedKeys.length - 7);

    if (keysToDelete.length > 0) {
        await redis.del(keysToDelete);
        console.log(`🗑️ Deleted old activity data for ${userId}:`, keysToDelete);
    }
}

/**
    * Get activity data for a specific date
*/
export async function getActivityByDate(userId, date) {
    const key = `user:${userId}:activity:${date}`;
    const result = await redis.get(key);
    return result ? JSON.parse(result) : null;
};

/**
    * Get past 7 days (today + 6 days before) activity data
*/
export async function getPastWeekActivity(userId) {
    const dates = getPast7Days();
    const keys = dates.map((date) => `user:${userId}:activity:${date}`);
    const results = await Promise.all(
        keys.map(async (key) => {
            const value = await redis.get(key);
            return value ? JSON.parse(value) : null;
        })
    );

    const activityData = dates.map((date, idx) => ({
        date,
        ...(results[idx] || { targetCO2: 0, savedCO2: 0, steps: 0 }),
    }));

    return activityData;
};