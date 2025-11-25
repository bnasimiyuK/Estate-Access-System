import dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

const dbConfig = {
  user: process.env.DB_USER || "Beverly",
  password: process.env.DB_PASSWORD || "Bev@1234567",
  database: process.env.DB_NAME || "EstateAccessManagementSystem",
  server: process.env.DB_SERVER || "localhost",
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// ✅ Function to connect to the database
export async function connectDB() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log("✅ Connected to SQL Server");
    return pool;
  } catch (err) {
    console.error("❌ Database Connection Failed:", err);
    throw err; // important to throw so controllers catch errors
  }
}

// default export if needed
export default dbConfig;
