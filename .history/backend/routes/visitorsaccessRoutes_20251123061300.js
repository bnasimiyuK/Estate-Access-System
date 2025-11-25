// backend/routes/visitorsaccessRoutes.js
import express from "express";
import { authenticateJWT, authorizeRole } from "../middleware/authMiddleware.js";
import { getVisitorRequests } from "../controllers/visitorController.js";
import { getPool, sql } from "../db.js";
import dbConfig from "../config/db.js";

const router = express.Router();

/* ===============================
   GET all visitors (Admin only)
=============================== */
router.get("/", authenticateJWT, authorizeRole(["admin"]), async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .query("SELECT * FROM Visitors ORDER BY Date DESC");
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ GET /visitors error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   GET own visitors (Resident)
=============================== */
router.get("/my", authenticateJWT, authorizeRole(["resident"]), async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("ResidentId", sql.Int, req.user.userId)
      .query("SELECT * FROM Visitors WHERE ResidentId=@ResidentId ORDER BY Date DESC");
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ GET /visitors/my error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   CREATE visitor (Resident)
=============================== */
router.post("/", authenticateJWT, authorizeRole(["resident"]), async (req, res) => {
  const { VisitorName, Date } = req.body;

  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("VisitorName", sql.VarChar, VisitorName)
      .input("Date", sql.Date, Date)
      .input("ResidentId", sql.Int, req.user.userId)
      .query(`INSERT INTO Visitors (VisitorName, Date, ResidentId, Status) 
              VALUES (@VisitorName, @Date, @ResidentId, 'Pending')`);
    res.json({ message: "Visitor request submitted." });
  } catch (err) {
    console.error("❌ POST /visitors error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   APPROVE visitor (Admin/Security)
=============================== */
router.put("/:id/approve", authenticateJWT, authorizeRole(["admin","security"]), async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("VisitorId", sql.Int, req.params.id)
      .query("UPDATE Visitors SET Status='Approved' WHERE VisitorId=@VisitorId");
    res.json({ message: "Visitor approved." });
  } catch (err) {
    console.error("❌ APPROVE visitor error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   REJECT visitor (Admin/Security)
=============================== */
router.put("/:id/reject", authenticateJWT, authorizeRole(["admin","security"]), async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("VisitorId", sql.Int, req.params.id)
      .query("UPDATE Visitors SET Status='Rejected' WHERE VisitorId=@VisitorId");
    res.json({ message: "Visitor rejected." });
  } catch (err) {
    console.error("❌ REJECT visitor error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   GET pending visitors (Admin only)
=============================== */
router.get("/pending", authenticateJWT, authorizeRole(["admin"]), async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .query("SELECT * FROM Visitors WHERE Status='Pending' ORDER BY Date DESC");
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ GET /visitors/pending error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   Visitor Check-In (Security/Admin)
=============================== */
router.post("/checkin", authenticateJWT, authorizeRole(["security","admin"]), async (req,res)=>{
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    const pool = await getPool();
    await pool.request()
      .input("code", sql.NVarChar(50), code)
      .query("UPDATE visitor_passes SET status='checked-in', checkInTime=GETDATE() WHERE passCode=@code");
    res.json({ message: `Visitor ${code} checked in` });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   Visitor Check-Out (Security/Admin)
=============================== */
router.post("/checkout", authenticateJWT, authorizeRole(["security","admin"]), async (req,res)=>{
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    const pool = await getPool();
    await pool.request()
      .input("code", sql.NVarChar(50), code)
      .query("UPDATE visitor_passes SET status='checked-out', checkOutTime=GETDATE() WHERE passCode=@code");
    res.json({ message: `Visitor ${code} checked out` });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   L2 Pending Approvals (Security/Admin)
=============================== */
router.get("/l2/pending", authenticateJWT, authorizeRole(["admin","security"]), async (req,res)=>{
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query("SELECT * FROM visitor_passes WHERE l2Approved IS NULL");
    res.json(result.recordset);
  } catch(err){
    console.error("❌ GET /visitors/l2/pending error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   L2 Approve / Reject (Security/Admin)
=============================== */
router.post("/approve-l2", authenticateJWT, authorizeRole(["admin","security"]), async (req,res)=>{
  const { code, approve } = req.body;
  if (!code || typeof approve !== "boolean") return res.status(400).json({ error: "Missing code or approve status" });

  try {
    const pool = await getPool();
    await pool.request()
      .input("code", sql.NVarChar(50), code)
      .input("approve", sql.Bit, approve)
      .query("UPDATE visitor_passes SET l2Approved=@approve WHERE passCode=@code");
    res.json({ message: `Visitor ${code} L2 approval set to ${approve}` });
  } catch(err){
    console.error("❌ POST /visitors/approve-l2 error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   Visitor Requests (Admin/Security)
=============================== */
router.get("/requests", authenticateJWT, authorizeRole(["admin","security"]), getVisitorRequests);

export default router;
