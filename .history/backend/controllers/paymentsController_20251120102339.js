// backend/controllers/paymentsController.js - COMPLETE CORRECTED & UNIFIED CODE

import sql from "mssql";
// UNIFIED IMPORT: Use dbPool exported from server.js
// backend/controllers/paymentsController.js

import sql from "mssql";
import { 
    dbPool, 
    SHORTCODE, 
    PASSKEY, 
    CALLBACK_URL,
    getAccessToken // Import the function to get the token
} from "../server.js"; // <-- Ensure these are correctly exported in server.js

// ... rest of the imports (like getIdentityFromReq and executeQuery helpers)

import axios from "axios"; // Need axios here for the M-Pesa request
import { dbPool } from "../server.js"; 
// NOTE: dbConfig import removed as we use dbPool directly

// Helper: get identity from JWT
const getIdentityFromReq = (req) => {
    const role = req.user?.role?.toLowerCase() || "";
    // Ensure ResidentID is treated as a Number/Int if that's its database type
    const residentId = req.user?.ResidentID ? parseInt(req.user.ResidentID, 10) : null; 
    const verifierID = req.user?.UserID || req.user?.NationalID || 'ADMIN';
    return { role, residentId, verifierID };
};

// Helper to execute a query using the central dbPool
async function executeQuery(query, inputs = []) {
    const pool = await dbPool;
    const request = pool.request();
    inputs.forEach(input => request.input(input.name, input.type, input.value));
    return request.query(query);
}

// ----------------------------------------------------------------------
// ================= GET ALL PAYMENTS (Updated to use executeQuery) =================
// ----------------------------------------------------------------------
export const getPayments = async (req, res) => {
    const { role, residentId } = getIdentityFromReq(req);

    try {
        let query = `
            SELECT PaymentID, ResidentID, Amount, PaymentDate, Status, Reference, PaymentMethod, PhoneNumber
            FROM Payments
            ORDER BY PaymentDate DESC
        `;

        const inputs = [];
        if (role === "resident") {
            query = `
                SELECT PaymentID, ResidentID, Amount, PaymentDate, Status, Reference, PaymentMethod, PhoneNumber
                FROM Payments
                WHERE ResidentID = @ResidentID
                ORDER BY PaymentDate DESC
            `;
            inputs.push({ name: "ResidentID", type: sql.Int, value: residentId });
        }

        const result = await executeQuery(query, inputs);
        res.json(result.recordset);

    } catch (err) {
        console.error("Error fetching payments:", err);
        res.status(500).json({ message: "Error fetching payments" });
    }
};

// ----------------------------------------------------------------------
// ================= GET VERIFIED PAYMENTS (Updated to use executeQuery) =================
// ----------------------------------------------------------------------
export const getVerifiedPayments = async (req, res) => {
    const { role, residentId } = getIdentityFromReq(req);

    try {
        let query = `
            SELECT PaymentID, ResidentID, Amount, PaymentDate, Status, Reference, PaymentMethod, PhoneNumber
            FROM Payments
            WHERE Status='Verified'
            ORDER BY PaymentDate DESC
        `;

        const inputs = [];
        if (role === "resident") {
            query = `
                SELECT PaymentID, ResidentID, Amount, PaymentDate, Status, Reference, PaymentMethod, PhoneNumber
                FROM Payments
                WHERE Status='Verified' AND ResidentID = @ResidentID
                ORDER BY PaymentDate DESC
            `;
            inputs.push({ name: "ResidentID", type: sql.Int, value: residentId });
        }

        const result = await executeQuery(query, inputs);
        res.json(result.recordset);

    } catch (err) {
        console.error("Error fetching verified payments:", err);
        res.status(500).json({ message: "Error fetching verified payments" });
    }
};

