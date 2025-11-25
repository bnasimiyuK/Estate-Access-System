// backend/routes/accessLogsRoutes.js
import express from "express";
import { getAccessLogs, createAccessLog } from "../controllers/accessLogsController.js";

const router = express.Router();

// GET logs (filter optional)
router.get("/", getAccessLogs);

// POST new log
router.post("/", createAccessLog);

export default router;
