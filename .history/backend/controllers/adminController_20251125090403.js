// backend/controllers/adminController.js
import sql from "mssql";
import { dbPool } from "../server.js";
// ✅ Get all membership requests
export const getAllMemberships = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT RequestID, ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, Status, RequestedAt
      FROM MembershipRequests
      ORDER BY RequestedAt DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("❌ Error fetching memberships:", error);
    res.status(500).json({ message: "Server error fetching memberships" });
  }
};

// ✅ Approve a membership
export const approveResident = async (req, res) => {
  try {
    const { requestId } = req.body;
    const pool = await sql.connect(dbConfig);

    await pool.request()
      .input("RequestID", sql.Int, requestId)
      .query(`UPDATE MembershipRequests SET Status = 'Approved' WHERE RequestID = @RequestID`);

    res.json({ message: "Membership approved ✅" });
  } catch (error) {
    console.error("❌ Error approving membership:", error);
    res.status(500).json({ message: "Server error approving membership" });
  }
};
// 🌟 NEW: Move Verified Payment to VerifiedPayments Table
export const movePaymentToVerified = async (req, res) => {
    const { paymentId } = req.body; 

    if (!paymentId) {
        return res.status(400).json({ error: "Payment ID is required for verification." });
    }

    // You can optionally add a role check here to ensure only Admins run this

    let pool;
    try {
        pool = await sql.connect(dbConfig);
        
        // Use a SQL Transaction to ensure both the INSERT and the UPDATE are atomic (all or nothing)
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // STEP 1: INSERT the verified data into VerifiedPayments
            const insertResult = await transaction.request()
                .input("PaymentID", sql.Int, paymentId)
                .query(`
                    -- Joins Payments (p) with Users (u) to get the ResidentName
                    INSERT INTO VerifiedPayments (
                        PaymentID, 
                        ResidentID, 
                        ResidentName, 
                        Amount, 
                        Reference, 
                        VerifiedDate, 
                        NationalID,
                        PaymentMethod, -- Include the PaymentMethod column
                        serviceName    -- Include the serviceName column
                    )
                    SELECT 
                        p.PaymentID, 
                        p.ResidentID, 
                        u.FullName, 
                        p.Amount, 
                        p.Reference, 
                        p.VerifiedDate, 
                        p.NationalID,
                        p.PaymentMethod,
                        p.serviceName
                    FROM Payments p
                    -- We rely on the ResidentID from the Payments table to link to the Users table
                    JOIN Users u ON p.ResidentID = u.UserID
                    WHERE p.PaymentID = @PaymentID AND p.Status = 'Paid';
                `);

            if (insertResult.rowsAffected[0] === 0) {
                await transaction.rollback();
                return res.status(404).json({ error: "Payment not found or not yet marked as Paid." });
            }

            // STEP 2: Mark the record in the original Payments table as 'Archived' (Terminal State)
            await transaction.request()
                .input("PaymentID", sql.Int, paymentId)
                .query(`
                    UPDATE Payments
                    SET Status = 'Archived' 
                    WHERE PaymentID = @PaymentID;
                `);

            await transaction.commit();
            res.status(200).json({ message: "Payment successfully verified and moved to archives. ✅" });

        } catch (txnError) {
            await transaction.rollback();
            throw txnError; 
        }

    } catch (error) {
        console.error("❌ Verification error:", error);
        res.status(500).json({
            message: "Server error during payment verification.",
            details: error.message
        });
    }
};
export async function getAccessChart(req, res) {
    try {
        const pool = await dbPool; // Wait for the global pool to be ready
        
        // ==========================================================
        // ⚠️ CRITICAL AREA TO CHECK: Your SQL Query
        // Check for typos in table names, column names, or syntax.
        // ==========================================================
        const chartQuery = `
            SELECT 
                CAST([TimestampUtc AS DATE) as access_date, 
                COUNT(*) as daily_count
            FROM 
                [dbo].[accesslogs]  -- <<< CHECK THIS TABLE NAME! (e.g., accesslogss?)
            GROUP BY 
                CAST([TimestampUtc AS DATE)
            ORDER BY
                access_date DESC;
        `;
        
        const result = await pool.request().query(chartQuery);
        
        // Success response
        return res.json(result.recordset);
        
    } catch (error) {
        // ==============================================================
        // ✅ FIX: Log the detailed error to the server console
        // This will tell you exactly why the 500 is happening (e.g., SQL error)
        // ==============================================================
        console.error('❌ CRITICAL SERVER ERROR in getAccessChart:', error.message);
        
        // Send a generic 500 response to the client
        return res.status(500).json({ 
            message: 'Internal Server Error while fetching chart data.', 
            detail: 'Check server console for detailed SQL error.' 
        });
    }
}
export async function handleAdminRequest(req, res) {
    try {
      
        const { requestId, action } = req.body;
        // Your logic to update the MembershipRequests table based on action (Approve/Reject) goes here.
        
        console.log(`Processing admin request for ID: ${requestId}, Action: ${action}`);

        // Sending a success response
        return res.status(200).json({ message: 'Request processed successfully.' });
    } catch (error) {
        console.error('Error processing admin request:', error);
        return res.status(500).json({ message: "Failed to process request due to a server error." });
    }
}