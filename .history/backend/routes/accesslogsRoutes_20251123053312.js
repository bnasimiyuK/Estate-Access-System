// backend/routes/accessLogsRoutes.js
import express from "express";
import { getaccesslogs, createaccessLog } from "../controllers/accessLogsController.js";

const router = express.Router();

// GET logs (filter optional)
router.get("/", getaccesslogs);

// POST new log
router.post("/", createaccessLog);

export default router;
