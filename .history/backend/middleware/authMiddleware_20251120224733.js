import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/**
 * Generates a JWT token for the provided payload.
 */
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "14d" });
}

/**
 * Middleware to verify the JWT from the Authorization header and attach user data to req.user.
 */
export const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: "No token provided." });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({ success: false, message: "Invalid token format." });
    }

    const token = parts[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error("Token verification failed:", err.message);
            return res.status(401).json({ success: false, message: "Invalid or expired token." });
        }

        /**
         * Attach user info:
         * - Residents have ResidentID
         * - Admin/Security have userId
         * - role is always lowercase for middleware checks
         */
        req.user = {
            ResidentID: decoded.ResidentID || null,
            userId: decoded.userId || null,       // admin/security ID
            role: (decoded.role || "resident").toLowerCase(),
            fullName: decoded.fullName || "",
            email: decoded.email || "",
            NationalID: decoded.NationalID || ""
        };

        next();
    });
};

/**
 * Middleware to restrict access to users with the 'admin' role.
 */
export const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.role) {
        return res.status(401).json({ error: "Access denied. Role information missing." });
    }
const role = req.user.role;
    if (role !== 'admin' && role !=='security') {
        return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    next();
};
export const verifyAdmin = (req, res, next) => {
    // 1. Assume verifyToken has already run and attached req.user
    if (!req.user || req.user.role !== 'Admin') {
        // This sends the 403 status expected by the client.
        return res.status(403).json({ success: false, message: "Forbidden: Admin privileges required." });
    }
    next();
};
// Alias for routes
export const verifyToken = authenticateJWT;
