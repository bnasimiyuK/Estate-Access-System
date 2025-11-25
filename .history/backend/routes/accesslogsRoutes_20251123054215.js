import express from "express";
import { getaccesslogs, createaccesslog } from "../controllers/accesslogsController.js";

const router = express.Router();

// GET all accesslogs
router.get("/", getaccesslogs);

// POST a new accesslog
router.post("/", createaccesslog);

export default router;
