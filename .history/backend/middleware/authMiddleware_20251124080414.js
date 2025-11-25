// backend/middleware/authenticateJWT.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const authenticateJWT = (req, res, next) => {
    // 1. Handle pre-flight requests
    if (req.method === "OPTIONS") {
        return next();
    }

    const authHeader = req.headers.authorization;

    // 2. Check for token presence and format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "No token provided or invalid format" });
    }

    const token = authHeader.split(" ")[1];

    try {
        // 3. Synchronous verification for immediate error catching
        const decoded = jwt.verify(token, JWT_SECRET);

        // 4. Attach decoded payload to req.user with defensive assignment
        req.user = {
            userId: decoded.userId || null,
            ResidentID: decoded.ResidentID || null,
            // Ensure a role is always present and lowercase
            role: (decoded.role || "resident").toLowerCase(), 
            fullName: decoded.fullName || "",
            email: decoded.email || "",
            NationalID: decoded.NationalID || "",
            roleId: decoded.roleId || null,
        };

        // 5. Continue to the next middleware/route handler
        next();
        
    } catch (err) {
        // Handle token errors (expired, invalid signature, malformed)
        console.error("JWT Verification Error:", err.message);
        return res.status(401).json({ 
            success: false, 
            message: "Invalid or expired token",
            errorType: err.name // Added for better debugging
        });
    }
};

export default authenticateJWT;