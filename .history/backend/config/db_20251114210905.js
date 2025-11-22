// backend/config/db.js
import sql from "mssql";
import dotenv from "dotenv";
dotenv.config();

const dbConfig = {
  user: process.env.DB_USER || "Beverly",
  password: process.env.DB_PASS || "Bev@1234567",
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME || "EstateAccessManagementSystem",
  options: { encrypt: false, trustServerCertificate: true },
};

export default dbConfig;
export const sqlLib = sql;
