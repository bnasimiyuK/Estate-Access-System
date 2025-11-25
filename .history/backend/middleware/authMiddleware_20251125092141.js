// ===============================================
// authMiddleware.js (IMPROVED STATUS CODES)
// ===============================================

import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Generate JWT token
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "14d" });
}

// Verify JWT middleware
export function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        // Use 401 for an invalid/expired token
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

// Admin-only middleware
export function isAdmin(req, res, next) {
    // Standardized check for role
    const role = (req.user && (req.user.role || req.user.RoleName) || "").toLowerCase();
    
    if (role !== "admin") 
        // Use 403 Forbidden for insufficient permissions
        return res.status(403).json({ message: "Access denied. Admins only." });
    
    next();
}

// Role-based authorization
export function authorizeRole(allowedRoles = []) {
    return (req, res, next) => {
        const userRole = (req.user && req.user.role || "").toLowerCase();
        const allowed = allowedRoles.map(r => r.toLowerCase());
        
        if (!allowed.includes(userRole)) {
            return res.status(403).json({ message: `Access denied. Role '${userRole}' not allowed.` });
        }
        next();
    };
}