// backend/middleware/authenticateJWT.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const authenticateJWT = (req, res, next) => {
  if (req.method === "OPTIONS") return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: "Invalid or expired token" });

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

export default authenticateJWT;
