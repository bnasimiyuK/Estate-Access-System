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
// ADMIN ROUTES (Protected by isAdmin)
// =======================================================

// Get all membership requests
router.get("/all", authenticateJWT, isAdmin, getAllMembershipRequests);

// Approve membership request
router.patch("/approve/:RequestID", authenticateJWT, isAdmin, approveMembershipRequest);

// Reject membership request
router.patch("/reject/:RequestID", authenticateJWT, isAdmin, rejectMembershipRequest);

// Delete a membership request
router.delete("/delete/:RequestID", authenticateJWT, isAdmin, deleteMembershipRequest);

// View synced membership records
router.get("/records", authenticateJWT, isAdmin, getAllMembershipRecords);

// Latest membership request details
router.get("/latest", authenticateJWT, isAdmin, getLatestMembershipRequest);

// Sync membership records from external systems
router.post("/sync", authenticateJWT, isAdmin, syncMembershipRecords);

export default router;
