// backend/routes/eventsRoutes.js
import express from "express";
import dbConfig, { sqlLib as sql } from "../config/db.js";
import { verifyToken, requireRole } from "../middleware/verifyToken.js";

const router = express.Router();

// GET /api/events - any authenticated user
router.get("/", verifyToken, async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT EventID, Title, Description, EventDate, Venue, CreatedBy, CreatedAt FROM Events ORDER BY EventDate DESC");
    res.json(result.recordset);
  } catch (err) {
    console.error("GET /api/events", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/events - admin only
router.post("/", verifyToken, requireRole(["admin"]), async (req, res) => {
  const { Title, Description, EventDate, Venue } = req.body;
  if (!Title || !EventDate) return res.status(400).json({ error: "Title and EventDate required" });
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("Title", sql.NVarChar, Title)
      .input("Description", sql.NVarChar, Description || null)
      .input("EventDate", sql.DateTime, EventDate)
      .input("Venue", sql.NVarChar, Venue || null)
      .input("CreatedBy", sql.NVarChar, req.user.email || req.user.Email)
      .query("INSERT INTO Events (Title, Description, EventDate, Venue, CreatedBy) VALUES (@Title, @Description, @EventDate, @Venue, @CreatedBy)");
    res.json({ message: "Event created" });
  } catch (err) {
    console.error("POST /api/events", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/events/:id - admin only
router.delete("/:id", verifyToken, requireRole(["admin"]), async (req, res) => {
  const id = Number(req.params.id);
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request().input("EventID", sql.Int, id).query("DELETE FROM Events WHERE EventID=@EventID");
    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("DELETE /api/events/:id", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
