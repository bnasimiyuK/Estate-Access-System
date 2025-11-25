// residentsRoutes.js
import { Router } from "express";
import sql from "mssql";
import { authenticateJWT, isAdmin } from "../middleware/authMiddleware.js";
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
    // getAccessChartData, // Uncomment if implemented
    getVisitorPasses,
    getResidentIDs
} from "../controllers/residentsController.js";
import { dbPool } from "../server.js";

const router = Router();

// ------------------------ RESIDENT IDS ------------------------
router.get("/ids", getResidentIDs);

/* ============================================
   RESIDENT ROUTES (Protected)
============================================ */

// Get logged-in resident profile
router.get("/profile", authenticateJWT, getResidentProfile);

// Get visitor access log for one resident
router.get("/visitors", authenticateJWT, getVisitorsAccess);

// Get membership requests for this resident
router.get("/membership-requests", authenticateJWT, getMembershipRequests);

// Process payment (M-Pesa)
router.post("/pay", authenticateJWT, payForService);

// Dashboard visitor passes
router.get("/visitorsaccess", authenticateJWT, getVisitorPasses);


/* ============================================
   ADMIN ROUTES (Protected: Admin Only)
============================================ */

// Dashboard summary widgets
router.get("/dashboard/summary", authenticateJWT, isAdmin, getDashboardSummary);

// Dashboard access chart (optional - uncomment if implemented)
router.get("/dashboard/accesschart", authenticateJWT, isAdmin, getAccessChartData);

// Fetch all residents
router.get("/all", authenticateJWT, isAdmin, getAllResidents);

// Fetch only approved residents
router.get("/approved", authenticateJWT, isAdmin, getApprovedResidents);

// Sync local resident DB with cloud/external system
router.post("/sync", authenticateJWT, isAdmin, syncResidents);


/* ============================================
   PUBLIC ROUTES
============================================ */

// Payment status query (does NOT require token)
router.get("/payment-status", loadPaymentStatus);


/* ============================================
   ADMIN PAYMENT VERIFICATION (Protected)
============================================ */
router.put("/payments/verify/:id", authenticateJWT, isAdmin, async (req, res) => {
    const { id } = req.params;
    const pool = await dbPool;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        // 1️⃣ Update payment status
        await request.input("PaymentID", sql.Int, id)
                     .query(`UPDATE PaymentHistory SET Status = 'Verified' WHERE PaymentID = @PaymentID`);

        // 2️⃣ Insert into VerifiedPayments
        await request.input("PaymentID", sql.Int, id)
                     .query(`
                        INSERT INTO VerifiedPayments
                        (PaymentID, ResidentID, ResidentName, Amount, Reference, VerifiedDate)
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

        await transaction.commit();
        res.json({ message: "Payment verified successfully" });

    } catch (err) {
        await transaction.rollback();
        console.error("Payment verification error:", err);
        res.status(500).json({ message: "Error verifying payment" });
    }
});

export default router;
