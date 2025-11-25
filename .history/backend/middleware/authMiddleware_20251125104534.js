// ===============================================
// authMiddleware.js (FINAL RECOMMENDED VERSION)
// ===============================================

import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// Ensure this secret is complex and configured in your .env file
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// --- JWT Generation ---

/**
 * Generates a JSON Web Token (JWT).
 * @param {object} payload - The data to encode in the token (must include 'role').
 */
export function generateToken(payload) {
    // You should ensure the payload passed here consistently uses a key like 'role'
    // e.g., { userId: 1, role: 'admin', fullName: '...' }
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "14d" });
}

// --- Verification Middleware ---

/**
 * Middleware to verify a JWT provided in the Authorization header.
 * Attaches decoded user data to req.user.
 */
export function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    
    // 401 Unauthorized: No token provided or malformed header
    if (!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Attaching decoded user data to req.user
        req.user = decoded; 
        next();
    } catch (err) {
        // 401 Unauthorized: Token is invalid (signature failed) or expired
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

// --- Authorization Middleware ---

/**
 * Middleware to restrict access to Admin users only.
 */
export function isAdmin(req, res, next) {
    // Standardized check for role, defensive against null/undefined req.user
    const role = (req.user && (req.user.role || req.user.RoleName) || "").toLowerCase();
    
    // 403 Forbidden: Authenticated user lacks necessary permissions
    if (role !== "admin") 
        return res.status(403).json({ message: "Access denied. Admins only." });
    
    next();
}

/**
 * Middleware to restrict access based on an array of allowed roles.
 * @param {string[]} allowedRoles - An array of role strings (e.g., ['resident', 'admin']).
 */
export function authorizeRole(allowedRoles = []) {
    return (req, res, next) => {
        const userRole = (req.user && (req.user.role || req.user.RoleName) || "").toLowerCase();
        const allowed = allowedRoles.map(r => r.toLowerCase());
        
        if (!allowed.includes(userRole)) {
            // 403 Forbidden: Authenticated user lacks necessary permissions
            return res.status(403).json({ message: `Access denied. Role '${userRole}' not allowed.` });
        }
        next();
    };
}