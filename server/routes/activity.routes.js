import Router from "express";
import {
  saveActivityController,
  getActivityController,
  getPastWeekActivityController,
  updateMonthlySummaryController,
  getCurrentMonthlySummaryController,
  getMonthlySummaryController,
} from "../controllers/activity.controller.js";

const router = Router();

// Daily activity routes
router.post("/save", saveActivityController); // save/update daily data
router.get("/:userId", getActivityController); // get by date (query param)
router.get("/:userId/past-week", getPastWeekActivityController); // get past 7 days

// Monthly summary routes
router.post("/monthly/update", updateMonthlySummaryController); // update monthly summary (midnight call)
router.get("/:userId/monthly/current", getCurrentMonthlySummaryController); // get current month summary
router.get("/:userId/monthly/:month", getMonthlySummaryController); // get specific month summary (YYYY-MM)

export default router;