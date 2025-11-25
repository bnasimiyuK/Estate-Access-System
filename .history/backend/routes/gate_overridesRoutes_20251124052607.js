// routes/gateOverridesRoutes.js
import express from "express";
import { getGateOverrides } from "../controllers/gateOverridesController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = express.Router();

// PROTECTED ROUTE
router.get("/", authenticateJWT, getGateOverrides);

export default router;
