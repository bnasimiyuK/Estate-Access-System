import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // You can change this to Outlook/Yahoo/SMTP server
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // app password
      },
    });

    const mailOptions = {
      from: `"Athi Highway Estate" <${process.env.EMAIL_USER}>`,
      to, // can be a single email or an array
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📩 Email sent to: ${to}`);
  } catch (error) {
    console.error("❌ Email send error:", error);
  }
};
