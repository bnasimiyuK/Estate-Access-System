import jwt from "jsonwebtoken";

/**
 * JWT Authentication Middleware
 */
export function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach token payload to req.user
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
}

/**
 * Admin-only middleware
 */
export function adminOnly(req, res, next) {
    if (!req.user || req.user.RoleName !== "Admin") {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
}
