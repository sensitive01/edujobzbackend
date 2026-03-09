const sendEmail = require("../../utils/sendEmail");
const employerAdminSchema = require("../../models/employeradminSchema");

const sendOtpToEmailEmployerAdmin = async (req, res) => {
    const { userEmail } = req.body;

    try {
        // Check if employer admin already exists with this email
        // Use the correct field name 'employeradminEmail' from employeradminSchema
        const employerAdmin = await employerAdminSchema.findOne({ employeradminEmail: userEmail });

        if (employerAdmin) {
            return res
                .status(401)
                .json({ message: "Employer Admin email is already registered." });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store OTP in app.locals (in-memory storage)
        req.app.locals.otps = req.app.locals.otps || {};
        req.app.locals.otps[userEmail] = { otp, otpExpires };

        console.log(`OTP generated: ${otp} for employer admin email: ${userEmail}`);

        const emailTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #4A90E2, #357ABD); color: white; text-align: center; padding: 30px 20px; }
            .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
            .content { padding: 40px 30px; text-align: center; }
            .content h2 { color: #333; font-size: 24px; margin-bottom: 15px; }
            .content p { color: #666; font-size: 16px; margin-bottom: 20px; }
            .otp-box { background: linear-gradient(135deg, #f8f9ff, #e8f2ff); border: 3px solid #4A90E2; border-radius: 12px; padding: 30px 20px; margin: 30px 0; }
            .otp { font-size: 36px; font-weight: bold; color: #4A90E2; letter-spacing: 6px; margin: 0; }
            .validity { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; color: #856404; font-weight: bold; }
            .footer { background: #f8f9fa; padding: 25px 20px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #e9ecef; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎓 EdProfio</h1>
            </div>
            <div class="content">
                <h2>Employer Admin Verification</h2>
                <p>We've sent you a One-Time Password (OTP) to verify your email address. Please use the code below to complete your registration:</p>
                <div class="otp-box"><div class="otp">${otp}</div></div>
                <div class="validity">⏰ This code is valid for 10 minutes only</div>
            </div>
            <div class="footer">
                <p><strong>© 2025 EdProfio</strong></p>
                <p style="font-size: 12px; color: #999;">This is an automated message, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>`;

        try {
            await sendEmail(
                userEmail,
                "🔐 Employer Admin OTP Verification - EdProfio",
                null,
                emailTemplate
            );
            return res.status(200).json({ message: "OTP sent successfully", email: userEmail });
        } catch (emailErr) {
            console.error("Failed to send OTP email:", emailErr);
            return res.status(500).json({ message: "Failed to send OTP email", error: emailErr.message });
        }
    } catch (error) {
        console.error("Error in sendOtpToEmailEmployerAdmin:", error);
        return res.status(500).json({ message: "Error sending OTP", error: error.message });
    }
};

const verifyEmailOtpEmployerAdmin = async (req, res) => {
    const { userEmail, otp } = req.body;

    try {
        const storedData = req.app.locals.otps && req.app.locals.otps[userEmail];

        if (!storedData) {
            return res.status(404).json({ message: "No OTP found for this email" });
        }

        const { otp: savedOtp, otpExpires } = storedData;

        if (savedOtp !== otp || Date.now() > otpExpires) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Remove OTP after successful verification
        delete req.app.locals.otps[userEmail];

        return res.status(200).json({
            message: "Email verified successfully",
            emailverifedstatus: true,
        });
    } catch (error) {
        console.error("OTP verification error:", error);
        return res.status(500).json({ message: "OTP verification failed", error: error.message });
    }
};

module.exports = {
    sendOtpToEmailEmployerAdmin,
    verifyEmailOtpEmployerAdmin
};
