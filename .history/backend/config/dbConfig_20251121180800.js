import dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

const dbConfig = {
  user: process.env.DB_USER || "Beverly", // SQL Server username
  password: process.env.DB_PASSWORD || "Bev@1234567", // SQL Server password
  database: process.env.DB_NAME || "EstateAccessManagementSystem", // Database name
  server: process.env.DB_SERVER || "localhost", // SQL Server host
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false, // use true if connecting to Azure SQL
    trustServerCertificate: true, // required for local dev
    //instanceName: process.env.DB_INSTANCE || "MSSQLSERVER", // optional
  },
};

export async function connectDB() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log("✅ Connected to SQL Server");
    return pool;
  } catch (err) {
    console.error("❌ Database Connection Failed:", err);
  }
}
export const dbPool = new sql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => {
    console.log("✅ Connected to MSSQL");
    return pool;
  })
  .catch((err) => {
    console.error("❌ MSSQL Connection Error:", err);
    process.exit(1);
  });
export default dbConfig;
