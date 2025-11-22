import sql from "mssql";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const dbConfig = {
  user: process.env.DB_USER || "Beverly",
  password: process.env.DB_PASSWORD || "Bev@1234567",
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME || "EstateAccessManagementSystem",
  options: { trustServerCertificate: true }
};

async function seed() {
  try {
    const pool = await sql.connect(dbConfig);

    console.log("Connected to SQL Server...");

    // ============================
    // SEED ADMIN
    // ============================
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM Users WHERE Email='beverly.kongani@gmail.com')
      INSERT INTO Users (Username, FullName, Email, PasswordHash, Role, RoleID, Status)
      VALUES (
        'admin',
        'Beverlyne Kongani',
        'beverly.kongani@gmail.com',
        '${bcrypt.hashSync("Admin@123", 10)}',
        'Admin',
        1,
        'Active'
      )
    `);

    // ============================
    // SEED RESIDENT
    // ============================
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM Users WHERE Email='beulahbev2005@gmail.com')
      INSERT INTO Users (Username, FullName, Email, PasswordHash, Role, RoleID, Status)
      VALUES (
        'resident1',
        'Beverly Nasimiyu',
        'beulahbev2005@gmail.com',
        '${bcrypt.hashSync("Resident@123", 10)}',
        'Resident',
        2,
        'Active'
      )
    `);

    // ============================
    // SEED SECURITY
    // ============================
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM Users WHERE Email='bnasimiyu63092@anu.ac.ke')
      INSERT INTO Users (Username, FullName, Email, PasswordHash, Role, RoleID, Status)
      VALUES (
        'security1',
        'Beverlyne Nasimiyu',
        'bnasimiyu63092@anu.ac.ke',
        '${bcrypt.hashSync("Security@123", 10)}',
        'Security',
        3,
        'Active'
      )
    `);

    // ============================
    // SEED EVENTS
    // ============================
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM Events)
      BEGIN
        INSERT INTO Events (Title, Description, EventDate, Venue, CreatedBy)
        VALUES
        ('Community Meeting','Monthly residents meeting','2025-12-01 18:00','Community Hall','admin'),
        ('Yoga Session','Morning Yoga','2025-11-20 07:00','Central Park','admin')
      END
    `);

    // ============================
    // SEED ANNOUNCEMENTS
    // ============================
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM Announcements)
      BEGIN
        INSERT INTO Announcements (Title, Message, CreatedBy)
        VALUES
        ('Maintenance Notice','Water supply will be off from 9am to 2pm','admin'),
        ('Security Update','New gate access rules effective immediately','admin')
      END
    `);

    console.log("✅ Seed completed successfully!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

seed();
