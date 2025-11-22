// routes/membershipRoutes.js
import express from "express";
import { 
    submitMembershipRequest, 
    approveMembershipRequest, 
    rejectMembershipRequest,
    getMembershipRequests
} from "../controllers/membershipController.js"; 

const router = express.Router();

// ======================================
// PUBLIC ROUTE
// ======================================

// POST /api/membership - Submit a new request
router.post("/", submitMembershipRequest);

// ======================================
// ADMIN/PROTECTED ROUTES (You may need to add middleware like verifyToken here)
// ======================================

// GET /api/membership - Retrieve all requests
router.get("/", getMembershipRequests); 

// PUT /api/membership/approve/:RequestID - Approve a request
router.put("/approve/:RequestID", approveMembershipRequest); 

// PUT /api/membership/reject/:RequestID - Reject a request
router.put("/reject/:RequestID", rejectMembershipRequest); 

// DELETE is often avoided for requests but can be added if needed:
// router.delete("/:RequestID", deleteMembershipRequest); 

export default router;