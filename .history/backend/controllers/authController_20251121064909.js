// backend/controllers/authController.js

import sql from "mssql";
import bcrypt from "bcryptjs";
import { generateToken } from "../middleware/authMiddleware.js";
import { dbPool } from "../server.js";

/**
 * @desc Login user (Resident/Admin/Security) and issue JWT
 * @route POST /api/auth/login
 * @access Public
 */
export async function loginUser(req, res) {
    const { Email, Password } = req.body;

    if (!Email || !Password) {
        return res.status(400).json({ message: "Email and password required." });
    }

    try {
        // Use shared dbPool connection
        const pool = await dbPool;

        // Fetch user and role info
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
                    R.RoleName AS Role
                FROM Users U
                JOIN Roles R ON U.RoleID = R.RoleID
                WHERE U.Email = @Email
            `);

        const user = result.recordset[0];

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Compare password with stored hash
        const isPasswordValid = await bcrypt.compare(Password, user.PasswordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Incorrect password." });
        }

        // Prepare JWT payload
        const payload = {
            ResidentID: user.Role.toLowerCase() === "resident" ? user.UserID : null,
            userId: user.UserID, // Admin/Security
            NationalID: user.NationalID || null,
            email: user.Email,
            fullName: user.FullName,
            role: user.Role.toLowerCase(),
            roleId: Number(user.RoleID)
        };

        // Generate access token (use shared middleware function)
        const token = generateToken(payload);

        // Respond with token + user info
        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                userId: user.UserID,
                fullName: user.FullName,
                role: user.Role,
                roleId: Number(user.RoleID),
                email: user.Email,
                NationalID: user.NationalID,
                phone: user.PhoneNumber
            }
        });

    } catch (err) {
        console.error("❌ Login error:", err);
        res.status(500).json({ message: "Server error during login." });
    }
}
