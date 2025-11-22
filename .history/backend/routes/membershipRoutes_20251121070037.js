// ==========================================
// backend/routes/membershipRoutes.js
// ==========================================
import express from "express";
import { authenticateJWT, isAdmin } from "../middleware/authMiddleware.js";

import {
    submitMembershipRequest,
    getAllMembershipRequests,
    approveMembershipRequest,
    rejectMembershipRequest,
    deleteMembershipRequest,
    getAllMembershipRecords,
    syncMembershipRecords,
    getLatestMembershipRequest
} from "../controllers/membershipController.js";

const router = express.Router();

// =======================================================
// RESIDENT ROUTE — Submit membership request
// =======================================================
router.post("/request", authenticateJWT, submitMembershipRequest);

// =======================================================
// ADMIN ROUTES (Protected by requireAdmin)
// =======================================================

// Get all membership requests
router.get("/all", authenticateJWT, requireAdmin, getAllMembershipRequests);

// Approve membership request
router.patch("/approve/:RequestID", authenticateJWT, requireAdmin, approveMembershipRequest);

// Reject membership request
router.patch("/reject/:RequestID", authenticateJWT, requireAdmin, rejectMembershipRequest);

// Delete a membership request
router.delete("/delete/:RequestID", authenticateJWT, requireAdmin, deleteMembershipRequest);

// View synced membership records
router.get("/records", authenticateJWT, requireAdmin, getAllMembershipRecords);

// Latest membership request details
router.get("/latest", authenticateJWT, requireAdmin, getLatestMembershipRequest);

// Sync membership records from external systems
router.post("/sync", authenticateJWT, requireAdmin, syncMembershipRecords);

export default router;
