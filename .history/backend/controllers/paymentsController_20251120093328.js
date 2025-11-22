// backend/controllers/paymentsController.js
import sql from "mssql";
import dbConfig from "../config/dbConfig.js";
import {dbpool} from "../server.js";
// Helper: get identity from JWT
const getIdentityFromReq = (req) => {
  const role = req.user?.role?.toLowerCase() || "";
  const residentId = req.user?.ResidentID ?? null;
  return { role, residentId };
};
async function executeQuery(query, inputs = []) {
    const pool = await dbPool;
    const request = pool.request();
    inputs.forEach(input => request.input(input.name, input.type, input.value));
    return request.query(query);
}
// ================= GET ALL PAYMENTS =================
export const getPayments = async (req, res) => {
  const { role, residentId } = getIdentityFromReq(req);

  try {
    const pool = await sql.connect(dbConfig);

    let query = `
      SELECT PaymentID, ResidentID, Amount, PaymentDate, Status, Reference, PaymentMethod
      FROM Payments
    `;

    const request = pool.request();
    if (role === "resident") {
      query += " WHERE ResidentID = @ResidentID";
      request.input("ResidentID", sql.VarChar, residentId);
    }

    const result = await request.query(query);
    res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ message: "Error fetching payments" });
  }
};

// ================= GET VERIFIED PAYMENTS =================
export const getVerifiedPayments = async (req, res) => {
  const { role, residentId } = getIdentityFromReq(req);

  try {
    const pool = await sql.connect(dbConfig);

    let query = `
      SELECT PaymentID, ResidentID, Amount, PaymentDate, Status, Reference, PaymentMethod
      FROM Payments
      WHERE Status='Verified'
    `;

    const request = pool.request();
    if (role === "resident") {
      query += " AND ResidentID = @ResidentID";
      request.input("ResidentID", sql.VarChar, residentId);
    }

    const result = await request.query(query);
    res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching verified payments:", err);
    res.status(500).json({ message: "Error fetching verified payments" });
  }
};

// ================= GET BALANCES =================
export const getBalances = async (req, res) => {
  const { role, residentId } = getIdentityFromReq(req);

  try {
    const pool = await sql.connect(dbConfig);

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

    if (role === "resident") {
      query += " WHERE r.ResidentID = @ResidentID";
    }

    query += " GROUP BY r.ResidentID, r.ResidentName, r.TotalDue";

    const request = pool.request();
    if (role === "resident") request.input("ResidentID", sql.VarChar, residentId);

    const result = await request.query(query);
    res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching balances:", err);
    res.status(500).json({ message: "Error fetching balances" });
  }
};

// ================= MAKE PAYMENT =================
export const makePayment = async (req, res) => {
  const { role, residentId: authResidentId } = getIdentityFromReq(req);
  const { residentId, amount, paymentMethod, reference, phone } = req.body;

  if (role === "resident" && residentId !== authResidentId) {
    return res.status(403).json({ message: "Unauthorized to pay for other residents" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("ResidentID", sql.VarChar, residentId)
      .input("Amount", sql.Decimal(10,2), amount)
      .input("PaymentMethod", sql.VarChar, paymentMethod)
      .input("Reference", sql.VarChar, reference)
      .input("Status", sql.VarChar, "Pending")
      .query(`
        INSERT INTO Payments 
        (ResidentID, Amount, PaymentMethod, Reference, Status, PaymentDate)
        VALUES (@ResidentID, @Amount, @PaymentMethod, @Reference, @Status, GETDATE())
      `);

    res.json({ message: "Payment submitted successfully" });

  } catch (err) {
    console.error("Error submitting payment:", err);
    res.status(500).json({ message: "Error submitting payment" });
  }
};

// ================= VERIFY PAYMENT (ADMIN ONLY) =================
export const verifyPayment = async (req, res) => {
  const { role } = getIdentityFromReq(req);
  const { id } = req.params;

  if (role !== "admin") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("PaymentID", sql.Int, id)
      .query("UPDATE Payments SET Status='Verified', VerifiedDate=GETDATE() WHERE PaymentID=@PaymentID");

    res.json({ message: "Payment verified successfully" });

  } catch (err) {
    console.error("Error verifying payment:", err);
    res.status(500).json({ message: "Error verifying payment" });
  }
};
