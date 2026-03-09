const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const employerAdmin = require('../../models/employeradminSchema.js'); // Adjust the path as necessary
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { cloudinary } = require('../../config/cloudinary');
const JWT_SECRET = "your_secret_key"; // Use env var in production
function generateOTP(length = 4) {
  return Math.floor(1000 + Math.random() * 9000).toString().substring(0, length);
}
const EmployerAdmin = require('../../models/employeradminSchema.js'); // Adjusted model name
const Employer = require('../../models/employerSchema.js'); // Employer model
const Employee = require('../../models/employeeschema.js'); // adjust the path if needed
const employerModel = require('../../models/employerSchema.js'); // adjust the path as needed
const Job = require('../../models/jobSchema');

// Admin Signup
exports.employersignupAdmin = async (req, res) => {
  try {
    const {
      employeradminUsername,
      employeradminEmail,
      employeradminMobile,
      employeradminPassword,
      employerconfirmPassword
    } = req.body;

    // Check if passwords match
    if (employeradminPassword !== employerconfirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if admin already exists with this email
    const existingAdmin = await employerAdmin.findOne({ employeradminEmail });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists with this email" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(employeradminPassword, 10);

    // Create and save new admin
    const newAdmin = new employerAdmin({
      uuid: uuidv4(),
      employeradminUsername,
      employeradminEmail,
      employeradminMobile,
      employeradminPassword: hashedPassword,
      verificationstatus: 'pending',
      blockstatus: 'unblock',
    });

    await newAdmin.save();

    return res.status(201).json({ message: "Employer admin registered successfully" });
  } catch (err) {
    console.error("Signup Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.employerloginAdmin = async (req, res) => {
  try {
    const { employeradminEmail, employeradminPassword } = req.body;

    if (!employeradminEmail || !employeradminPassword) {
      return res.status(400).json({ message: "Email and Password are required" });
    }

    const admin = await employerAdmin.findOne({ employeradminEmail });
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(employeradminPassword, admin.employeradminPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        adminId: admin._id,
        email: admin.employeradminEmail,
        username: admin.employeradminUsername
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Clone admin object and remove sensitive data
    const adminData = admin.toObject();
    delete adminData.employeradminPassword;
    delete adminData.otp;
    delete adminData.otpExpiry;

    return res.status(200).json({
      message: "Login successful",
      token,
      admin: adminData
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ...existing code...
exports.employergetAdminById = async (req, res) => {
  try {
    const admin = await employerAdmin.findById(req.params.id).select('-employeradminPassword'); // exclude password

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    return res.status(200).json({ admin });
  } catch (err) {
    console.error("Get Admin By ID Error:", err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.employeradminForgotPassword = async (req, res) => {
  try {
    const { employeradminEmail } = req.body;

    if (!employeradminEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const admin = await employerAdmin.findOne({ employeradminEmail });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found with the provided email" });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins validity

    admin.otp = otp;
    admin.otpExpiry = otpExpiry;
    await admin.save();

    // In production, send the OTP via email/SMS
    console.log("Generated OTP:", otp);

    return res.status(200).json({
      message: "OTP sent successfully",
      otp: otp, // ❗Remove in production
    });
  } catch (err) {
    console.error("Error in employeradminForgotPassword:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Admin Verify OTP
exports.employeradminVerifyOTP = async (req, res) => {
  try {
    const { otp, employeradminEmail } = req.body;

    if (!otp || !employeradminEmail) {
      return res.status(400).json({ message: "OTP and email are required" });
    }

    const admin = await employerAdmin.findOne({ employeradminEmail });

    if (!admin || !admin.otp || !admin.otpExpiry) {
      return res.status(400).json({ message: "OTP not generated or expired", success: false });
    }

    if (admin.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP", success: false });
    }

    if (admin.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired", success: false });
    }

    // Clear OTP after verification
    admin.otp = null;
    admin.otpExpiry = null;
    await admin.save();

    return res.status(200).json({ message: "OTP verified successfully", success: true });
  } catch (err) {
    console.error("Error in employeradminVerifyOTP:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Admin Change Password
exports.employeradminChangePassword = async (req, res) => {
  try {
    const { employeradminEmail, password, confirmPassword } = req.body;

    if (!employeradminEmail || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const admin = await employerAdmin.findOne({ employeradminEmail });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    admin.employeradminPassword = hashedPassword;
    await admin.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error in employeradminChangePassword:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
exports.getAllEmployers = async (req, res) => {
  try {
    const employers = await Employer.find();
    res.status(200).json({
      success: true,
      count: employers.length,
      data: employers
    });
  } catch (err) {
    console.error('Error fetching employers:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};


exports.createemployersignUp = async (req, res) => {
  try {
    let {
      googleId,
      appleId,
      schoolName,
      firstName,
      lastName,
      address,
      organizationid,
      city,
      state,
      pincode,
      institutionName,
      board,
      institutionType,
      website,
      userEmail,
      userMobile,
      userPassword,
      userProfilePic,
      employerType,
      referralCode = "",
    } = req.body;

    // Trim all string fields
    schoolName = schoolName?.trim();
    firstName = firstName?.trim();
    lastName = lastName?.trim();
    address = address?.trim();
    city = city?.trim();
    state = state?.trim();
    pincode = pincode?.trim();
    institutionName = institutionName?.trim();
    board = board?.trim();
    institutionType = institutionType?.trim();
    website = website?.trim();
    userEmail = userEmail?.trim();
    userMobile = userMobile?.trim();
    userPassword = userPassword?.trim();
    userProfilePic = userProfilePic?.trim();
    employerType = employerType?.trim();
    referralCode = referralCode?.trim();

    // Validation: Require at least email or mobile
    if (!userEmail && !userMobile) {
      return res.status(400).json({ message: "Email or Mobile number is required." });
    }

    // Check for existing user
    const existingEmployer = await employerModel.findOne({
      $or: [{ userEmail }, { userMobile }],
    });

    if (existingEmployer) {
      return res.status(400).json({ message: "Employer already registered." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    // Handle referral logic
    let referredBy = null;
    let referredByName = null;
    if (referralCode) {
      const referringEmployer = await employerModel.findOne({ referralCode });
      if (!referringEmployer) {
        return res.status(400).json({ message: "Invalid referral code." });
      }
      referredBy = referringEmployer._id;
      referredByName = `${referringEmployer.firstName} ${referringEmployer.lastName}`.trim() || referringEmployer.schoolName || 'Unknown';
    }

    // Create new employer instance
    const newEmployer = new employerModel({
      uuid: uuidv4(),
      googleId,
      appleId,
      schoolName,
      firstName,
      lastName,
      address,
      organizationid,
      city,
      state,
      pincode,
      institutionName,
      board,
      institutionType,
      website,
      userEmail,
      userMobile,
      userPassword: hashedPassword,
      userProfilePic,
      employerType,
      referredBy,
      referredByName
    });

    // Generate referral code
    newEmployer.referralCode = newEmployer.generateReferralCode();

    // Save the new employer
    await newEmployer.save();

    // Update referral count, rewards, and add to referrals list
    if (referredBy) {
      const referralEntry = {
        referredEmployerId: newEmployer._id,
        referredEmployerName: `${newEmployer.firstName} ${newEmployer.lastName}`.trim() || newEmployer.schoolName || 'Unknown',
        referredEmployerEmail: newEmployer.userEmail,
        referredEmployerMobile: newEmployer.userMobile,
        referredDate: new Date(),
        rewardEarned: 100
      };

      await employerModel.findByIdAndUpdate(referredBy, {
        $push: {
          referralsList: referralEntry
        },
        $inc: {
          referralCount: 1,
          referralRewards: 100, // Customize this value if needed
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: newEmployer._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Success response
    return res.status(201).json({
      success: true,
      message: "Employer registered successfully",
      data: {
        id: newEmployer._id,
        uuid: newEmployer.uuid,
        firstName: newEmployer.firstName,
        lastName: newEmployer.lastName,
        userEmail: newEmployer.userEmail,
        userMobile: newEmployer.userMobile,
        referralCode: newEmployer.referralCode,
        referredBy: newEmployer.referredBy,
      },
      token,
    });

  } catch (err) {
    console.error("Employer SignUp Error:", err.message);
    console.error(err.stack);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate data entry",
        error: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during employer registration",
      error: err.message,
    });
  }
};

exports.getEmployersByOrganizationId = async (req, res) => {
  try {
    const { organizationid } = req.params;

    if (!organizationid) {
      return res.status(400).json({ message: "organizationid is required" });
    }

    const employers = await employerModel.find({ organizationid });

    res.status(200).json({
      success: true,
      count: employers.length,
      data: employers,
    });
  } catch (error) {
    console.error("Error fetching employers:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching employers",
      error: error.message,
    });
  }
};
// controller
exports.updateEmployerAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employeradminUsername,
      employeradminEmail,
      employeradminMobile,
      employeradminPassword,
      employerconfirmPassword
    } = req.body;

    const admin = await employerAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: "Employer admin not found" });
    }

    if (employeradminUsername) admin.employeradminUsername = employeradminUsername;
    if (employeradminEmail) admin.employeradminEmail = employeradminEmail;
    if (employeradminMobile) admin.employeradminMobile = employeradminMobile;

    // File Upload Check
    if (req.file) {
      console.log("File received:", req.file);
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'employerAdminProfilePics' },
        async (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            throw error;
          }
          admin.employeradminProfilePic = result.secure_url;
          await admin.save();
          return res.status(200).json({ message: "Employer admin updated successfully", data: admin });
        }
      ).end(req.file.buffer);
      return; // Important to return here to prevent double response
    }

    // Password update
    if (employeradminPassword || employerconfirmPassword) {
      if (employeradminPassword !== employerconfirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }
      const hashedPassword = await bcrypt.hash(employeradminPassword, 10);
      admin.employeradminPassword = hashedPassword;
    }

    await admin.save();
    return res.status(200).json({ message: "Employer admin updated successfully", data: admin });
  } catch (err) {
    console.error("Update Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getJobsByEmployerAdmin = async (req, res) => {
  try {
    // Step 1: Extract employerAdminId from request parameters
    const { employerAdminId } = req.params;
    console.log('Received employerAdminId:', employerAdminId);

    // Step 2: Validate employerAdminId as a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(employerAdminId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employer admin ID format',
      });
    }

    // Step 3: Fetch EmployerAdmin document by _id
    const admin = await EmployerAdmin.findById(employerAdminId).lean();
    console.log('Fetched employerAdmin:', admin);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Employer admin not found',
      });
    }

    // Step 4: Use admin._id as the organizationid
    const organizationId = admin._id.toString(); // Convert ObjectId to string
    console.log('Organization ID:', organizationId);

    // Step 5: Fetch employers with matching organizationid
    const employers = await Employer.find({
      organizationid: organizationId,
    }).select('_id').lean();
    console.log('Matching employers:', employers);

    if (employers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No employers found for this organization',
      });
    }

    // Step 6: Extract employer _id values for job query
    const employerIds = employers.map(employer => employer._id);

    // Step 7: Fetch jobs using aggregation to include employer data (like profile pic)
    const jobs = await Job.aggregate([
      {
        $match: {
          employid: { $in: [...employerIds.map(id => id.toString()), employerAdminId] }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $addFields: {
          employidObject: {
            $cond: {
              if: { $eq: [{ $strLenCP: "$employid" }, 24] },
              then: { $toObjectId: "$employid" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "employers",
          localField: "employidObject",
          foreignField: "_id",
          as: "employerInfo"
        }
      },
      {
        $lookup: {
          from: "employeradmins",
          localField: "employidObject",
          foreignField: "_id",
          as: "adminInfo"
        }
      },
      {
        $unwind: {
          path: "$employerInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: "$adminInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          employerProfilePic: {
            $ifNull: ["$employerInfo.userProfilePic", "$adminInfo.employeradminProfilePic"]
          }
        }
      },
      {
        $project: {
          employerInfo: 0,
          adminInfo: 0,
          employidObject: 0
        }
      }
    ]);
    console.log('Found jobs:', jobs.length);

    if (jobs.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: 'No jobs found for this employer admin'
      });
    }

    // Step 9: Return successful response with jobs
    return res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    // Step 10: Handle any errors
    console.error('Error fetching jobs by employer admin ID:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};



exports.deleteunit = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete the unit by ID
    const deletedUnit = await employerModel.findByIdAndDelete(id);

    if (!deletedUnit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Unit deleted successfully',
      data: deletedUnit,
    });
  } catch (error) {
    console.error('Error deleting unit:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
// ...existing code...
exports.sendConnectSubunitOtp = async (req, res) => {
  const { userEmail } = req.body;
  try {
    const employer = await Employer.findOne({ userEmail });
    if (!employer) {
      return res.status(404).json({ message: "Employer not found with this email" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;
    req.app.locals.otps = req.app.locals.otps || {};
    req.app.locals.otps[userEmail] = { otp, otpExpires };

    const emailTemplate = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
            <h2 style="color: #4A90E2;">Connect Subunit Request</h2>
            <p>An Employer Admin has requested to connect your account as a subunit to their organization.</p>
            <p>Please use the following OTP to authorize this connection:</p>
            <div style="background: #f8f9ff; padding: 15px; text-align: center; font-size: 30px; font-weight: bold; color: #4A90E2; border-radius: 8px;">
                ${otp}
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">This OTP is valid for 10 minutes. If you did not expect this request, please ignore this email.</p>
        </div>
    </body>
    </html>`;

    const sendEmail = require("../../utils/sendEmail");
    await sendEmail(userEmail, "🔐 Connect Subunit Request - EdProfio", null, emailTemplate);

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error in sendConnectSubunitOtp:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.verifyAndConnectSubunit = async (req, res) => {
  const { userEmail, otp, organizationid } = req.body;
  try {
    const storedData = req.app.locals.otps && req.app.locals.otps[userEmail];
    if (!storedData || storedData.otp !== otp || Date.now() > storedData.otpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const employer = await Employer.findOne({ userEmail });
    if (!employer) {
      return res.status(404).json({ message: "Employer not found" });
    }

    employer.organizationid = organizationid;
    await employer.save();

    delete req.app.locals.otps[userEmail];

    return res.status(200).json({
      success: true,
      message: "Subunit connected successfully",
      data: employer
    });
  } catch (err) {
    console.error("Error in verifyAndConnectSubunit:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getEmployerAdminDashboardStats = async (req, res) => {
  try {
    const { employerAdminId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employerAdminId)) {
      return res.status(400).json({ success: false, message: 'Invalid employer admin ID' });
    }

    // 1. Get Subunits (Employers)
    const subunits = await Employer.find({ organizationid: employerAdminId }).select('_id schoolName institutionName firstName lastName').lean();
    const subunitCount = subunits.length;
    const subunitIds = subunits.map(s => s._id.toString());

    // 2. Get Jobs posted by these subunits OR the admin themselves
    const jobs = await Job.find({ employid: { $in: [...subunitIds, employerAdminId] } }).lean();
    const totalJobs = jobs.length;

    // 3. Aggregate statistics
    let totalApplications = 0;
    let shortlisted = 0;
    let hired = 0;
    let rejected = 0;
    let interviewScheduled = 0;
    const uniqueApplicants = new Set();

    const subunitStatsMap = {};
    subunits.forEach(sub => {
      subunitStatsMap[sub._id.toString()] = {
        id: sub._id,
        name: sub.schoolName || sub.institutionName || `${sub.firstName} ${sub.lastName}` || 'Unnamed Subunit',
        jobsPosted: 0,
        applications: 0,
        hired: 0,
        shortlisted: 0,
        rejected: 0,
        interviewScheduled: 0
      };
    });

    jobs.forEach(job => {
      if (job.employid) {
        const subId = job.employid.toString();
        if (subunitStatsMap[subId]) {
          subunitStatsMap[subId].jobsPosted += 1;
          if (job.applications) {
            subunitStatsMap[subId].applications += job.applications.length;
            totalApplications += job.applications.length;

            job.applications.forEach(app => {
              if (app.applicantId) uniqueApplicants.add(app.applicantId.toString());

              const status = app.employapplicantstatus || 'Pending';
              if (status === 'Accepted' || status === 'Hired') {
                subunitStatsMap[subId].hired += 1;
                hired++;
              } else if (status === 'Shortlisted') {
                subunitStatsMap[subId].shortlisted += 1;
                shortlisted++;
              } else if (status === 'Rejected') {
                subunitStatsMap[subId].rejected += 1;
                rejected++;
              } else if (status === 'Interview Scheduled') {
                subunitStatsMap[subId].interviewScheduled += 1;
                interviewScheduled++;
              }
            });
          }
        }
      }
    });

    const toTitleCase = (str) => {
      if (!str) return "";
      return str.toLowerCase().split(' ').map(word => {
        return (word.charAt(0).toUpperCase() + word.slice(1));
      }).join(' ');
    };

    const subunitStats = Object.values(subunitStatsMap).map(sub => ({
      ...sub,
      name: toTitleCase(sub.name)
    })).sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      data: {
        subunitCount,
        totalJobs,
        totalApplications,
        totalCandidates: uniqueApplicants.size,
        shortlisted,
        hired,
        rejected,
        interviewScheduled,
        subunitStats
      }
    });

  } catch (error) {
    console.error('Error fetching employer admin stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
