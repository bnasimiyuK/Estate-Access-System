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
router.post("/request", submitMembershipRequest);

// ======================================
// ADMIN/PROTECTED ROUTES
// ======================================
router.get("/", getMembershipRequests); 
router.put("/approve/:RequestID", approveMembershipRequest); 
router.put("/reject/:RequestID", rejectMembershipRequest); 

export default router;
