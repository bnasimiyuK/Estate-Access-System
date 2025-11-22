// backend/controllers/authController.js

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sql from "mssql";

// Database configuration (NOTE: Replace with actual database connection logic)
const dbConfig = {
user: process.env.DB_USER || "Beverly",
password: process.env.DB_PASSWORD || "Bev@1234567",
server: process.env.DB_SERVER || "localhost",
database: process.env.DB_NAME || "EstateAccessManagementSystem",
options: { encrypt: false, trustServerCertificate: true },
};

// 🟩 LOGIN USER — Full Execution Flow
export const loginUser = async (req, res) => {
try {
// STEP 1: Receive login credentials
const { Email, Password } = req.body;
if (!Email || !Password) {
return res.status(400).json({ message: "Email and Password are required." });
}

// STEP 2: Connect to SQL Server
const pool = await sql.connect(dbConfig);

// STEP 3: Fetch user details
const result = await pool.request()
.input("Email", sql.NVarChar, Email)
.query(`
SELECT 
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

// STEP 4: Verify if user exists
if (!user) {
return res.status(401).json({ message: "Invalid username or password." });
}

// STEP 5: Compare entered password with stored hash
const isPasswordValid = await bcrypt.compare(Password, user.PasswordHash);
if (!isPasswordValid) {
return res.status(401).json({ message: "Invalid username or password." });
}

// STEP 6: Prepare JWT Payload
const payload = {
    // Only include ResidentID for residents
    ResidentID: user.Role.toLowerCase() === "resident" ? user.UserID : null,
    // Include generic userId for admins/security
    userId: user.UserID,
    NationalID: user.NationalID || null,
    email: user.Email,
    fullName: user.FullName,
    role: user.Role.toLowerCase(), // ensure lowercase
    roleId: Number(user.RoleID),
};


// STEP 7: Generate Access and Refresh Tokens
const accessToken = jwt.sign(payload, process.env.JWT_SECRET || "supersecretkey", { expiresIn: "7d" });
const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET || "refreshsupersecret", { expiresIn: "14d" });

// STEP 8: Send successful response
return res.status(200).json({
message: "Login successful",
accessToken,
refreshToken,
fullName: user.FullName,
role: user.Role,
roleId: Number(user.RoleID),
userId: user.UserID,
phone: user.PhoneNumber
});

} catch (err) {
console.error("❌ Login error:", err);
return res.status(500).json({ message: "Server error during login." });
}
};