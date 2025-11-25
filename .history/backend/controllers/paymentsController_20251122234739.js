// backend/controllers/paymentsController.js

import sql from "mssql";
import axios from "axios";
import { dbPool } from "../server.js";

// ---------------- MPESA CONFIG ----------------
const SHORTCODE = 174379;
const PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
const CALLBACK_URL = "https://your-ngrok-url/api/residents/payment-callback"; // Update with your callback
const ENV = process.env.MPESA_ENV || "sandbox";
const BASE_URL = ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

// ---------------- HELPERS ----------------
const getIdentityFromReq = (req) => {
  const role = req.user?.role?.toLowerCase() || "";
  const residentId = req.user?.ResidentID ? parseInt(req.user.ResidentID, 10) : null;
  const verifierID = req.user?.UserID || req.user?.NationalID || "ADMIN";
  return { role, residentId, verifierID };
};

async function executeQuery(query, inputs = []) {
  const pool = await dbPool;
  const request = pool.request();
  inputs.forEach(input => request.input(input.name, input.type, input.value));
  return request.query(query);
}

// ---------------- MPESA ACCESS TOKEN ----------------
export const getAccessToken = async () => {
  try {
    const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
    const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
    const response = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    return response.data.access_token;
  } catch (err) {
    console.error("Error getting MPESA access token:", err.response?.data || err.message);
    throw new Error("Failed to get MPESA access token");
  }
};

