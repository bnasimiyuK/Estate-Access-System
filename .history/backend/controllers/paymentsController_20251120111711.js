// backend/controllers/paymentsController.js

import sql from "mssql";
import axios from "axios"; 
import { dbPool, SHORTCODE, PASSKEY, CALLBACK_URL, getAccessToken } from "../server.js"; 


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
// ================= GET ALL PAYMENTS =================
// ----------------------------------------------------------------------
export const getPayments = async (req, res) => {
  const { role, residentId } = getIdentityFromReq(req);

  try {
    let query = `
      SELECT 
                p.PaymentID, p.ResidentID, p.Amount, p.PaymentDate, p.Status, 
                p.Reference, p.PaymentMethod, p.PhoneNumber, p.VerifiedDate,
                r.ResidentName,
                r.NationalID
      FROM Payments p
            JOIN Residents r ON p.ResidentID = r.ResidentID
      ORDER BY p.PaymentDate DESC
    `;

    const inputs = [];
    if (role === "resident") {
      query = `
        SELECT 
                    p.PaymentID, p.ResidentID, p.Amount, p.PaymentDate, p.Status, 
                    p.Reference, p.PaymentMethod, p.PhoneNumber, p.VerifiedDate,
                    r.ResidentName,
                    r.NationalID
        FROM Payments p
                JOIN Residents r ON p.ResidentID = r.ResidentID
        WHERE p.ResidentID = @ResidentID
        ORDER BY p.PaymentDate DESC
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
// ================= GET VERIFIED PAYMENTS =================
// ----------------------------------------------------------------------
export const getVerifiedPayments = async (req, res) => {
  const { role, residentId } = getIdentityFromReq(req);

  try {
    let query = `
      SELECT 
                p.PaymentID, p.ResidentID, p.Amount, p.PaymentDate, p.Status, 
                p.Reference, p.PaymentMethod, p.PhoneNumber, p.VerifiedDate,
                r.ResidentName,
                r.NationalID
      FROM Payments p
            JOIN Residents r ON p.ResidentID = r.ResidentID
      WHERE p.Status='Verified'
      ORDER BY p.PaymentDate DESC
    `;

    const inputs = [];
    if (role === "resident") {
      query = `
        SELECT 
                    p.PaymentID, p.ResidentID, p.Amount, p.PaymentDate, p.Status, 
                    p.Reference, p.PaymentMethod, p.PhoneNumber, p.VerifiedDate,
                    r.ResidentName,
                    r.NationalID
        FROM Payments p
                JOIN Residents r ON p.ResidentID = r.ResidentID
        WHERE p.Status='Verified' AND p.ResidentID = @ResidentID
        ORDER BY p.PaymentDate DESC
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
// ================= GET BALANCES =================
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

  try {
    // Check if the resident exists before creating a payment
    const residentCheck = await executeQuery(
      `SELECT ResidentID FROM Residents WHERE ResidentID = @ResidentID`, 
      [{ name: "ResidentID", type: sql.Int, value: parseInt(residentId, 10) }]
    );
    if (residentCheck.recordset.length === 0) {
      return res.status(404).json({ message: "Resident not found." });
    }

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
      { name: "PhoneNumber", type: sql.VarChar(20), value: phone },
    ];
    
    const result = await executeQuery(query, inputs);
    const newPaymentId = result.recordset[0]?.PaymentID;

    res.status(201).json({ 
      message: "Payment submitted successfully. Awaiting verification.",
      paymentId: newPaymentId
    });

  } catch (err) {
    console.error("Error submitting payment:", err);
    res.status(500).json({ message: "Error submitting payment", details: err.message });
  }
};

// ----------------------------------------------------------------------
// ================= VERIFY PAYMENT (ADMIN ONLY) =================
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
      { name: "PaymentID", type: sql.Int, value: parseInt(id, 10) },
      { name: "VerifierID", type: sql.VarChar(50), value: verifierID.toString() },
      { name: "VerifiedDate", type: sql.DateTime, value: verificationDate },
    ];
    
    const result = await executeQuery(query, inputs);

    if (result.rowsAffected[0] === 0) {
      // Check if the payment was already Verified or doesn't exist
      const checkQuery = await executeQuery(`SELECT Status FROM Payments WHERE PaymentID = @PaymentID`, [{ name: "PaymentID", type: sql.Int, value: id }]);
      
      if (checkQuery.recordset.length === 0) {
        return res.status(404).json({ message: "Payment not found." });
      }

      return res.status(200).json({ message: `Payment ${id} was already verified or update failed (no state change).` });
    }

    res.json({ message: `Payment ${id} verified successfully.` });

  } catch (err) {
    console.error("DB Error in verifyPayment:", err);
    res.status(500).json({ message: "Failed to verify payment.", details: err.message });
  }
};

// -------------------------------------------------------------
// GET PAYMENT SUMMARY 
// -------------------------------------------------------------
export async function getPaymentSummary(req, res) {
  try {
    const pool = await dbPool;
    
    const result = await pool.request().query(`
      SELECT 
        COUNT(*) AS totalPayments,
        ISNULL(SUM(CASE WHEN Status = 'Verified' THEN 1 ELSE 0 END), 0) AS totalVerified,
        ISNULL(SUM(CASE WHEN Status = 'Pending' THEN 1 ELSE 0 END), 0) AS totalPending
      FROM Payments
    `);

    if (result.recordset.length === 0) {
      return res.json({ totalPayments: 0, totalVerified: 0, totalPending: 0 });
    }

    // Ensure counts are returned as numbers
    const data = result.recordset[0];
    res.json({
      totalPayments: parseInt(data.totalPayments),
      totalVerified: parseInt(data.totalVerified),
      totalPending: parseInt(data.totalPending)
    });

  } catch (err) {
    console.error("DB Error in getPaymentSummary:", err);
    res.status(500).json({ message: "Failed to fetch payment summary." });
  }
}