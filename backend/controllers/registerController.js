// controllers/registerController.js
import sql from 'mssql';

// SQL connection configuration (adjust if needed)
const dbConfig = {
  user: 'Beverly',              // your SQL Server username
  password: 'Bev@1234567', // your SQL Server password
  server: 'localhost',
  database: 'EstateAccessManagementSystem',
  options: {
    encrypt: false,        // set to true if using Azure SQL
    trustServerCertificate: true
  }
};

// Handle new membership registration
export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, houseNumber } = req.body;

    // ✅ 1. Validate inputs
    if (!name || !email || !phone || !houseNumber) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // ✅ 2. Connect to SQL Server
    const pool = await sql.connect(dbConfig);

    // ✅ 3. Check if email already exists
    const checkExisting = await pool.request()
      .input('Email', sql.VarChar(100), email)
      .query('SELECT * FROM Residents WHERE Email = @Email');

    if (checkExisting.recordset.length > 0) {
      return res.status(400).json({ message: 'This email is already registered.' });
    }

    // ✅ 4. Insert new resident
    await pool.request()
      .input('FullName', sql.VarChar(150), name)
      .input('Email', sql.VarChar(100), email)
      .input('Phone', sql.VarChar(20), phone)
      .input('HouseNumber', sql.VarChar(50), houseNumber)
      .input('DateJoined', sql.DateTime, new Date())
      .input('Status', sql.VarChar(50), 'Pending')
      .query(`
        INSERT INTO Residents (FullName, Email, Phone, HouseNumber, DateJoined, Status)
        VALUES (@FullName, @Email, @Phone, @HouseNumber, @DateJoined, @Status)
      `);

    // ✅ 5. Success response
    res.status(200).json({ message: 'Membership request submitted successfully!' });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};
