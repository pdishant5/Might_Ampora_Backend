import redis from "../config/redis.js";
import dayjs from "dayjs";
import { getPast7Days } from "../utils/dateUtils.js";

/**
 * Save or update a user's daily activity for the given date
 */
export async function saveUserActivity(userId, data, date = null) {
    const activityDate = date || dayjs().format("YYYY-MM-DD");
    const key = `user:${userId}:activity:${activityDate}`;

    // --- FIX 1 ---
    // @upstash/redis automatically stringifies JSON objects.
    // Removing JSON.stringify() fixes the bug where your 'get'
    // commands would return a string instead of an object.
    await redis.set(key, data);
    console.log(`✅ Activity saved for ${userId} on ${activityDate}`);

    // Maintain only last 7 days of activity
    await cleanupOldActivity(userId);

    return { key, ...data };
}

/**
 * Delete data older than the last 7 days for a user
 */
async function cleanupOldActivity(userId) {
    // --- PERFORMANCE WARNING ---
    // `KEYS` is a blocking command and should NOT be used in production
    // with large datasets.
    // A better approach is using `redis.scan` or maintaining a
    // separate sorted set (ZSET) of activity dates to find old ones.
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
        // --- FIX 2 ---
        // `redis.del` expects keys as separate arguments, not an array.
        // We use the spread operator (...) to pass the array elements.
        await redis.del(...keysToDelete);
        console.log(`🗑️ Deleted old activity data for ${userId}:`, keysToDelete);
    }
}

/**
 * Get activity data for a specific date
 */
export async function getActivityByDate(userId, date) {
    const key = `user:${userId}:activity:${date}`;
    // This will now correctly return an object (or null) because
    // we removed JSON.stringify() in saveUserActivity.
    const result = await redis.get(key);
    return result ? result : null;
};

/**
 * Get past 7 days (today + 6 days before) activity data
 */
export async function getPastWeekActivity(userId) {
    const dates = getPast7Days();
    const keys = dates.map((date) => `user:${userId}:activity:${date}`);

    // --- FIX 3 ---
    // Using Promise.all(...) makes one request per key. This is slow.
    // Using a pipeline is much more efficient as it bundles
    // all commands into a single network request.
    const pipeline = redis.pipeline();
    keys.forEach(key => {
        pipeline.get(key);
    });
    const results = await pipeline.exec();

    // `results` is now an array of all the values, e.g.,
    // [ {data for day 1}, null, {data for day 3}, ... ]

    const activityData = dates.map((date, idx) => ({
        date,
        // The rest of your logic works perfectly now because
        // results[idx] is an object (or null) as expected.
        ...(results[idx] || { targetCO2: 0, savedCO2: 0, steps: 0 }),
    }));

    return activityData;
};