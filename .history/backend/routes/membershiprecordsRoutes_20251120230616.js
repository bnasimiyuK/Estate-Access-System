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
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔁 Sync membership requests → records
router.post("/sync", verifyToken, verifyAdmin, syncMembershipRecords);

// 📋 Get all membership records
router.get("/all", getAllMembershipRecords);

// ✅ Approve a membership record
router.put("/approve/:id", verifyToken, verifyAdmin, approveMembershipRecord);

// ❌ Reject a membership record
router.put("/reject/:id", verifyToken, verifyAdmin, rejectMembershipRecord);

// 🗑️ Delete a membership record
router.delete("/delete/:id", verifyToken, verifyAdmin, deleteMembershipRecord);

export default router;
