// backend/middleware/authenticateJWT.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export const authenticateJWT = (req, res, next) => {
    // 1. Check for Preflight Request and let it proceed
    if (req.method === 'OPTIONS') {
        return next(); // Allows the request to hit the CORS middleware below
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        // 2. IMPORTANT: Do NOT redirect. Send a 401 response instead.
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("Token verification failed:", err.message);
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }

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
