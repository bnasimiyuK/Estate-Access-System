import sql from "mssql";
import { dbPool } from "../server.js"; // your dbPool from server.js

// Get all accesslogs
export async function getaccesslogs(req, res) {
    try {
        const pool = await dbPool;
        const result = await pool.request()
            .query(`SELECT TOP (1000) 
                        [Id],
                        [TimestampUtc],
                        [UserId],
                        [Action],
                        [Resource],
                        [IpAddress],
                        [UserAgent],
                        [Referrer],
                        [Metadata],
                        [LogType]
                    FROM [EstateAccessManagementSystem].[dbo].[accesslogs]
                    ORDER BY [TimestampUtc] DESC`);

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Accesslogs Error:", err);
        res.status(500).json({ message: "Failed to fetch accesslogs", error: err.message });
    }
}

// Create a new accesslog
export async function createaccesslog(req, res) {
    const { UserId, Action, Resource, IpAddress, UserAgent, Referrer, Metadata, LogType } = req.body;

    try {
        const pool = await dbPool;
        await pool.request()
            .input("UserId", sql.Int, UserId)
            .input("Action", sql.VarChar(100), Action)
            .input("Resource", sql.VarChar(255), Resource)
            .input("IpAddress", sql.VarChar(50), IpAddress)
            .input("UserAgent", sql.VarChar(255), UserAgent)
            .input("Referrer", sql.VarChar(255), Referrer)
            .input("Metadata", sql.NVarChar(sql.MAX), Metadata)
            .input("LogType", sql.VarChar(50), LogType)
            .query(`INSERT INTO [EstateAccessManagementSystem].[dbo].[accesslogs] 
                    (TimestampUtc, UserId, Action, Resource, IpAddress, UserAgent, Referrer, Metadata, LogType)
                    VALUES (GETUTCDATE(), @UserId, @Action, @Resource, @IpAddress, @UserAgent, @Referrer, @Metadata, @LogType)`);

        res.status(201).json({ message: "Accesslog created successfully" });
    } catch (err) {
        console.error("Create Accesslog Error:", err);
        res.status(500).json({ message: "Failed to create accesslog", error: err.message });
    }
}
