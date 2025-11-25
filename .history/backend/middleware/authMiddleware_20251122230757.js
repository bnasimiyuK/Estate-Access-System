import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/**
 * Generate JWT token
 */
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "14d" });
}

/**
 * JWT authentication middleware
 */
export function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user info to req.user
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
}

/**
 * Admin-only middleware
 */
export function isAdmin(req, res, next) {
    if (!req.user || (req.user.role || req.user.RoleName)?.toLowerCase() !== "admin") {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
}
