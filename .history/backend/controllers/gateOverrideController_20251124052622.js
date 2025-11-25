// controllers/gateOverridesController.js
import sql from "mssql";
import { dbPool } from "../server.js";

export async function getGateOverrides(req, res) {
    try {
        const result = await dbPool
            .request()
            .query(`
                SELECT 
                    id,
                    gateId,
                    action,
                    reason,
                    userId,
                    createdAt
                FROM GateOverrides
                ORDER BY createdAt DESC
            `);

        return res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error fetching gate overrides:", error);
        return res.status(500).json({ message: "Server error fetching gate overrides" });
    }
}
