// backend/routes/accessLogsRoutes.js
import express from "express";
import { getaccesslogs, createAccessLog } from "../controllers/accessLogsController.js";

const router = express.Router();

// GET logs (filter optional)
router.get("/", getaccesslogs);

// POST new log
router.post("/", createAccessLog);

export default router;
