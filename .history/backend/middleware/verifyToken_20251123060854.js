// backend/middleware/authenticateJWT.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/**
 * JWT Authentication Middleware
 * Verifies the token and attaches decoded user info to req.user
 * Handles preflight OPTIONS requests gracefully for CORS
 */
export const authenticateJWT = (req, res, next) => {
  // 1️⃣ Allow OPTIONS requests to pass through (CORS preflight)
  if (req.method === "OPTIONS") {
    return next();
  }

  // 2️⃣ Check for Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  // 3️⃣ Extract token
  const token = authHeader.split(" ")[1];

  // 4️⃣ Verify token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("❌ Token verification failed:", err.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    // 5️⃣ Attach decoded user info to request
    req.user = {
      userId: decoded.userId || null,
      ResidentID: decoded.ResidentID || null,
      role: (decoded.role || "resident").toLowerCase(),
      fullName: decoded.fullName || "",
      email: decoded.email || "",
      NationalID: decoded.NationalID || "",
      roleId: decoded.roleId || null,
    };

    next();
  });
};
