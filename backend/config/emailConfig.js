// backend/config/emailConfig.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "beulahbev2005@gmail.com",
    pass: process.env.EMAIL_PASS || "qtffvzqidwagdine",
  },
});

export default transporter;
