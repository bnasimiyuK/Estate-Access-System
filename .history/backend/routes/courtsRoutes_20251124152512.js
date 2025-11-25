// routes/courts.js
import { Router } from "express";
import { authenticateJWT } from "../middleware/authMiddleware.js";
import { getCourtList } from "../server.js";

const router = Router();

// Use ONLY ONE route → clean + correct
router.get("/courts", authenticateJWT, getCourtList);

export default router;
