

const nodemailer = require("nodemailer");
require("dotenv").config();


const sendEmail = async (to, subject, text, html = null) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // fix occasional self-signed cert errors
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html, 
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
