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
// PUBLIC ROUTES
// ======================================

// POST /api/membership/request - Submit membership request
router.post("/request", submitMembershipRequest);

// GET /api/membership/count - Get total membership requests
router.get("/count", getMembershipCount);

// GET /api/membership/courts - Get the list of courts for the public form (MUST BE PUBLIC)
router.get("/courts", getCourtList); // <-- CORRECTLY PLACED BEFORE MIDDLEWARE

// ======================================
// PROTECTED ADMIN ROUTES
// ======================================

// Everything below requires JWT + Admin
router.use(authenticateJWT);
router.use(isAdmin);

// GET /api/membership - Fetch all membership records
router.get("/", getMembershipRequests);

// PUT /api/membership/approve/:RequestID
router.put("/approve/:RequestID", approveMembershipRequest);

// POST /api/membership/approve/:RequestID  <-- Add POST version
router.post("/approve/:RequestID", approveMembershipRequest);

// PUT /api/membership/reject/:RequestID
router.put("/reject/:RequestID", rejectMembershipRequest);

// POST /api/membership/reject/:RequestID  <-- Add POST version
router.post("/reject/:RequestID", rejectMembershipRequest);

export default router;