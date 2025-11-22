import express from "express";
import {
 getPayments,
 getVerifiedPayments,
 getBalances,
 makePayment,
 verifyPayment,
 getPaymentSummary
} from "../controllers/paymentsController.js";
import { dbPool } from "../server.js"; // Import dbPool directly from server
import { verifyToken } from "../middleware/authMiddleware.js"; // Use common middleware import

const router = express.Router();

// Helper to get pool (replaces getPool() from assumed db.js)
const getPool = () => dbPool; 

// ------------------ Payments ------------------

// Get all payments (Admin & Resident specific)
router.get("/", verifyToken, getPayments);

// Get verified payments (Admin & Resident specific)
router.get("/verified", verifyToken, getVerifiedPayments);

// Get balances (Admin & Resident specific)
router.get("/balances", verifyToken, getBalances);

// Make payment
router.post("/make", verifyToken, makePayment);

// Verify payment (admin only)
router.put("/verify/:id", verifyToken, verifyPayment);

// ------------------ Payment Reports / Summaries ------------------

// Get payment summary for dashboard
router.get("/summary", verifyToken, getPaymentSummary);

// Monthly summary (bar/line chart)
router.get("/summary/monthly", verifyToken, async (req, res) => {
 try {
  const pool = await getPool();

  const result = await pool.request().query(`
   SELECT 
    FORMAT(PaymentDate, 'yyyy-MM') AS PaymentMonth,
    DATENAME(MONTH, PaymentDate) AS MonthName,
    ISNULL(SUM(Amount), 0) AS TotalAmount
   FROM Payments
   WHERE Status = 'Verified' -- Only count verified payments
   GROUP BY FORMAT(PaymentDate, 'yyyy-MM'), DATENAME(MONTH, PaymentDate)
   ORDER BY PaymentMonth;
  `);

  res.json({
   labels: result.recordset.map(r => r.MonthName),
   totals: result.recordset.map(r => parseFloat(r.TotalAmount))
  });
 } catch (err) {
  console.error("Monthly summary error:", err);
  res.status(500).json({ message: "Failed to load monthly summary" });
 }
});

// Payment method distribution (donut chart)
router.get("/summary/methods", verifyToken, async (req, res) => {
 try {
  const pool = await getPool();

  const result = await pool.request().query(`
   SELECT PaymentMethod, COUNT(*) AS Count
   FROM Payments
   WHERE Status = 'Verified' -- Only count verified payments
   GROUP BY PaymentMethod
  `);

  res.json({
   labels: result.recordset.map(r => r.PaymentMethod),
   counts: result.recordset.map(r => parseInt(r.Count))
  });
 } catch (err) {
  console.error("Payment method summary error:", err);
  res.status(500).json({ message: "Failed to load method summary" });
 }
});

// Recent payments
router.get("/recent", verifyToken, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const pool = await getPool();
  
    // NOTE: Assuming the Payments table joins to Residents to get the name
    const result = await pool.request().query(`
      SELECT TOP(${limit})
        p.PaymentID,
        r.ResidentName,
        p.Amount,
        p.PaymentMethod,
        p.PaymentDate,
        p.Reference,
                p.Status
      FROM Payments p
      JOIN Residents r ON p.ResidentID = r.ResidentID
      ORDER BY p.PaymentDate DESC
    `);
  
    res.json(result.recordset);
  } catch (err) {
    console.error("Recent payments error:", err);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

export default router;