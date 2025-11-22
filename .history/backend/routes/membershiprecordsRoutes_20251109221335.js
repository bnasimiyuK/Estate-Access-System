// ==========================================
// backend/routes/membershiprecordsRoutes.js
// ==========================================
import express from "express";
import {
  syncMembershipRecords,
  getAllMembershipRecords,
  approveMembershipRecord,
  rejectMembershipRecord,
  deleteMembershipRecord,
} from "../controllers/membershiprecordsController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔁 Sync membership requests → records
router.post("/sync", syncMembershipRecords);

// 📋 Get all membership records
router.get("/all", getAllMembershipRecords);

// ✅ Approve a membership record
router.put("/approve/:id", verifyToken, approveMembershipRecord);

// ❌ Reject a membership record
router.put("/reject/:id", verifyToken, rejectMembershipRecord);

// 🗑️ Delete a membership record
router.delete("/delete/:id", verifyToken, deleteMembershipRecord);

export default router;
