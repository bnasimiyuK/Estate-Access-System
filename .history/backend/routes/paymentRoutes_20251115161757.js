// backend/routes/paymentsRoutes.js
import express from "express";
import {
  getPayments,
  getVerifiedPayments,
  getBalances,
  makePayment,
  verifyPayment
} from "../controllers/paymentsController.js";

import { verifyToken } from "../middleware/verifyToken.js";
import { getPool } from "../db.js"; // assuming you have a db.js exporting getPool

const router = express.Router();

// ------------------ Payments ------------------

// Get all payments
router.get("/", verifyToken, getPayments);

// Get verified payments
router.get("/verified", verifyToken, getVerifiedPayments);

// Get balances
router.get("/balances", verifyToken, getBalances);

// Make payment
router.post("/make", verifyToken, makePayment);

// Verify payment (admin only)
router.put("/verify/:id", verifyToken, verifyPayment);

// ------------------ Payment Reports / Summaries ------------------

// Monthly summary (bar/line chart)
router.get("/summary/monthly", verifyToken, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        DATENAME(MONTH, PaymentDate) AS MonthName,
        SUM(Amount) AS TotalAmount
      FROM Payments
      GROUP BY DATENAME(MONTH, PaymentDate), MONTH(PaymentDate)
      ORDER BY MONTH(PaymentDate)
    `);

    res.json({
      labels: result.recordset.map(r => r.MonthName),
      totals: result.recordset.map(r => r.TotalAmount)
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
      SELECT Method, COUNT(*) AS Count
      FROM Payments
      GROUP BY Method
    `);

    res.json({
      labels: result.recordset.map(r => r.Method),
      counts: result.recordset.map(r => r.Count)
    });
  } catch (err) {
    console.error("Payment method summary error:", err);
    res.status(500).json({ message: "Failed to load method summary" });
  }
});

// Recent payments
router.get("/recent", verifyToken, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT TOP(${limit})
        PaymentID,
        ResidentName,
        Amount,
        Method,
        PaymentDate,
        Reference
      FROM Payments
      ORDER BY PaymentDate DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Recent payments error:", err);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

export default router;