// ----------------------------------------------------------------------
// ================= GET BALANCES (Updated to use executeQuery) =================
// ----------------------------------------------------------------------
export const getBalances = async (req, res) => {
    const { role, residentId } = getIdentityFromReq(req);

    try {
        let query = `
            SELECT 
                r.ResidentID,
                r.ResidentName,
                ISNULL(SUM(p.Amount), 0) AS TotalPaid,
                ISNULL(r.TotalDue, 0) AS TotalDue,
                (ISNULL(r.TotalDue,0) - ISNULL(SUM(p.Amount),0)) AS Balance
            FROM Residents r
            LEFT JOIN Payments p
                ON r.ResidentID = p.ResidentID AND p.Status='Verified'
        `;

        const inputs = [];
        if (role === "resident") {
            query += " WHERE r.ResidentID = @ResidentID";
            inputs.push({ name: "ResidentID", type: sql.Int, value: residentId });
        }

        query += " GROUP BY r.ResidentID, r.ResidentName, r.TotalDue";

        const result = await executeQuery(query, inputs);
        res.json(result.recordset);

    } catch (err) {
        console.error("Error fetching balances:", err);
        res.status(500).json({ message: "Error fetching balances" });
    }
};

// ----------------------------------------------------------------------
// ================= MAKE PAYMENT (UNIFIED & CORRECTED) =================
// ----------------------------------------------------------------------
// backend/controllers/paymentsController.js - makePayment function

