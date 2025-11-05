import Router from "express";
import {
  saveActivityController,
  getActivityController,
  getPastWeekActivityController,
} from "../controllers/activity.controller.js";

const router = Router();

router.post("/save", saveActivityController); // save/update daily data
router.get("/:userId", getActivityController); // get by date (query param)
router.get("/:userId/past-week", getPastWeekActivityController); // get past 7 days

export default router;