// ---------------- GET RESIDENT IDS ----------------
export const getResidentIDs = async (req, res) => {
  try {
    const result = await executeQuery(`SELECT ResidentID, ResidentName FROM Residents ORDER BY ResidentName`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching resident IDs:", err);
    res.status(500).json({ message: "Failed to fetch resident IDs" });
  }
};

// ---------------- GET PAYMENTS ----------------
export const getPayments = async (req, res) => {
  const { role, residentId } = getIdentityFromReq(req);

  try {
    let query = `
      SELECT p.PaymentID, p.ResidentID, p.Amount, p.PaymentDate, p.Status,
             p.Reference, p.PaymentMethod, p.PhoneNumber, p.VerifiedDate,
             r.ResidentName, r.NationalID
      FROM Payments p
      JOIN Residents r ON p.ResidentID = r.ResidentID
      ORDER BY p.PaymentDate DESC
    `;
    const inputs = [];

    if (role === "resident") {
      query = `
        SELECT p.PaymentID, p.ResidentID, p.Amount, p.PaymentDate, p.Status,
               p.Reference, p.PaymentMethod, p.PhoneNumber, p.VerifiedDate,
               r.ResidentName, r.NationalID
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

// ---------------- GET VERIFIED PAYMENTS ----------------
export const getVerifiedPayments = async (req, res) => {
  const { role, residentId } = getIdentityFromReq(req);

  try {
    let query = `
      SELECT p.PaymentID, p.ResidentID, p.Amount, p.PaymentDate, p.Status,
             p.Reference, p.PaymentMethod, p.PhoneNumber, p.VerifiedDate,
             r.ResidentName, r.NationalID
      FROM Payments p
      JOIN Residents r ON p.ResidentID = r.ResidentID
      WHERE p.Status='Verified'
      ORDER BY p.PaymentDate DESC
    `;
    const inputs = [];

    if (role === "resident") {
      query += " AND p.ResidentID = @ResidentID";
      inputs.push({ name: "ResidentID", type: sql.Int, value: residentId });
    }

    const result = await executeQuery(query, inputs);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching verified payments:", err);
    res.status(500).json({ message: "Error fetching verified payments" });
  }
};

// ---------------- GET BALANCES ----------------
export const getBalances = async (req, res) => {
  const { role, residentId } = getIdentityFromReq(req);

  try {
    let query = `
      SELECT r.ResidentID, r.ResidentName,
             ISNULL(SUM(p.Amount),0) AS TotalPaid,
             ISNULL(r.TotalDue,0) AS TotalDue,
             (ISNULL(r.TotalDue,0) - ISNULL(SUM(p.Amount),0)) AS Balance
      FROM Residents r
      LEFT JOIN Payments p ON r.ResidentID = p.ResidentID AND p.Status='Verified'
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

// ---------------- MAKE PAYMENT (STK PUSH) ----------------
export const makePayment = async (req, res) => {
  const { role, residentId: authResidentId } = getIdentityFromReq(req);
  const { residentId, amount, phone, reference } = req.body;

  if (role === "resident" && parseInt(residentId, 10) !== authResidentId) {
    return res.status(403).json({ message: "Unauthorized to pay for other residents" });
  }
  if (!residentId || !amount || !phone) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Check resident exists
    const residentCheck = await executeQuery(
      `SELECT ResidentID FROM Residents WHERE ResidentID=@ResidentID`,
      [{ name: "ResidentID", type: sql.Int, value: parseInt(residentId, 10) }]
    );
    if (!residentCheck.recordset.length) return res.status(404).json({ message: "Resident not found" });

    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");

    const stkPayload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: parseFloat(amount),
      PartyA: phone.replace(/\D/g,''),
      PartyB: SHORTCODE,
      PhoneNumber: phone.replace(/\D/g,''),
      CallBackURL: CALLBACK_URL,
      AccountReference: reference || "Payment",
      TransactionDesc: "Resident Payment"
    };

    const stkResponse = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, stkPayload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await executeQuery(
      `INSERT INTO Payments (ResidentID, Amount, PaymentMethod, Reference, Status, PaymentDate, PhoneNumber)
       OUTPUT INSERTED.PaymentID
       VALUES (@ResidentID,@Amount,@PaymentMethod,@Reference,'Pending',GETDATE(),@PhoneNumber)`,
      [
        { name: "ResidentID", type: sql.Int, value: parseInt(residentId, 10) },
        { name: "Amount", type: sql.Decimal(10,2), value: parseFloat(amount) },
        { name: "PaymentMethod", type: sql.VarChar(50), value: "MPESA" },
        { name: "Reference", type: sql.VarChar(100), value: reference || "N/A" },
        { name: "PhoneNumber", type: sql.VarChar(20), value: phone },
      ]
    );

    res.status(201).json({
      message: "Payment initiated. Complete payment on your phone.",
      paymentId: result.recordset[0].PaymentID,
      stkResponse: stkResponse.data
    });
  } catch (err) {
    console.error("Error initiating MPESA payment:", err);
    res.status(500).json({ message: "Failed to initiate payment", details: err.response?.data || err.message });
  }
};

// ---------------- VERIFY PAYMENT ----------------
export const verifyPaymentAndArchive = async (req, res) => {
  const { role, verifierID } = getIdentityFromReq(req);
  const { id } = req.params;

  if (role !== "admin") return res.status(403).json({ message: "Unauthorized" });

  try {
    const result = await executeQuery(
      `UPDATE Payments SET Status='Verified', VerifiedBy=@VerifierID, VerifiedDate=GETDATE()
       WHERE PaymentID=@PaymentID AND Status<>'Verified'`,
      [
        { name: "PaymentID", type: sql.Int, value: parseInt(id,10) },
        { name: "VerifierID", type: sql.VarChar(50), value: verifierID }
      ]
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(200).json({ message: `Payment ${id} was already verified or does not exist.` });
    }

    res.json({ message: `Payment ${id} verified successfully.` });
  } catch (err) {
    console.error("Error verifying payment:", err);
    res.status(500).json({ message: "Failed to verify payment", details: err.message });
  }
};

// ---------------- GET RECENT PAYMENTS ----------------
export const getRecentPayments = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const result = await executeQuery(`
      SELECT TOP(${limit}) p.PaymentID, r.ResidentName, p.Amount, p.PaymentMethod, p.PaymentDate,
             p.Reference, p.Status
      FROM Payments p
      JOIN Residents r ON p.ResidentID = r.ResidentID
      ORDER BY p.PaymentDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching recent payments:", err);
    res.status(500).json({ message: "Failed to fetch recent payments" });
  }
};
