import { asyncHandler } from "../utils/asyncHandler.js";
import {
  saveUserActivity,
  getActivityByDate,
  getPastWeekActivity,
} from "../services/activityService.js";
import { ApiResponse } from "../utils/apiResponse.js";

/**
    * Save daily activity for a user
*/
export const saveActivityController = asyncHandler(async (req, res) => {
    const { userId, targetCO2, savedCO2, steps, date } = req.body;

    if (!userId || targetCO2 === undefined || savedCO2 === undefined || steps === undefined) {
        return res.status(400).json({ status: "error", message: "Missing required fields!" });
    }

    const data = { targetCO2, savedCO2, steps };
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