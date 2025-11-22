// backend/middleware/verifyToken.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const verifyToken = (req, res, next) => {
  try {
    // 1️⃣ Get token from Authorization header
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "No token provided." });
    }

    // 2️⃣ Check format "Bearer <token>"
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ success: false, message: "Invalid token format." });
    }

    const token = parts[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Token missing." });
    }

    // 3️⃣ Verify token
    const secret = process.env.JWT_SECRET || "supersecretkey";

    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        console.error("Token verification failed:", err.message);
        return res.status(401).json({ success: false, message: "Invalid or expired token." });
      }

      // 4️⃣ Attach user info safely
      req.user = {
        ResidentID: decoded.ResidentID || decoded.userId || null,
        role: decoded.role ? decoded.role.toLowerCase() : "resident",
        fullName: decoded.fullName || "",
        email: decoded.email || "",
        NationalID: decoded.NationalID || ""
      };

      // ✅ Continue to the next middleware/route
      next();
    });

  } catch (error) {
    console.error("Error in verifyToken middleware:", error);
    return res.status(500).json({ success: false, message: "Server error in token verification." });
  }
};
