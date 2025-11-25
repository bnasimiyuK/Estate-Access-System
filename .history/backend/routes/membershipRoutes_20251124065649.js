// membershipRoutes.js
import express from "express";
import { 
    submitMembershipRequest, 
    approveMembershipRequest, 
    rejectMembershipRequest,
    getMembershipRequests,
    getCourtList,
    getMembershipCount
} from "../controllers/membershipController.js"; 

import { authenticateJWT, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ======================================
// PUBLIC ROUTES (No JWT required)
// ======================================

// POST /api/membership/request - Submit a new membership request
router.post("/request", submitMembershipRequest);

// GET /api/membership/count - Get total approved membership count
router.get("/count", getMembershipCount);

// GET /api/membership/courts - Get the list of courts for the public form
router.get("/courts", getCourtList); // <-- Must be BEFORE JWT middleware

// ======================================
// PROTECTED ADMIN ROUTES (JWT + Admin)
// ======================================

// Apply JWT authentication and admin check for all routes below
router.use(authenticateJWT);
router.use(isAdmin);

// GET /api/membership - Fetch all membership requests
router.get("/", getMembershipRequests);

// Approve a membership request
router.put("/approve/:RequestID", approveMembershipRequest);
router.post("/approve/:RequestID", approveMembershipRequest); // POST version

// Reject a membership request
router.put("/reject/:RequestID", rejectMembershipRequest);
router.post("/reject/:RequestID", rejectMembershipRequest); // POST version

export default router;
