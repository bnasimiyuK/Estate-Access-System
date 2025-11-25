// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/**
 * Generate JWT token
 * @param {Object} payload - user info to encode in the token
 * @returns {string} JWT token
 */
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "14d" });
}

/**
 * JWT authentication middleware
 * Verifies token and attaches decoded payload to req.user
 */
export function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // attach user info to req.user
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
}

/**
 * Admin-only middleware
 * Only allows users with role 'admin'
 */
export function isAdmin(req, res, next) {
    if (!req.user || (req.user.role || req.user.RoleName)?.toLowerCase() !== "admin") {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
}

/**
 * Role-based authorization middleware
 * Usage: authorizeRole(['admin', 'security'])
 * @param {Array<string>} allowedRoles - roles allowed to access route
 */
export function authorizeRole(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: "Access denied. No role found." });
        }

        const userRole = req.user.role.toLowerCase();
        const allowed = allowedRoles.map(r => r.toLowerCase());

        if (!allowed.includes(userRole)) {
            return res.status(403).json({ message: `Access denied. Role '${userRole}' not allowed.` });
        }

        next();
    };
}
