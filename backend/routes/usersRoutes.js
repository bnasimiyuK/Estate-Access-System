// backend/routes/usersRoutes.js
import express from "express";
import dbConfig, { sqlLib as sql } from "../config/db.js";
import bcrypt from "bcryptjs";
import { verifyToken, requireRole } from "../middleware/verifyToken.js";

const router = express.Router();

// GET /api/users - list all users (admin)
router.get("/", verifyToken, requireRole(["admin"]), async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT UserID, Username, FullName, Email, PhoneNumber, RoleID, Status FROM Users ORDER BY FullName");
    res.json(result.recordset);
  } catch (err) {
    console.error("GET /api/users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/users - create user (admin)
router.post("/", verifyToken, requireRole(["admin"]), async (req, res) => {
  const { Username, FullName, Email, PhoneNumber, RoleID = 2, Status = "Active", Password } = req.body;
  if (!Email || !Password) return res.status(400).json({ error: "Email and Password required" });
  try {
    const pool = await sql.connect(dbConfig);
    // Hash password
    const hash = await bcrypt.hash(Password, 10);
    const result = await pool.request()
      .input("Username", sql.NVarChar, Username || Email.split("@")[0])
      .input("PasswordHash", sql.NVarChar, hash)
      .input("RoleID", sql.Int, RoleID)
      .input("Status", sql.NVarChar, Status)
      .input("Email", sql.NVarChar, Email)
      .input("FullName", sql.NVarChar, FullName || "")
      .input("PhoneNumber", sql.NVarChar, PhoneNumber || "")
      .query(`INSERT INTO Users (Username, PasswordHash, RoleID, Status, Email, FullName, PhoneNumber)
              VALUES (@Username, @PasswordHash, @RoleID, @Status, @Email, @FullName, @PhoneNumber);
              SELECT SCOPE_IDENTITY() AS id;`);
    res.json({ message: "User created", id: result.recordset?.[0]?.id });
  } catch (err) {
    console.error("POST /api/users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/users/:id - update user (admin)
router.put("/:id", verifyToken, requireRole(["admin"]), async (req, res) => {
  const id = Number(req.params.id);
  const { Username, FullName, Email, PhoneNumber, RoleID, Status, Password } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    let setClause = "Username=@Username, FullName=@FullName, Email=@Email, PhoneNumber=@PhoneNumber, RoleID=@RoleID, Status=@Status";
    let reqQ = pool.request()
      .input("Username", sql.NVarChar, Username || "")
      .input("FullName", sql.NVarChar, FullName || "")
      .input("Email", sql.NVarChar, Email || "")
      .input("PhoneNumber", sql.NVarChar, PhoneNumber || "")
      .input("RoleID", sql.Int, RoleID || 2)
      .input("Status", sql.NVarChar, Status || "Active")
      .input("UserID", sql.Int, id);

    if (Password) {
      const hash = await bcrypt.hash(Password, 10);
      setClause = "PasswordHash=@PasswordHash, " + setClause;
      reqQ.input("PasswordHash", sql.NVarChar, hash);
    }

    await reqQ.query(`UPDATE Users SET ${setClause} WHERE UserID=@UserID`);
    res.json({ message: "User updated" });
  } catch (err) {
    console.error("PUT /api/users/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/users/:id - delete user (admin)
router.delete("/:id", verifyToken, requireRole(["admin"]), async (req, res) => {
  const id = Number(req.params.id);
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request().input("UserID", sql.Int, id).query("DELETE FROM Users WHERE UserID=@UserID");
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("DELETE /api/users/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
