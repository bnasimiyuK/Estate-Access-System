// routes/membershipRoutes.js
import express from "express";
import { 
    submitMembershipRequest, 
    approveMembershipRequest, 
    rejectMembershipRequest,
    getMembershipRequests,
    getMembershipCount
} from "../controllers/membershipController.js"; 

const router = express.Router();
router.get("/count", getMembershipCount);
// ======================================
// PUBLIC ROUTE
// ======================================
// POST /api/membership/request - Submit a new membership request
router.post("/request", submitMembershipRequest);

// ======================================
// ADMIN / PROTECTED ROUTES
// ======================================
// GET /api/membership - Fetch all membership records
router.get("/", getMembershipRequests);

// PUT /api/membership/approve/:RequestID - Approve a membership request
router.put("/approve/:RequestID", approveMembershipRequest);

// PUT /api/membership/reject/:RequestID - Reject a membership request
router.put("/reject/:RequestID", rejectMembershipRequest);

export default router;
