// backend/routes/refreshToken.js
import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// ✅ POST /api/refresh
router.post("/refresh", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);

    // Issue new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // short lifespan for access tokens
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("❌ Refresh error:", err);
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
});

export default router;
