const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const sendEmail = require("../../utils/sendEmail");
const bcrypt = require("bcrypt");
const generateOTP = require("../../utils/generateOTP");

const otpmodel = require("../../models/optschema");
const jwtDecode = require("jwt-decode");
const jwksClient = require("jwks-rsa");
const { v4: uuidv4 } = require("uuid"); // Import uuid
const mongoose = require("mongoose"); // <-- Add this line
const userModel = require("../../models/employeeschema");

// const sendOtpToEmail = async (req, res) => {
//   const { userEmail } = req.body;

//   try {
//     // Find existing user or create new
//     let employer = await otpmodel.findOne({ userEmail });

//     if (!employer) {
//       // If not found, create a new user with just the email
//       employer = new otpmodel({ userEmail });
//     }

//     // Generate 6-digit OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

//     // Update OTP fields
//     employer.otp = otp;
//     employer.otpExpires = otpExpires;

//     await employer.save();
//     console.log(`OTP generated: ${otp} for email: ${userEmail}`);

//     // Send email
//     try {
//       await sendEmail(userEmail, 'Your OTP Code', `Your OTP is: ${otp}`);
//       console.log('OTP email sent successfully');
//     } catch (emailErr) {
//       console.error('Failed to send OTP email:', emailErr);
//       return res.status(500).json({ message: 'Failed to send OTP email', error: emailErr });
//     }

//     return res.status(200).json({ message: 'OTP sent successfully' });
//   } catch (error) {
//     console.error('Error in sendOtpToEmail:', error);
//     return res.status(500).json({ message: 'Error sending OTP', error });
//   }
// };

const sendOtpToEmail = async (req, res) => {
  const { userEmail } = req.body;


  try {
    let employer = await userModel.findOne({ userEmail });

    if (!employer) {
      employer = new userModel({ userEmail });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    employer.otp = otp;
    employer.otpExpires = otpExpires;

    await employer.save();
    console.log(`OTP generated: ${otp} for email: ${userEmail}`);

    const emailTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background-color: #f4f4f4; 
                line-height: 1.6;
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background: white; 
                border-radius: 12px; 
                overflow: hidden; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .header { 
                background: linear-gradient(135deg, #4A90E2, #357ABD); 
                color: white; 
                text-align: center; 
                padding: 30px 20px; 
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: bold;
            }
            .content { 
                padding: 40px 30px; 
                text-align: center; 
            }
            .content h2 {
                color: #333;
                font-size: 24px;
                margin-bottom: 15px;
            }
            .content p {
                color: #666;
                font-size: 16px;
                margin-bottom: 20px;
            }
            .otp-box { 
                background: linear-gradient(135deg, #f8f9ff, #e8f2ff);
                border: 3px solid #4A90E2; 
                border-radius: 12px; 
                padding: 30px 20px; 
                margin: 30px 0; 
                position: relative;
            }
            .otp { 
                font-size: 36px; 
                font-weight: bold; 
                color: #4A90E2; 
                letter-spacing: 6px; 
                margin: 0;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            }
            .validity {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
                font-weight: bold;
            }
            .footer { 
                background: #f8f9fa; 
                padding: 25px 20px; 
                text-align: center; 
                font-size: 14px; 
                color: #666; 
                border-top: 1px solid #e9ecef;
            }
            .warning {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                color: #721c24;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 8px;
                }
                .content {
                    padding: 30px 20px;
                }
                .otp {
                    font-size: 30px;
                    letter-spacing: 4px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎓 EdProfio</h1>
            </div>
            <div class="content">
                <h2>Email Verification</h2>
                <p>We've sent you a One-Time Password (OTP) to verify your email address. Please use the code below:</p>
                
                <div class="otp-box">
                    <div class="otp">${otp}</div>
                </div>
                
                <div class="validity">
                    ⏰ This code is valid for 10 minutes only
                </div>
                
                <div class="warning">
                    🔒 If you didn't request this verification, please ignore this email and ensure your account is secure.
                </div>
            </div>
            <div class="footer">
                <p><strong>© 2024 EdProfio</strong></p>
                <p>Your trusted education platform for professional growth</p>
                <p style="font-size: 12px; color: #999;">This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>`;

    // Send email with HTML formatting
    try {
      // FIXED: Pass null as text, and emailTemplate as html parameter
      await sendEmail(
        userEmail,
        "🔐 Your OTP Code - EdProfio",
        null,
        emailTemplate
      );
      console.log("OTP email sent successfully");
    } catch (emailErr) {
      console.error("Failed to send OTP email:", emailErr);
      return res
        .status(500)
        .json({ message: "Failed to send OTP email", error: emailErr });
    }

    return res.status(200).json({
      message: "OTP sent successfully",
      email: userEmail,
    });
  } catch (error) {
    console.error("Error in sendOtpToEmail:", error);
    return res.status(500).json({
      message: "Error sending OTP",
      error: error.message,
    });
  }
};

const verifyEmailOtp = async (req, res) => {
  const { userEmail, otp } = req.body;
  console.log("userEmail, otp",userEmail, otp)

  try {
    const employer = await userModel.findOne({ userEmail });
    console.log("employer",employer)

    if (!employer) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check OTP and expiry
    const isOtpValid = employer.otp === otp;
    const isOtpExpired = new Date() > new Date(employer.otpExpires);

    if (!isOtpValid || isOtpExpired) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark email as verified
    employer.emailverifedstatus = true;
    employer.otp = undefined;
    employer.otpExpires = undefined;

    await employer.save();

    return res.status(200).json({
      message: "Email verified successfully",
      emailverifedstatus: employer.emailverifedstatus,
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "OTP verification failed", error });
  }
};

module.exports = {
  sendOtpToEmail,
  verifyEmailOtp,
};
