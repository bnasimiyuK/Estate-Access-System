// residentsRoutes.js

import { Router } from "express";
import sql from "mssql";
import { authenticateJWT, requireAdmin } from "../middleware/authMiddleware.js";
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
// PROTECTED ROUTES (Residents)
// ================================

// Resident Profile
router.get("/profile", authenticateJWT, getResidentProfile);

// Visitor Access
router.get("/visitors", authenticateJWT, getVisitorsAccess);

// Membership Requests
router.get("/membership-requests", authenticateJWT, getMembershipRequests);

// Pay for service
router.post("/pay", authenticateJWT, payForService);

// Visitor Passes
router.get("/visitorsaccess", authenticateJWT, getVisitorPasses);

// ================================
// ADMIN ROUTES
// ================================

// Dashboard Summary
router.get("/dashboard/summary", authenticateJWT, requireAdmin, getDashboardSummary);

// Access Chart Data
router.get("/admin/accesschart", authenticateJWT, requireAdmin, getAccessChartData);

// All Residents
router.get("/all", authenticateJWT, requireAdmin, getAllResidents);

// Approved Residents
router.get("/approved", authenticateJWT, requireAdmin, getApprovedResidents);

// Sync Residents
router.post("/sync", authenticateJWT, requireAdmin, syncResidents);

// ================================
// PUBLIC ROUTES
// ================================

// Query Payment Status
router.get("/payment-status", loadPaymentStatus);

// ================================
// VERIFY PAYMENT (ADMIN ONLY)
// ================================
router.put("/payments/verify/:id", authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const pool = await dbPool;
        const { id } = req.params;

        // Update payment status
        await pool.request()
            .input("PaymentID", sql.Int, id)
            .query(`
                UPDATE PaymentHistory
                SET Status = 'Verified'
                WHERE PaymentID = @PaymentID
            `);

        // Insert into VerifiedPayments table
        await pool.request()
            .input("PaymentID", sql.Int, id)
            .query(`
                INSERT INTO VerifiedPayments (PaymentID, ResidentID, ResidentName, Amount, Reference, VerifiedDate)
                SELECT 
                    p.PaymentID, 
                    p.ResidentID, 
                    r.ResidentName, 
                    p.Amount, 
                    p.Reference, 
                    GETDATE()
                FROM PaymentHistory p
                LEFT JOIN Residents r ON r.ResidentID = p.ResidentID
                WHERE p.PaymentID = @PaymentID
            `);

        res.json({ message: "Payment verified successfully" });
    } catch (err) {
        console.error("Payment verification error:", err);
        res.status(500).json({ message: "Error verifying payment" });
    }
});

export default router;
