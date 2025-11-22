// backend/routes/authRoutes.js
import express from "express";
import { loginUser } from "../controllers/authController.js";
import { authenticateJWT, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ===========================
// LOGIN ROUTE
// ===========================
router.post("/login", loginUser);

// ===========================
// VALIDATE TOKEN TEST (Optional)
// ===========================
router.get("/validate", authenticateJWT, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ===========================
// ADMIN TEST ROUTE
// ===========================
router.get("/admin", authenticateJWT, isAdmin, (req, res) => {
    res.json({ message: "Welcome Admin", user: req.user });
});

export default router;
