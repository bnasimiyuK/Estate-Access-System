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

/* ============================================================
   PUBLIC ROUTES (No JWT required)
   These are used by the frontend public membership form
============================================================ */

// Submit a new membership request
// POST /api/membership/request
router.post("/request", submitMembershipRequest);

// Get total approved membership count
// GET /api/membership/count
router.get("/count", getMembershipCount);

// Get courts for dropdown
// GET /api/membership/courts
router.get("/courts", getCourtList);


/* ============================================================
   ADMIN ROUTES (JWT Protected + Must be Admin)
============================================================ */

router.use(authenticateJWT);
router.use(isAdmin);

// Fetch ALL membership requests (pending + approved + rejected)
// GET /api/membership
router.get("/", getMembershipRequests);

// Approve a membership request
// PUT /api/membership/approve/:RequestID
router.put("/approve/:RequestID", approveMembershipRequest);

// Reject a membership request
// PUT /api/membership/reject/:RequestID
router.put("/reject/:RequestID", rejectMembershipRequest);

export default router;
