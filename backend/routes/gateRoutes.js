import express from "express";
import { authenticateJWT, authorizeRole } from "../middleware/authMiddleware.js";
import { getPool, sql } from "../db.js";

const router = express.Router();

// Only security and admin may override
router.post(
  "/override",
  authenticateJWT,
  authorizeRole(["admin", "security"]),
  async (req, res) => {
    const { action, gateId, reason } = req.body;
    if (!action || !gateId || !reason) {
      return res
        .status(400)
        .json({ message: "action, gateId, reason required" });
    }

    try {
      const pool = await getPool();
      // Insert override record
      await pool
        .request()
        .input("action", sql.NVarChar(50), action)
        .input("gateId", sql.NVarChar(50), gateId)
        .input("reason", sql.NVarChar(500), reason)
        .input("userId", sql.Int, req.user.id)
        .query(
          "INSERT INTO gate_overrides (gateId, action, reason, userId, createdAt) VALUES (@gateId,@action,@reason,@userId,GETDATE())"
        );

      // Optionally: send command to hardware controller here (MQTT / HTTP / GPIO)
      res.json({
        success: true,
        message: "Override recorded and command sent to gate (simulated)",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
