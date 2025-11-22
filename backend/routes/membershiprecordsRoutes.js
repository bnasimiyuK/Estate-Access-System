// ==========================================
// backend/routes/membershiprecordsRoutes.js
// ==========================================
import express from "express";
import {
    syncMembershipRecords,
    getAllMembershipRecords, // Added from the second block
    getPendingRequests,     // 👈 ADDED (Used by the dashboard)
    getApprovedResidents,   // 👈 ADDED (Used by the dashboard)
    approveMembershipRecord,
    rejectMembershipRecord,
    deleteMembershipRecord,
} from "../controllers/membershiprecordsController.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- NEW DASHBOARD FETCH ROUTES ---

// Get pending membership requests (for top table)
router.get("/requests/pending", verifyToken, verifyAdmin, getPendingRequests); // 👈 NEW

// Get approved residents (for bottom table)
router.get("/residents/approved", verifyToken, verifyAdmin, getApprovedResidents); // 👈 NEW

// --- EXISTING ADMINISTRATIVE ROUTES ---

// Sync membership requests → records
router.post("/sync", verifyToken, verifyAdmin, syncMembershipRecords);

// Get all membership records (General Admin View)
router.get("/all", verifyToken, verifyAdmin, getAllMembershipRecords);

// Approve a membership record
router.put("/approve/:id", verifyToken, verifyAdmin, approveMembershipRecord);

// Reject a membership record
router.put("/reject/:id", verifyToken, verifyAdmin, rejectMembershipRecord);

// Delete a membership record
router.delete("/delete/:id", verifyToken, verifyAdmin, deleteMembershipRecord);

export default router;