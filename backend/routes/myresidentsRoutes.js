// ==========================================
// backend/routes/residentsRoutes.js
// ==========================================
import express from "express";
import sql from "mssql";
import dbConfig from "../config/dbConfig.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// ==========================================
// ✅ GET all residents (API: /api/residents/all)
// ==========================================
router.get("/all", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT 
        ResidentID, UserID, ResidentName, NationalID, PhoneNumber, Email, 
        HouseNumber, CourtName, Occupation, DateJoined, Status, RoleName
      FROM Residents
      ORDER BY ResidentID DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching residents:", err);
    res.status(500).json({ message: "Failed to fetch residents" });
  }
});

// ==========================================
// ✅ POST /sync
// Sync approved MembershipRequests → Residents → Users
// ==========================================
router.post("/sync", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);

    // -----------------------------
    // Step 1: Sync approved MembershipRequests → Residents
    // -----------------------------
    const syncResidentsQuery = `
      INSERT INTO Residents (
        UserID, ResidentName, NationalID, HouseNumber, Occupation, 
        DateJoined, Status, PhoneNumber, Email, CourtName, RoleName
      )
      SELECT 
        NULL AS UserID,
        m.ResidentName,
        m.NationalID,
        m.HouseNumber,
        'N/A' AS Occupation,
        GETDATE() AS DateJoined,
        'Approved' AS Status,
        m.PhoneNumber,
        m.Email,
        m.CourtName,
        r.RoleName
      FROM MembershipRequests m
      JOIN Roles r ON m.RoleName = r.RoleID
      WHERE m.Status = 'Approved'
        AND NOT EXISTS (
          SELECT 1 FROM Residents rs WHERE rs.NationalID = m.NationalID
        )
    `;

    const residentsResult = await pool.request().query(syncResidentsQuery);

    // -----------------------------
    // Step 2: Sync approved Residents → Users
    // -----------------------------
    const defaultPassword = "defaultpassword";
    const defaultHash = bcrypt.hashSync(defaultPassword, 10);

    const syncUsersQuery = `
      INSERT INTO Users (
        Username, PasswordHash, RoleID, Status, Email, NationalID, FullName, PhoneNumber
      )
      SELECT 
        r.Email AS Username,
        @DefaultPasswordHash AS PasswordHash,
        ro.RoleID,
        'Active' AS Status,
        r.Email,
        r.NationalID,
        r.ResidentName AS FullName,
        r.PhoneNumber
      FROM Residents r
      JOIN Roles ro ON ro.RoleName = r.RoleName
      WHERE r.Status = 'Approved'
        AND NOT EXISTS (
          SELECT 1 FROM Users u WHERE u.NationalID = r.NationalID
        )
    `;

    const usersResult = await pool.request()
      .input("DefaultPasswordHash", sql.VarChar, defaultHash)
      .query(syncUsersQuery);

    res.json({
      success: true,
      message: "Residents synced successfully to both Residents and Users tables",
      residentsAdded: residentsResult.rowsAffected[0],
      usersAdded: usersResult.rowsAffected[0],
    });

  } catch (err) {
    console.error("❌ Sync error:", err);
    res.status(500).json({ success: false, message: "Failed to sync residents" });
  }
});

export default router;
