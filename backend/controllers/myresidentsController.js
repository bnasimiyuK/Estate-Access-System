// ==========================================
// backend/controllers/residentsController.js
// ==========================================
import sql from "mssql";
import bcrypt from "bcryptjs";
import dbConfig from "../config/dbConfig.js";

// ==========================================
// ✅ Get residents (Admin → all, Resident → self)
// ==========================================
export const getResidents = async (req, res) => {
  const { role, userId } = req.user;

  try {
    const pool = await sql.connect(dbConfig);

    // If admin → fetch all residents
    if (role && role.toLowerCase() === "admin") {
      const result = await pool.request().query(`
        SELECT 
          ResidentID, UserID, ResidentName, NationalID, PhoneNumber, Email, 
          HouseNumber, CourtName, Occupation, DateJoined, Status, RoleName
        FROM Residents
        ORDER BY ResidentID DESC
      `);
      return res.json(result.recordset);
    }

    // If resident → fetch only their profile
    const result = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .query(`
        SELECT 
          ResidentID, UserID, ResidentName, NationalID, PhoneNumber, Email, 
          HouseNumber, CourtName, Occupation, DateJoined, Status, RoleName
        FROM Residents
        WHERE UserID = @UserID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Resident profile not found." });
    }

    res.json(result.recordset); // Single record array (frontend handles it)
  } catch (err) {
    console.error("❌ Error fetching residents:", err);
    res.status(500).json({ message: "Failed to fetch residents" });
  }
};

// ==========================================
// ✅ Sync residents (bulk upsert by Admin)
// ==========================================
export const syncResidents = async (req, res) => {
  try {
    const { residents } = req.body;
    if (!Array.isArray(residents) || residents.length === 0) {
      return res.status(400).json({ message: "No residents to sync" });
    }

    const pool = await sql.connect(dbConfig);

    for (const r of residents) {
      await pool
        .request()
        .input("ResidentID", sql.Int, r.ResidentID)
        .input("ResidentName", sql.NVarChar(100), r.ResidentName)
        .input("NationalID", sql.NVarChar(50), r.NationalID)
        .input("PhoneNumber", sql.NVarChar(50), r.PhoneNumber)
        .input("HouseNumber", sql.NVarChar(50), r.HouseNumber)
        .input("Occupation", sql.NVarChar(100), r.Occupation)
        .input("DateJoined", sql.Date, r.DateJoined)
        .input("Status", sql.NVarChar(50), r.Status)
        .input("CourtName", sql.NVarChar(100), r.CourtName)
        .input("RoleName", sql.NVarChar(50), r.RoleName)
        .query(`
          MERGE Residents AS target
          USING (SELECT @ResidentID AS ResidentID) AS source
          ON (target.ResidentID = source.ResidentID)
          WHEN MATCHED THEN
            UPDATE SET ResidentName=@ResidentName, NationalID=@NationalID, PhoneNumber=@PhoneNumber,
                       HouseNumber=@HouseNumber, Occupation=@Occupation, DateJoined=@DateJoined,
                       Status=@Status, CourtName=@CourtName, RoleName=@RoleName
          WHEN NOT MATCHED THEN
            INSERT (ResidentName, NationalID, PhoneNumber, HouseNumber, Occupation, DateJoined, Status, CourtName, RoleName)
            VALUES (@ResidentName, @NationalID, @PhoneNumber, @HouseNumber, @Occupation, @DateJoined, @Status, @CourtName, @RoleName);
        `);
    }

    res.status(200).json({ message: "Residents synced successfully" });
  } catch (err) {
    console.error("❌ Error syncing residents:", err);
    res.status(500).json({ error: "Server error while syncing residents" });
  }
};

// ==========================================
// ✅ Get logged-in resident profile (requires auth)
// ==========================================
export const getProfile = async (req, res) => {
  try {
    const { ResidentID } = req.user; // From JWT
    const pool = await sql.connect(dbConfig);

    const result = await pool
      .request()
      .input("ResidentID", sql.Int, ResidentID)
      .query(`
        SELECT 
          ResidentID, ResidentName, NationalID, PhoneNumber, Email, 
          HouseNumber, CourtName, Occupation, DateJoined, Status, RoleName
        FROM Residents 
        WHERE ResidentID = @ResidentID
      `);

    if (result.recordset.length === 0)
      return res.status(404).json({ message: "Resident not found" });

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

// ==========================================
// ✅ Update logged-in resident profile
// ==========================================
export const updateProfile = async (req, res) => {
  try {
    const { ResidentID } = req.user;
    const { FullName, Phone, HouseNo, Password } = req.body;

    const pool = await sql.connect(dbConfig);

    await pool
      .request()
      .input("FullName", sql.NVarChar(100), FullName)
      .input("Phone", sql.NVarChar(50), Phone)
      .input("HouseNo", sql.NVarChar(50), HouseNo)
      .input("ResidentID", sql.Int, ResidentID)
      .query(`
        UPDATE Residents 
        SET ResidentName=@FullName, PhoneNumber=@Phone, HouseNumber=@HouseNo
        WHERE ResidentID=@ResidentID
      `);

    if (Password) {
      const hash = await bcrypt.hash(Password, 10);
      await pool
        .request()
        .input("PasswordHash", sql.NVarChar(255), hash)
        .input("ResidentID", sql.Int, ResidentID)
        .query(`UPDATE Residents SET PasswordHash=@PasswordHash WHERE ResidentID=@ResidentID`);
    }

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    res.status(500).json({ message: "Error updating profile" });
  }
};

// ==========================================
// ✅ Update resident payment status (Admin only)
// ==========================================
export const updateResidentPayment = async (req, res) => {
  try {
    const { ResidentID, PaymentStatus } = req.body;
    if (!ResidentID || !PaymentStatus) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const pool = await sql.connect(dbConfig);
    await pool
      .request()
      .input("ResidentID", sql.Int, ResidentID)
      .input("PaymentStatus", sql.NVarChar(50), PaymentStatus)
      .query(`
        UPDATE Residents
        SET PaymentStatus = @PaymentStatus
        WHERE ResidentID = @ResidentID
      `);

    res.json({ success: true, message: "Payment status updated" });
  } catch (err) {
    console.error("❌ Error updating payment status:", err);
    res.status(500).json({ message: "Failed to update payment status" });
  }
};
