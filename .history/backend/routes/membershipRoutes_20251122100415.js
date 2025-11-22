// routes/membershipRoutes.js
import express from "express";
import { 
    submitMembershipRequest, 
    approveMembershipRequest, 
    rejectMembershipRequest,
    getMembershipRequests
} from "../controllers/membershipController.js"; 
import { dbPool } from "../server.js"; // needed for direct DB calls if used

const router = express.Router();

// ======================================
// PUBLIC ROUTE
// ======================================

// POST /api/membership/request - Submit a new request
router.post("/request", async (req, res) => {
  try {
    const { ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName } = req.body;

    // Validate input
    if (!ResidentName || !NationalID || !PhoneNumber || !Email || !HouseNumber || !CourtName || !RoleName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const pool = await dbPool;

    await pool.request()
      .input("ResidentName", ResidentName)
      .input("NationalID", NationalID)
      .input("PhoneNumber", PhoneNumber)
      .input("Email", Email)
      .input("HouseNumber", HouseNumber)
      .input("CourtName", CourtName)
      .input("RoleName", RoleName)
      .query(`
        INSERT INTO MembershipRequests
        (ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RequestedAt)
        VALUES
        (@ResidentName, @NationalID, @PhoneNumber, @Email, @HouseNumber, @CourtName, @RoleName, 'Pending', GETDATE())
      `);

    res.status(201).json({ message: "Membership request submitted successfully" });
  } catch (err) {
    console.error("Error creating membership request:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ======================================
// ADMIN/PROTECTED ROUTES
// ======================================

// GET /api/membership - Retrieve all requests
router.get("/", getMembershipRequests); 

// PUT /api/membership/approve/:RequestID - Approve a request
router.put("/approve/:RequestID", approveMembershipRequest); 

// PUT /api/membership/reject/:RequestID - Reject a request
router.put("/reject/:RequestID", rejectMembershipRequest); 

export default router;
