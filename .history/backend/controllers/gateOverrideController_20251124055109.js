// backend/controllers/gateOverrideController.js
import { dbPool } from "../server.js"; // your MSSQL connection pool

// Fetch the last 1000 gate override logs
export async function getGateOverrideLogs(req, res) {
    try {
        const result = await dbPool.request().query(`
            SELECT TOP (1000) 
                [id],
                [gateId],
                [action],
                [reason],
                [userId],
                [createdAt]
            FROM [EstateAccessManagementSystem].[dbo].[gate_overrides]
            ORDER BY createdAt DESC
        `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Error fetching gate override logs:", err.message);
        res.status(500).json({ message: "Failed to retrieve gate override logs", error: err.message });
    }
}

// Perform a manual gate override (OPEN or CLOSE)
export async function performManualOverride(req, res) {
    const { gateId, action, reason, userId } = req.body;

    if (!gateId || !action || !userId) {
        return res.status(400).json({ message: "gateId, action, and userId are required" });
    }

    try {
        await dbPool.request()
            .input("gateId", gateId)
            .input("action", action)
            .input("reason", reason || '')
            .input("userId", userId)
            .query(`
                INSERT INTO [EstateAccessManagementSystem].[dbo].[gate_overrides] 
                (gateId, action, reason, userId, createdAt)
                VALUES (@gateId, @action, @reason, @userId, GETDATE())
            `);

        res.status(200).json({ message: `Gate ${gateId} manually ${action}ed successfully.` });
    } catch (err) {
        console.error("Error performing manual override:", err.message);
        res.status(500).json({ message: "Failed to perform manual override", error: err.message });
    }
}
