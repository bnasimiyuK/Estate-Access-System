// gateOverridesRoutes.js
import express from "express";
import { authenticateJWT, isAdmin } from "../middleware/authMiddleware.js";
import {
    getGateOverrideLogs,
    performManualOverride
} from "../controllers/gateOverrideController.js";

const router = express.Router();

// ================================
// GET: All gate override logs
// Access: JWT + Admin only
// Endpoint: GET /api/admin/override/logs
// ================================
router.get("/logs", authenticateJWT, isAdmin, getGateOverrideLogs);

// ================================
// POST: Perform a manual gate override
// Access: JWT + Admin only
// Endpoint: POST /api/admin/override/action
// Body: { gateId, action, reason, userId }
// ================================
router.post("/action", authenticateJWT, isAdmin, performManualOverride);

export default router;
