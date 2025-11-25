// backend/controllers/accessLogsController.js
import { dbPool } from "../server.js";
import sql from "mssql";

// GET /api/access/logs
export const getAccessLogs = async (req, res) => {
  try {
    const pool = await dbPool;

    const result = await pool.request().query(`
      SELECT 
        id,
        timestamp,
        userId,
        action,
        resource,
        ipAddress,
        userAgent,
        logType
      FROM access_logs
      ORDER BY timestamp DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("FAILED TO LOAD ACCESS LOGS:", err);
    res.status(500).json({ message: "Server error loading logs" });
  }
};
