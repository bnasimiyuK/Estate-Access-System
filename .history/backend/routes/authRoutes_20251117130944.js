// backend/routes/authRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import { loginUser } from "../controllers/authController.js"; // <-- Import the controller

const router = express.Router();

// ===========================
// Middleware: Verify JWT Token
// ===========================
export function verifyToken(req, res, next) {
const authHeader = req.headers.authorization;
if (!authHeader) 
return res.status(401).json({ error: "Missing token" });

const token = authHeader.split(" ")[1];
try {
const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
req.user = decoded; // attach decoded token to request
next();} catch (err) {
 return res.status(401).json({ error: "Invalid token" }); }
}

// ===========================
// Middleware: Check Admin Role
// ===========================
export function isAdmin(req, res, next) {
// Check against the role name or roleId stored in the token payload
if (!req.user || req.user.role !== "Admin") {
return res.status(403).json({ error: "Admin access required" });
 }
next();
}

// ===========================
// Login Route (MOUNTED CONTROLLER)
// ===========================
router.post("/login", loginUser); 

export default router;