// backend/routes/announcementsRoutes.js
import express from "express";
import dbConfig, { sqlLib as sql } from "../config/db.js";
import { verifyToken, requireRole } from "../middleware/verifyToken.js";

const router = express.Router();

// ------------------ Get all announcements ------------------
router.get("/", verifyToken, async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT AnnouncementID, Title, Message, CreatedBy, CreatedAt
      FROM Announcements
      ORDER BY CreatedAt DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("GET /api/announcements", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------ Create new announcement ------------------
router.post("/", verifyToken, requireRole(["admin"]), async (req, res) => {
  const { Title, Message } = req.body;
  if (!Title || !Message) {
    return res.status(400).json({ error: "Title and Message are required" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("Title", sql.NVarChar, Title)
      .input("Message", sql.NVarChar, Message)
      .input("CreatedBy", sql.NVarChar, req.user.email || req.user.Email)
      .query(`
        INSERT INTO Announcements (Title, Message, CreatedBy, CreatedAt)
        VALUES (@Title, @Message, @CreatedBy, GETDATE())
      `);

    res.json({ message: "Announcement created successfully" });
  } catch (err) {
    console.error("POST /api/announcements", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------ Delete announcement ------------------
router.delete("/:id", verifyToken, requireRole(["admin"]), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid announcement ID" });

  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("AnnouncementID", sql.Int, id)
      .query("DELETE FROM Announcements WHERE AnnouncementID = @AnnouncementID");

    res.json({ message: "Announcement deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/announcements/:id", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
