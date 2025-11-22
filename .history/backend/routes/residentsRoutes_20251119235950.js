// residentsRoutes.js

import { Router } from "express";
import sql from "mssql";
import { authenticateJWT, requireAdmin, verifyToken } from "../middleware/authMiddleware.js";
import {
    getResidentProfile,
    getAllResidents,
    getVisitorsAccess,
    getMembershipRequests,
    getApprovedResidents,
    loadPaymentStatus,
    payForService,
    syncResidents,
    getDashboardSummary,
    getAccessChartData,
    getVisitorPasses
} from "../controllers/residentsController.js";
import { dbPool } from "../server.js";

const router = Router();

// ================================
// PROTECTED ROUTES (Requires authenticateJWT)
// ================================

// GET: Resident Profile (for the logged-in user)
router.get("/profile", authenticateJWT, getResidentProfile);

// GET: Visitor Access (for the logged-in user)
router.get("/visitors", authenticateJWT, getVisitorsAccess);

// GET: Membership Requests (filtered by user's NationalID)
router.get("/membership-requests", authenticateJWT, getMembershipRequests);

// POST: Pay for Service
router.post("/pay", authenticateJWT, payForService);

// GET: Visitor Passes (Dashboard Overview)
router.get("/visitorsaccess", authenticateJWT, getVisitorPasses);

// ================================
// ADMIN ROUTES (Requires authenticateJWT AND requireAdmin)
// ================================

// GET: Dashboard Summary Data
router.get("/dashboard/summary", authenticateJWT, requireAdmin, getDashboardSummary);

// GET: Access Chart Data
router.get("/admin/accesschart", authenticateJWT, requireAdmin, getAccessChartData);

// GET: All Residents
router.get("/all", authenticateJWT, requireAdmin, getAllResidents);

// GET: Approved Residents
router.get("/approved", authenticateJWT, requireAdmin, getApprovedResidents);

// POST: Sync Residents
router.post("/sync", authenticateJWT, requireAdmin, syncResidents);

// ================================
// UNPROTECTED / QUERY ROUTES
// ================================

// GET: Payment Status (Query-based, uses phone number)
router.get("/payment-status", loadPaymentStatus);

// ================================
// VERIFY PAYMENT ROUTE
// ================================
router.put("/payments/verify/:id", verifyToken, async (req, res) => {
    try {
        const pool = await dbPool;
        const { id } = req.params;

        // Update PaymentHistory status
        await pool.request()
            .input("PaymentID", sql.Int, id)
            .query(`UPDATE PaymentHistory SET Status='Verified' WHERE PaymentID=@PaymentID`);

        // Insert into VerifiedPayments with Resident info
        await pool.request()
            .input("PaymentID", sql.Int, id)
            .query(`
                INSERT INTO VerifiedPayments (PaymentID, ResidentID, ResidentName, Amount, Reference, VerifiedDate)
                SELECT p.PaymentID, p.ResidentID, r.ResidentName, p.Amount, p.Reference, GETDATE()
                FROM PaymentHistory p
                LEFT JOIN Residents r ON r.ResidentID = p.ResidentID
                WHERE p.PaymentID = @PaymentID
            `);

        res.json({ message: "Payment verified successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error verifying payment" });
    }
});

export default router;
