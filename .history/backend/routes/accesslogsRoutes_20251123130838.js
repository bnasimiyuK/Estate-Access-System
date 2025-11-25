import express from "express";
import { getaccesslogs, createaccesslog } from "../controllers/accesslogsController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js"; // if protected

const router = express.Router();

// Apply JWT auth if needed
router.use(authenticateJWT);

// GET all access logs
// Full URL: GET /api/accesslogs
router.get("/", getaccesslogs);

// POST a new access log
// Full URL: POST /api/accesslogs
router.post("/", createaccesslog);

export default router;