export const makePayment = async (req, res) => {
    const { role, residentId: authResidentId } = getIdentityFromReq(req);
    const { residentId, amount, paymentMethod, reference, phone } = req.body;

    // Authorization Check: Prevent residents from paying for others
    if (role === "resident" && parseInt(residentId, 10) !== authResidentId) {
        return res.status(403).json({ message: "Unauthorized to pay for other residents" });
    }
    
    // Data Validation
    if (!residentId || !amount || !paymentMethod || !phone) {
        return res.status(400).json({ message: "Missing required fields (residentId, amount, paymentMethod, phone)." });
    }

    // Prepare Phone Number for M-Pesa (if needed)
    let phoneNo = phone;
    if (paymentMethod.toLowerCase() === 'mpesa') {
        // Convert 07... or +2547... to 2547...
        phoneNo = phone.replace(/^0|^\+254/g, "254"); 
        if (!phoneNo.match(/^2547\d{8}$/)) {
            return res.status(400).json({ message: "Invalid M-Pesa phone number format." });
        }
    }
    
    // --- Step 1: Insert Pending Payment into DB ---
    try {
        const query = `
            INSERT INTO Payments 
            (ResidentID, Amount, PaymentMethod, Reference, Status, PaymentDate, PhoneNumber)
            OUTPUT INSERTED.PaymentID
            VALUES (@ResidentID, @Amount, @PaymentMethod, @Reference, 'Pending', GETDATE(), @PhoneNumber);
        `;
        
        const inputs = [
            { name: "ResidentID", type: sql.Int, value: parseInt(residentId, 10) },
            { name: "Amount", type: sql.Decimal(10, 2), value: amount },
            { name: "PaymentMethod", type: sql.VarChar(50), value: paymentMethod },
            { name: "Reference", type: sql.VarChar(100), value: reference || 'N/A' },
            { name: "PhoneNumber", type: sql.VarChar(20), value: phoneNo },
        ];
        
        const result = await executeQuery(query, inputs);
        const newPaymentId = result.recordset[0]?.PaymentID;

        // --- Step 2: M-Pesa STK Push (Only if payment method is mpesa) ---
        if (paymentMethod.toLowerCase() === 'mpesa') {
            const token = await getAccessToken();
            const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
            const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");
            const businessShortCode = SHORTCODE;
            
            const mpesaUrl = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
            
            const stkPushData = {
                BusinessShortCode: businessShortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: "CustomerPayBillOnline",
                Amount: amount,
                PartyA: phoneNo,
                PartyB: businessShortCode,
                PhoneNumber: phoneNo,
                CallBackURL: CALLBACK_URL,
                AccountReference: `EstatePay-${newPaymentId}`, // Use the new ID for reference
                TransactionDesc: "Estate Management Payment",
            };

            const mpesaRes = await axios.post(mpesaUrl, stkPushData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            // If M-Pesa successfully sends the prompt
            if (mpesaRes.data.ResponseCode === '0') {
                return res.status(202).json({ 
                    message: "M-Pesa STK Push successful. Check your phone for prompt.",
                    paymentId: newPaymentId,
                    checkoutRequestID: mpesaRes.data.CheckoutRequestID
                });
            } else {
                 // Log M-Pesa error but keep the 'Pending' status in DB unless you manually update it here.
                 console.error("M-Pesa API Error:", mpesaRes.data);
                 
                 // CRITICAL: If STK push fails, the resident won't get a prompt. You should indicate this failure to the user.
                 return res.status(500).json({ 
                     message: "Payment recorded as pending, but M-Pesa STK Push failed.", 
                     details: mpesaRes.data 
                 });
            }
        }
        
        // Response for non-Mpesa payments
        res.status(201).json({ 
            message: "Payment submitted successfully. Awaiting manual verification.",
            paymentId: newPaymentId
        });

    } catch (err) {
        console.error("Error submitting payment or M-Pesa STK Push failed:", err.response?.data || err.message);
        // Handle database or network errors
        res.status(500).json({ message: "Error processing payment", details: err.response?.data?.errorMessage || err.message });
    }
};
// ----------------------------------------------------------------------
// ================= VERIFY PAYMENT (ADMIN ONLY) (UNIFIED & CORRECTED) =================
// ----------------------------------------------------------------------
export const verifyPayment = async (req, res) => {
    const { role, verifierID } = getIdentityFromReq(req);
    const { id } = req.params;
    const verificationDate = new Date();

    if (role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
    }

    try {
        if (!id) return res.status(400).json({ message: "Payment ID missing." });

        const query = `
            UPDATE Payments 
            SET 
                Status = 'Verified', 
                VerifiedBy = @VerifierID, 
                VerifiedDate = @VerifiedDate
            WHERE PaymentID = @PaymentID AND Status <> 'Verified';
        `;
        
        const inputs = [
            { name: "PaymentID", type: sql.Int, value: id },
            { name: "VerifierID", type: sql.VarChar(50), value: verifierID.toString() },
            { name: "VerifiedDate", type: sql.DateTime, value: verificationDate },
        ];
        
        const result = await executeQuery(query, inputs);

        if (result.rowsAffected[0] === 0) {
            // This is crucial: check if the payment was already Verified
            const checkQuery = await executeQuery(`SELECT Status FROM Payments WHERE PaymentID = @PaymentID`, [{ name: "PaymentID", type: sql.Int, value: id }]);
            
            if (checkQuery.recordset.length === 0) {
                 return res.status(404).json({ message: "Payment not found." });
            }

            return res.status(200).json({ message: `Payment ${id} was already verified or update failed.` });
        }

        res.json({ message: `Payment ${id} verified successfully.` });

    } catch (err) {
        console.error("DB Error in verifyPayment:", err);
        res.status(500).json({ message: "Failed to verify payment.", details: err.message });
    }
};
// Add this to backend/controllers/paymentsController.js

// -------------------------------------------------------------
// GET PAYMENT SUMMARY (NEW)
// -------------------------------------------------------------
export async function getPaymentSummary(req, res) {
    try {
        const pool = await dbPool;
        
        const result = await pool.request().query(`
            SELECT 
                COUNT(*) AS totalPayments,
                SUM(CASE WHEN Status = 'Verified' THEN 1 ELSE 0 END) AS totalVerified,
                SUM(CASE WHEN Status = 'Pending' THEN 1 ELSE 0 END) AS totalPending
            FROM Payments
        `);

        if (result.recordset.length === 0) {
             return res.json({ totalPayments: 0, totalVerified: 0, totalPending: 0 });
        }

        res.json(result.recordset[0]);

    } catch (err) {
        console.error("DB Error in getPaymentSummary:", err);
        res.status(500).json({ message: "Failed to fetch payment summary." });
    }
}
// -------------------------------------------------------------
// GET LOGIC (Simplified & Consolidated)
// -------------------------------------------------------------
// NOTE: getPayments, getVerifiedPayments, and getBalances are already defined above.
// The executeQuery helper function is now used by all of them for a unified style.