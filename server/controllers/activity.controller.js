import { asyncHandler } from "../utils/asyncHandler.js";
import {
  saveUserActivity,
  getActivityByDate,
  getPastWeekActivity,
} from "../services/activityMongoService.js";
import {
  updateMonthlySummary,
  getCurrentMonthlySummary,
  getMonthlySummary
} from "../services/activityMongoService.js";
import { ApiResponse } from "../utils/apiResponse.js";
import dayjs from 'dayjs';

/**
    * Save daily activity for a user
*/
export const saveActivityController = asyncHandler(async (req, res) => {
    const { userId, savedCO2, steps, drivenKm, date } = req.body;

    if (!userId || savedCO2 === undefined || steps === undefined) {
        return res.status(400).json({ status: "error", message: "Missing required fields!" });
    }

    const data = { savedCO2, steps, drivenKm: drivenKm || 0 };
    const result = await saveUserActivity(userId, data, date);

    res.status(200).json(new ApiResponse(200, {
        status: "success",
        message: "Activity saved",
        result
    }, "Activity saved successfully!"));
});

/**
    * Get activity for a specific date
*/
export const getActivityController = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { date } = req.query;

    if (!userId || !date) {
        return res.status(400).json({ status: "error", message: "Missing userId or date!" });
    }

    const activity = await getActivityByDate(userId, date);
    if (!activity) {
        return res.status(404).json({ status: "error", message: "No data found for this date!" });
    }

    res.status(200).json(new ApiResponse(200, {
        status: "success",
        data: activity
    }, "Activity data retrieved successfully!"));
});

/**
    * Get past 7 days activity data
*/
export const getPastWeekActivityController = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ status: "error", message: "UserId is missing!" });
    }

    const activityData = await getPastWeekActivity(userId);
    res.status(200).json(new ApiResponse(200, {
        status: "success",
        data: activityData
    }, "Past week activity data retrieved successfully!"));
});

/**
 * Update monthly summary (called at midnight from Flutter app)
 */
export const updateMonthlySummaryController = asyncHandler(async (req, res) => {
    const { userId, month, steps, drivenKm, savedCO2, date } = req.body;

    if (!userId || !month) {
        return res.status(400).json({ status: "error", message: "Missing userId or month!" });
    }

    const dailyData = { steps: steps || 0, drivenKm: drivenKm || 0, savedCO2: savedCO2 || 0 };
    const summary = await updateMonthlySummary(userId, month, dailyData, date || null);

    res.status(200).json(new ApiResponse(200, {
        status: "success",
        data: summary
    }, "Monthly summary updated successfully!"));
});

/**
 * Get current month's summary
 */
export const getCurrentMonthlySummaryController = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ status: "error", message: "UserId is missing!" });
    }

    const summary = await getCurrentMonthlySummary(userId);

    res.status(200).json(new ApiResponse(200, {
        status: "success",
        data: summary || null
    }, summary ? "Monthly summary retrieved successfully!" : "No data for current month"));
});

/**
 * Get monthly summary for a specific month
 */
export const getMonthlySummaryController = asyncHandler(async (req, res) => {
    const { userId, month } = req.params;

    if (!userId || !month) {
        return res.status(400).json({ status: "error", message: "Missing userId or month!" });
    }

    const summary = await getMonthlySummary(userId, month);

    res.status(200).json(new ApiResponse(200, {
        status: "success",
        data: summary || null
    }, summary ? "Monthly summary retrieved successfully!" : "No data for this month"));
});