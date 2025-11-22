// backend/controllers/authController.js
import sql from "mssql";
import bcrypt from "bcryptjs";
import { generateToken } from "../middleware/authMiddleware.js";
import { dbPool } from "../config/dbPool.js";

/**
 * POST /api/auth/login
 * Body: { Email, Password }
 * Response: { message, accessToken, fullName, email, role, roleId, phone, NationalID, userId }
 */
export async function loginUser(req, res) {
  const { Email, Password } = req.body;

  if (!Email || !Password) {
    return res.status(400).json({ message: "Email and password required." });
  }

  try {
    const pool = await dbPool;

    const result = await pool.request()
      .input("Email", sql.NVarChar, Email)
      .query(`
        SELECT TOP 1
          U.UserID,
          U.Email,
          U.PasswordHash,
          U.FullName,
          U.RoleID,
          U.NationalID,
          U.PhoneNumber,
          R.RoleName AS RoleName
        FROM Users U
        JOIN Roles R ON U.RoleID = R.RoleID
        WHERE U.Email = @Email;
      `);

    const user = result.recordset[0];

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isPasswordValid = await bcrypt.compare(Password, user.PasswordHash || "");
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    const roleNormalized = (user.RoleName || "resident").toLowerCase();

    const payload = {
      userId: user.UserID,
      ResidentID: roleNormalized === "resident" ? user.UserID : null,
      email: user.Email,
      fullName: user.FullName,
      NationalID: user.NationalID || null,
      role: roleNormalized,
      roleId: Number(user.RoleID),
    };

    const accessToken = generateToken(payload);

    return res.status(200).json({
      message: "Login successful",
      accessToken,                  // frontend expects this
      fullName: user.FullName,
      email: user.Email,
      role: roleNormalized,         // always lowercase
      roleId: Number(user.RoleID),
      phone: user.PhoneNumber,
      NationalID: user.NationalID,
      userId: user.UserID,
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "Server error during login." });
  }
}
