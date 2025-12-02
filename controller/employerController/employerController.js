const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Job = require("../../models/jobSchema");
// Models: Use Employee for employee operations, Employer for employer operations
const Employee = require("../../models/employeeschema");
const Employer = require("../../models/employerSchema");
// Note: userModel is kept for backward compatibility but should use Employee instead
const userModel = Employee; // Alias for Employee model

const generateOTP = require("../../utils/generateOTP");
const jwtDecode = require("jwt-decode");
const jwksClient = require("jwks-rsa");
const sendEmail = require("../../utils/sendEmail");
const { v4: uuidv4 } = require("uuid");
const {
  cloudinary,
  profileImageStorage,
  resumeStorage,
  coverLetterStorage,
  profileVideoStorage,
} = require("../../config/cloudinary");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const appleKeysClient = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
});
const mongoose = require("mongoose");
const JobFilter = require("../../models/jobAlertModal");

// Email/Mobile Signup
const signUp = async (req, res) => {
  try {
    let {
      employerType,
      schoolName,
      userMobile,
      lastName,
      firstName,
      userEmail,
      userPassword,
      referralCode = "",
    } = req.body;

    // Trim all inputs
    employerType = employerType?.trim();
    schoolName = schoolName?.trim();
    userMobile = userMobile?.trim();
    lastName = lastName?.trim();
    firstName = firstName?.trim();
    userEmail = userEmail?.trim();
    userPassword = userPassword?.trim();
    referralCode = referralCode.trim();

    // Validation
    if (!userEmail && !userMobile) {
      return res.status(400).json({ message: "Email or mobile is required." });
    }

    // Check if user already exists
    const existUser = await Employer.findOne({
      $or: [{ userMobile }, { userEmail }],
    });

     if (existUser?.userEmail === userEmail && existUser?.userMobile == userMobile) {
      return res.status(400).json({
        message: "Employer email and mobile number is already registered.",
      });
    } else if (existUser?.userEmail === userEmail) {
      return res
        .status(400)
        .json({ message: "Employer email is already registered." });
    } else if (existUser?.userMobile == userMobile) {
      return res.status(400).json({
        message: "Employer mobile number is already registered.",
      });
    }


  
    // Hash password
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    // Handle referral code if provided
    let referredBy = null;
    let referredByName = null;
    if (referralCode) {
      const referringEmployer = await Employer.findOne({ referralCode });
      if (!referringEmployer) {
        return res.status(400).json({ message: "Invalid referral code." });
      }
      referredBy = referringEmployer._id;
      const referringName = `${referringEmployer.firstName || ''} ${referringEmployer.lastName || ''}`.trim();
      referredByName = referringName || referringEmployer.schoolName || 'Unknown';
    }

    // Create new employer
    const newEmployer = new Employer({
      uuid: uuidv4(),
      employerType,
      schoolName,
      userMobile,
      lastName,
      firstName,
      userEmail,
      verificationstatus: "pending",
      blockstatus: "unblock",
      userPassword: hashedPassword,
      emailverifedstatus: true,
      referredBy,
      referredByName,
    });

    // Generate unique referral code
    newEmployer.referralCode = newEmployer.generateReferralCode();

    // Save the new employer
    await newEmployer.save();

    // Update referrer's counts and add to referrals list if applicable
    if (referredBy) {
      const newEmployerName = `${newEmployer.firstName || ''} ${newEmployer.lastName || ''}`.trim();
      const referralEntry = {
        referredEmployerId: newEmployer._id,
        referredEmployerName: newEmployerName || newEmployer.schoolName || 'Unknown',
        referredEmployerEmail: newEmployer.userEmail,
        referredEmployerMobile: newEmployer.userMobile,
        referredDate: new Date(),
        rewardEarned: 100
      };

      await Employer.findByIdAndUpdate(referredBy, {
        $push: {
          referralsList: referralEntry
        },
        $inc: {
          referralCount: 1,
          referralRewards: 100, // You can adjust this value
        },
      });
    }

    // ✅ Send email with login details
    const loginLink = "https://gregarious-empanada-38a625.netlify.app/employer/login";
    const logoUrl = "../../assets/logo (1).png"; // put your actual EdProfio logo URL here

    let extraNote = "";
    if (userPassword === "defaultPassword123") {
      extraNote = '<p style="color:#d9534f;font-weight:bold;">⚠ Please change your password after logging in for security reasons.</p>';
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding:20px; max-width:600px; margin:auto; border:1px solid #eee; border-radius:10px;">
        <div style="text-align:center;">
          <img src="${logoUrl}" alt="EdProfio Logo" style="max-height:80px; margin-bottom:20px;" />
          <h2 style="color:#333;">Welcome to EdProfio!</h2>
        </div>
        <p>Hi <b> ${lastName}</b>,</p>
        <p>Your employer account has been successfully created.</p>

        <p><b>Login Credentials:</b></p>
        <ul>
          <li>Email: <b>${userEmail}</b></li>
          <li>Password: <b>${userPassword}</b></li>
        </ul>

        ${extraNote}

        <div style="text-align:center; margin:30px 0;">
          <a href="${loginLink}" style="background:#007bff; color:white; padding:12px 25px; text-decoration:none; border-radius:6px; font-weight:bold;">Login to Your Account</a>
        </div>

        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p style="margin-top:30px;">Best regards,<br/>The <b>EdProfio</b> Team</p>
      </div>
    `;

    await sendEmail(
      userEmail,
      "Welcome to EdProfio - Your Employer Account Details",
      "", // plain text fallback
      emailHtml // pass HTML
    );

    // Create JWT token
    const token = jwt.sign({ id: newEmployer._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Return success response
    res.status(201).json({
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
        verificationstatus: newEmployer.verificationstatus,
        blockstatus: newEmployer.blockstatus,
        emailverifedstatus: newEmployer.emailverifedstatus,
        referredBy: referredBy,
      },
      token,
    });
  } catch (err) {
    console.error("Error in employer registration:", err.message);
    console.error(err.stack);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Registration failed due to duplicate data",
        error: err.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: err.message,
    });
  }
};

const getAllEmployers = async (req, res) => {
  try {
    const employers = await Employer.find().select("-userPassword"); // Exclude password
    res.status(200).json(employers);
  } catch (error) {
    console.error("Error fetching employers:", error);
    res.status(500).json({ message: "Failed to fetch employers" });
  }
};
// Mobile Login (Based on Flutter App)
const mobileLogin = async (req, res) => {
  try {
    console.log('📱 Employer Mobile Login Request:', req.body);
    const { userEmail, userPassword, fcmToken } = req.body;

    // ---------- Input Validation ----------
    // Check if email is provided and not empty
    if (!userEmail || userEmail.trim() === '') {
      return res.status(400).json({ message: "Email is required." });
    }

    // Check if password is provided and not empty
    if (!userPassword || userPassword.trim() === '') {
      return res.status(400).json({ message: "Password is required." });
    }

    // ---------- Find user by email only (as per Flutter code) ----------
    const user = await Employer.findOne({ userEmail: userEmail.trim() });

    console.log('👤 User found:', user ? 'Yes' : 'No');
    if (!user) {
      return res
        .status(400)
        .json({ message: "User not found. Please check your credentials." });
    }

    // ---------- Password Check ----------
    const match = await bcrypt.compare(userPassword, user.userPassword);
    if (!match) {
      return res
        .status(400)
        .json({ message: "Invalid password. Try again." });
    }

    // ---------- FCM Token Save ----------
    if (fcmToken && typeof fcmToken === "string" && fcmToken.trim() !== '') {
      if (!Array.isArray(user.employerfcmtoken)) {
        user.employerfcmtoken = [];
      }

      if (!user.employerfcmtoken.includes(fcmToken)) {
        user.employerfcmtoken.push(fcmToken);
        await user.save();
        console.log('✅ FCM token saved for employer:', user._id);
      }
    }

    // ---------- Generate JWT ----------
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ---------- Remove Password ----------
    const safeUser = user.toObject();
    delete safeUser.userPassword;

    console.log('✅ Login successful for employer:', user._id);

    return res.status(200).json({
      message: "Login successful",
      user: safeUser,
      token,
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

const loginweb = async (req, res) => {
  try {
  
    const {  userEmail, userPassword} = req.body;
    console.log(userEmail, userPassword,req.body)
    

    // ---------- Input Validation ----------
    if (!userEmail) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await Employer.findOne({ userEmail:userEmail });
      console.log("user----->",user);


    if (!user) {
      return res
        .status(400)
        .json({ message: "User not found. Please check your credentials." });
    }

    // ---------- Password Check ----------
    const match = await bcrypt.compare(userPassword, user.userPassword);
    console.log(match);
    if (!match) {
      return res
        .status(400)
        .json({ message: "Invalid password. Try again." });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ---------- Remove Password ----------
    const safeUser = user.toObject();
    delete safeUser.userPassword;

    return res.json({
      message: "Login successful",
      user: safeUser,
      token,
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Google Sign-In
const googleAuth = async (req, res) => {
  const { idToken } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await Employer.findOne({ googleId: payload.sub });
    if (!user) {
      user = new Employer({
        uuid: generateUserUUID(),
        googleId: payload.sub,
        userEmail: payload.email,
        userName: payload.name,
        userProfilePic: payload.picture,
        isVerified: true,
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      message: "Google login successful",
      user,
      token,
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res
      .status(401)
      .json({ message: "Invalid Google token", error: err.message });
  }
};

// Google Sign-In V2 (Fixed version with uuidv4)
const googleAuthV2 = async (req, res) => {
  const { idToken } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await Employer.findOne({ googleId: payload.sub });
    if (!user) {
      user = new Employer({
        uuid: uuidv4(), // Using uuidv4() instead of generateUserUUID()
        googleId: payload.sub,
        userEmail: payload.email,
        userName: payload.name,
        userProfilePic: payload.picture,
        isVerified: true,
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      message: "Google login successful",
      user,
      token,
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res
      .status(401)
      .json({ message: "Invalid Google token", error: err.message });
  }
};

// Apple Sign-In
const appleAuth = async (req, res) => {
  const { idToken } = req.body;
  try {
    const decoded = jwtDecode(idToken);
    let user = await Employer.findOne({ appleId: decoded.sub });

    if (!user) {
      user = new Employer({
        uuid: uuidv4(),
        appleId: decoded.sub,
        userEmail: decoded.email,
        userName: "Apple User",
        isVerified: true,
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      message: "Apple login successful",
      user,
      token,
    });
  } catch (err) {
    console.error("Apple auth error:", err);
    res.status(401).json({ message: "Invalid Apple token" });
  }
};

// Note: This function seems to be a duplicate or incorrectly named
// It's using Employer model, so it should probably be removed or renamed
// Keeping it for backward compatibility but it should use getEmployerDetails instead
const getEmployeeDetails = async (req, res) => {
  try {
    const employerId = req.userId || req.params.id;

    if (!employerId) {
      return res.status(400).json({ message: "Employer ID is required" });
    }

    const employer = await Employer
      .findById(employerId)
      .select("-userPassword");

    if (!employer) {
      return res.status(404).json({ message: "Employer not found" });
    }

    res.json(employer);
  } catch (err) {
    console.error("Error fetching employer details:", err);
    if (err.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid employer ID format" });
    }
    res.status(500).json({ message: "Server error" });
  }
};
const applyForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const {
      applicantId,
      firstName,
      email,
      phone,
      resume,
      experience,
      jobrole,
      currentcity,
      profileurl, // <-- Extract profileurl from body
    } = req.body;

    // Optionally validate required fields
    // if (!applicantId || !firstName) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Missing required fields'
    //   });
    // }

    const application = {
      applicantId,
      firstName,
      email,
      phone,
      jobrole,
      experience,
      currentcity,
      resume: {
        name: resume?.name || "resume.pdf",
        url: resume?.url || "",
      },
      profileurl, // <-- Add profileurl to application
      status: "Applied",
    };

    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { $push: { applications: application } },
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: updatedJob.applications.slice(-1)[0],
    });
  } catch (error) {
    console.error("Error submitting application:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getApplicationStatus = async (req, res) => {
  try {
    const { jobId, applicantId } = req.params;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const application = job.applications.find(
      (app) => app.applicantId === applicantId
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found for this applicant",
      });
    }

    res.status(200).json({
      success: true,
      message: "Application status fetched successfully",
      status: application.status,
      application,
    });
  } catch (error) {
    console.error("Error fetching application status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// employeeController.js

const uploadFile = async (req, res) => {
  try {
    console.log("Inside controller");
    const { employid } = req.params;
    const fileType = req.query.fileType || req.body.fileType;

    // Validate inputs
    if (!employid || !mongoose.isValidObjectId(employid)) {
      return res.status(400).json({ message: "Valid employee ID is required" });
    }

    if (!fileType) {
      return res
        .status(400)
        .json({ message: "File type (fileType) is required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = req.file;

    // Check if we have a valid URL in the result
    if (!result.secure_url && !result.url && !result.path) {
      return res.status(500).json({
        message: "Cloudinary upload failed: No URL returned",
        details: result,
      });
    }

    console.log("response in upload", result);

    // Use secure_url if available, otherwise fall back to url or path
    const fileUrl = result.secure_url || result.url || result.path;

    // First, get the current employer to check for existing files
    const currentEmployer = await Employer.findById(employid);
    if (!currentEmployer) {
      return res.status(404).json({ message: "Employer not found" });
    }

    // Delete old file from Cloudinary if it exists
    try {
      switch (fileType) {
        case "profileImage":
          if (currentEmployer.userProfilePic) {
            const publicId = currentEmployer.userProfilePic
              .split("/")
              .slice(-2)
              .join("/")
              .split(".")[0];
            await cloudinary.uploader.destroy(publicId);
          }
          break;
        case "resume":
          if (currentEmployer.resume?.url) {
            const publicId = currentEmployer.resume.url
              .split("/")
              .slice(-2)
              .join("/")
              .split(".")[0];
            await cloudinary.uploader.destroy(publicId, {
              resource_type: "raw",
            });
          }
          break;
        case "coverLetter":
          if (currentEmployer.coverLetterFile?.url) {
            const publicId = currentEmployer.coverLetterFile.url
              .split("/")
              .slice(-2)
              .join("/")
              .split(".")[0];
            await cloudinary.uploader.destroy(publicId, {
              resource_type: "raw",
            });
          }
          break;
      }
    } catch (deleteError) {
      console.error("Error deleting old file:", deleteError);
      // Continue with the update even if deletion fails
    }

    // Prepare field update
    let updateField;
    switch (fileType) {
      case "profileImage":
        updateField = { userProfilePic: fileUrl };
        break;
      case "resume":
        updateField = {
          resume: {
            name: result.originalname || result.filename || "Unnamed",
            url: fileUrl,
          },
        };
        break;
      case "coverLetter":
        updateField = {
          coverLetterFile: {
            name: result.originalname || result.filename || "Unnamed",
            url: fileUrl,
          },
        };
        break;
      default:
        return res.status(400).json({ message: "Invalid file type provided" });
    }

    // Update employer document
    const updatedEmployer = await Employer.findByIdAndUpdate(
      employid,
      { $set: updateField },
      { new: true, runValidators: true }
    );

    if (!updatedEmployer) {
      return res.status(404).json({ message: "Employer not found" });
    }

    res.status(200).json({
      success: true,
      fileType,
      file: {
        name: result.originalname || result.filename || "Unnamed",
        url: fileUrl,
      },
      message: "File uploaded and saved successfully",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during file upload",
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { employid } = req.params;
    const profileData = req.body;

    // Update employer profile
    const updatedEmployer = await Employer.findByIdAndUpdate(
      employid,
      { $set: profileData },
      { new: true }
    );

    if (!updatedEmployer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedEmployer,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

const appliedjobsfetch = async (req, res) => {
  const { applicantId } = req.params;

  try {
    const jobs = await Job.aggregate([
      {
        $match: {
          "applications.applicantId": applicantId,
        },
      },
      {
        $addFields: {
          employidObject: { $toObjectId: "$employid" },
        },
      },
      {
        $lookup: {
          from: "employers",
          localField: "employidObject",
          foreignField: "_id",
          as: "employerInfo",
        },
      },
      {
        $unwind: {
          path: "$employerInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          employerProfilePic: "$employerInfo.userProfilePic",
          employerName: {
            $concat: ["$employerInfo.firstName", " ", "$employerInfo.lastName"],
          },
        },
      },
      {
        $project: {
          employerInfo: 0,
          employidObject: 0,
        },
      },
    ]);

    if (!jobs || jobs.length === 0) {
      return res
        .status(404)
        .json({ message: "No jobs found for this applicant." });
    }

    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching jobs by applicant:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const calculateProfileCompletion = (employee) => {
  let score = 0;
  const report = {
    basicInfo: 0,
    address: 0,
    education: 0,
    workExperience: 0,
    profileDetails: 0,
    documents: 0,
    socialLinks: 0,
    jobPreferences: 0,
    total: 0,
  };

  // Basic Info (20%)
  if (employee.userName) report.basicInfo += 3.33;
  if (employee.userEmail) report.basicInfo += 3.33;
  if (employee.userMobile) report.basicInfo += 3.33;
  if (employee.dob) report.basicInfo += 3.33;
  if (employee.gender) report.basicInfo += 3.33;
  if (employee.maritalStatus) report.basicInfo += 3.33;

  // Address (10%)
  if (employee.addressLine1) report.address += 2.5;
  if (employee.city) report.address += 2.5;
  if (employee.state) report.address += 2.5;
  if (employee.pincode) report.address += 2.5;

  // Education (15%)
  if (employee.education && employee.education.length > 0)
    report.education += 15;

  // Work Experience (15%)
  if (
    employee.totalExperience === "Fresher" ||
    (employee.workExperience && employee.workExperience.length > 0)
  )
    report.workExperience += 15;

  // Profile Details (15%)
  if (employee.userProfilePic) report.profileDetails += 3.75;
  if (employee.profilesummary) report.profileDetails += 3.75;
  if (employee.skills) report.profileDetails += 3.75;
  if (employee.languages) report.profileDetails += 3.75;

  // Documents (10%)
  if (employee.resume?.url) report.documents += 10;

  // Social/Online Links (5%)
  if (employee.github) report.socialLinks += 1.66;
  if (employee.linkedin) report.socialLinks += 1.66;
  if (employee.portfolio) report.socialLinks += 1.66;

  // Job Preferences (10%)
  // if (employee.preferredLocation) report.jobPreferences += 2;
  if (employee.expectedSalary) report.jobPreferences += 2;
  if (employee.currentCity) report.jobPreferences += 4;

  if (employee.gradeLevels) report.jobPreferences += 4;

  // Calculate Total
  report.total = Math.round(
    report.basicInfo +
      report.address +
      report.education +
      report.workExperience +
      report.profileDetails +
      report.documents +
      report.socialLinks +
      report.jobPreferences
  );

  return report;
};

const getProfileCompletion = async (req, res) => {
  try {
    const employer = await Employer.findById(req.params.id);
    if (!employer)
      return res.status(404).json({ message: "Employer not found" });

    const percentageReport = calculateProfileCompletion(employer);
    res.json({ total: percentageReport.total }); // Return only the total
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const userForgotPassword = async (req, res) => {
  try {
    const { userMobile } = req.body;

    const existUser = await Employer.findOne({ userMobile: userMobile });

    if (!existUser) {
      return res.status(404).json({
        message: "User not found with the provided contact number",
      });
    }

    if (!userMobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const otp = generateOTP();
    console.log("Generated OTP:", otp);

    req.app.locals.otp = otp;

    return res.status(200).json({
      message: "OTP sent successfully",
      otp: otp,
    });
  } catch (err) {
    console.log("Error in sending OTP in forgot password:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    if (req.app.locals.otp) {
      if (otp == req.app.locals.otp) {
        return res.status(200).json({
          message: "OTP verified successfully",
          success: true,
        });
      } else {
        return res.status(400).json({
          message: "Invalid OTP",
          success: false,
        });
      }
    } else {
      return res.status(400).json({
        message: "OTP has expired or is invalid",
        success: false,
      });
    }
  } catch (err) {
    console.log("Error in OTP verification:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const userChangePassword = async (req, res) => {
  try {
    console.log("Welcome to user change password");

    const { userMobile, password, confirmPassword } = req.body;

    // Validate inputs
    if (!userMobile || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Find the user by contact number
    const user = await Employer.findOne({ userMobile: userMobile });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's password field
    user.userPassword = hashedPassword;

    // Save the updated user to trigger schema validation and middleware
    await user.save();

    // Send success response
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error in user change password:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const candidateChangePassword = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Validate inputs
    if (!candidateId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find candidate
    const candidate = await Employer.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(
      currentPassword,
      candidate.userPassword
    );
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Prevent reusing old password
    const isSamePassword = await bcrypt.compare(
      newPassword,
      candidate.userPassword
    );
    if (isSamePassword) {
      return res
        .status(400)
        .json({ message: "New password cannot be same as old password" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update candidate's password
    candidate.userPassword = hashedPassword;
    await candidate.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error in candidateChangePassword:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const uploadProfileVideo = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const file = req.file;

    console.log("Received file:", file);

    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const fileInfo = {
      name: file.originalname,
      url: file.path,
      thumbnail: `${file.path}-thumbnail`, // Adjust if you're generating real thumbnails
    };

    const updatedEmployer = await Employer.findByIdAndUpdate(
      employeeId,
      { profileVideo: fileInfo },
      { new: true } // returns updated document (optional)
    );

    if (!updatedEmployer) {
      return res
        .status(404)
        .json({ success: false, message: "Employer not found" });
    }

    res.status(200).json({
      success: true,
      message: "Profile video uploaded successfully",
      file: fileInfo,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT: Upload intro audio for an employee
const uploadIntroAudio = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const updatedEmployer = await Employer.findByIdAndUpdate(
      employeeId,
      {
        introductionAudio: {
          name: file.originalname,
          url: file.path,
          duration: req.body.duration || 0,
        },
      },
      { new: true }
    );

    res.status(200).json({ success: true, employer: updatedEmployer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const sendOtpToEmail = async (req, res) => {
  const { userEmail } = req.body;

  try {
    // Find existing user or create new
    let employer = await Employer.findOne({ userEmail });

    if (!employer) {
      // If not found, create a new user with just the email
      employer = new Employer({ userEmail });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

    // Update OTP fields
    employer.otp = otp;
    employer.otpExpires = otpExpires;

    await employer.save();
    console.log(`OTP generated: ${otp} for email: ${userEmail}`);

    // Send email
    try {
      await sendEmail(userEmail, "Your OTP Code", `Your OTP is: ${otp}`);
      console.log("OTP email sent successfully");
    } catch (emailErr) {
      console.error("Failed to send OTP email:", emailErr);
      return res
        .status(500)
        .json({ message: "Failed to send OTP email", error: emailErr });
    }

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error in sendOtpToEmail:", error);
    return res.status(500).json({ message: "Error sending OTP", error });
  }
};

const verifyEmailOtp = async (req, res) => {
  const { userEmail, otp } = req.body;

  try {
    const employer = await Employer.findOne({ userEmail });

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

const verifyTheCandidateRegisterOrNot = async (req, res) => {
  try {
    const { candidateEmail } = req.params;

    const candidateData = await Employer.findOne({
      userEmail: candidateEmail,
    });

    if (!candidateData) {
      // Candidate not found → end response here
      return res.status(200).json({ exists: false });
    }

    // Candidate exists → create token
    const token = jwt.sign({ id: candidateData._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({ exists: true, candidateData, token });
  } catch (err) {
    console.error("Error verifying candidate:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const addJobAlert = async (req, res) => {
  try {
    console.log("submitData", req.body);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    console.log("token", token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id; // make sure your token payload has `id`

    const {
      salaryFrom,
      salaryTo,
      location,
      workType,
      experience,
      jobCategories,
    } = req.body;

    // ✅ Find by userId and update, or create new if not exists
    const updatedJobAlert = await JobFilter.findOneAndUpdate(
      { userId },
      {
        salaryFrom,
        salaryTo,
        location,
        workType,
        experience,
        jobCategories,
        userId,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      success: true,
      data: updatedJobAlert,
      message: "Job alert saved successfully",
    });
  } catch (err) {
    console.error("Error in addJobAlert:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getDesiredJobAlerts = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const userJobPreference = await JobFilter.findOne({ userId });
    if (!userJobPreference) {
      return res.status(404).json({ message: "No job preference found" });
    }

    const query = {
      $or: [],
    };

    if (userJobPreference.salaryFrom && userJobPreference.salaryTo) {
      query.$or.push({
        $and: [
          { salaryFrom: { $lte: userJobPreference.salaryTo } },
          { salaryTo: { $gte: userJobPreference.salaryFrom } },
        ],
      });
    }

    if (userJobPreference.location) {
      query.$or.push({ location: userJobPreference.location });
    }

    if (userJobPreference.workType) {
      query.$or.push({ jobType: userJobPreference.workType });
    }

    if (userJobPreference.experience) {
      query.$or.push({ experienceLevel: userJobPreference.experience });
    }

    if (userJobPreference.jobCategories?.length > 0) {
      query.$or.push({ category: { $in: userJobPreference.jobCategories } });
    }

    if (query.$or.length === 0) {
      return res.status(200).json({ jobAlerts: [] });
    }

    const jobAlerts = await Job.find(query);

    return res.status(200).json({ jobAlerts, userJobPreference });
  } catch (err) {
    console.error("Error getting desired job alerts:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const getDesiredJobAlertswithouttoken = async (req, res) => {
  try {
    const { userId } = req.query; // ✅ Change from req.body to req.query

    // Validate userId presence
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const userJobPreference = await JobFilter.findOne({ userId });
    if (!userJobPreference) {
      return res
        .status(404)
        .json({ success: false, message: "No job preference found" });
    }

    const query = {
      $or: [],
    };

    // Match salary range
    if (userJobPreference.salaryFrom && userJobPreference.salaryTo) {
      query.$or.push({
        $and: [
          { salaryFrom: { $lte: userJobPreference.salaryTo } },
          { salaryTo: { $gte: userJobPreference.salaryFrom } },
        ],
      });
    }

    // Match location
    if (userJobPreference.location) {
      query.$or.push({ location: userJobPreference.location });
    }

    // Match work type
    if (userJobPreference.workType) {
      query.$or.push({ jobType: userJobPreference.workType });
    }

    // Match experience level
    if (userJobPreference.experience) {
      query.$or.push({ experienceLevel: userJobPreference.experience });
    }

    // Match categories
    if (userJobPreference.jobCategories?.length > 0) {
      query.$or.push({ category: { $in: userJobPreference.jobCategories } });
    }

    // If no filters available
    if (query.$or.length === 0) {
      return res
        .status(200)
        .json({ success: true, jobAlerts: [], userJobPreference });
    }

    const jobAlerts = await Job.find(query);

    return res
      .status(200)
      .json({ success: true, jobAlerts, userJobPreference });
  } catch (err) {
    console.error("Error getting desired job alerts:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const addwithouttoeken = async (req, res) => {
  try {
    console.log("submitData", req.body);

    const {
      userId,
      salaryFrom,
      salaryTo,
      location,
      workType,
      experience,
      jobCategories,
    } = req.body;

    // Validate userId presence
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    // Find by userId and update, or create new if not exists
    const updatedJobAlert = await JobFilter.findOneAndUpdate(
      { userId },
      {
        salaryFrom,
        salaryTo,
        location,
        workType,
        experience,
        jobCategories,
        userId,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      success: true,
      data: updatedJobAlert,
      message: "Job alert saved successfully",
    });
  } catch (err) {
    console.error("Error in addJobAlert:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const fetchAvailabilityStatus = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid employee ID" });
    }

    const employee = await Employee.findById(employeeId).select("isAvailable");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      message: "Availability status fetched successfully",
      isAvailable: employee.isAvailable || false,
    });
  } catch (error) {
    console.error("Error fetching availability status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateAvailabilityStatus = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const { isAvailable } = req.body;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid employee ID" });
    }

    if (typeof isAvailable !== "boolean") {
      return res
        .status(400)
        .json({ message: "isAvailable must be a boolean value" });
    }

    const employee = await Employee.findByIdAndUpdate(
      employeeId,
      {
        isAvailable,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true }
    ).select("isAvailable userName userEmail");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      message: "Availability status updated successfully",
      employee: {
        id: employee._id,
        userName: employee.userName,
        userEmail: employee.userEmail,
        isAvailable: employee.isAvailable,
      },
    });
  } catch (error) {
    console.error("Error updating availability status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteAudioRecord = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $unset: { introductionAudio: "" } },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.status(200).json({
      message: "Introduction audio deleted successfully",
      employee: updatedEmployee,
    });
  } catch (err) {
    console.error("Error deleting audio record:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteProfileAudioRecord = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $unset: { profileVideo: "" } },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.status(200).json({
      message: "Profile video  removed successfully",
      employee: updatedEmployee,
    });
  } catch (err) {
    console.error("Error profile video:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteCoverLetter = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $unset: { coverLetterFile: "" } },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.status(200).json({
      message: "Cover letter removed successfully",
      employee: updatedEmployee,
    });
  } catch (err) {
    console.error("Error in remove cover letter:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteResumeLetter = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $unset: { resume: "" } },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.status(200).json({
      message: "Resume removed successfully",
      employee: updatedEmployee,
    });
  } catch (err) {
    console.error("Error in remove resume:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getHeaderCategoriesCount = async (req, res) => {
  try {
    // Predefined categories (you can modify this list if needed)
    const categories = [
      "Teaching Jobs",
      "Leadership and Administration",
      "Support and Student Welfare",
      "Extracurricular Activities",
      "Curriculum and Content Development",
      "EdTech and Digital Learning",
      "Special Education and Inclusive Learning",
      "Non-Teaching Staffs",
      "Training and Development",
      "Research and Policy Development",
      "Other Specialized Roles",
    ];

    const categoryCounts = [];

    for (const category of categories) {
      const count = await Job.countDocuments({ category });
      categoryCounts.push({ category, count });
    }

    // Send response
    res.status(200).json({
      success: true,
      data: categoryCounts,
    });
  } catch (err) {
    console.error("Error in getting category counts:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching category counts",
      error: err.message,
    });
  }
};

// Get referral list for an employee
const getReferralList = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    // Get the employer's referral data including the referralsList
    const employer = await Employer.findById(employeeId).select("referralCount referralRewards referralsList");
    const employerReferralCount = employer?.referralCount || 0;
    const employerReferralRewards = employer?.referralRewards || 0;
    const referralsList = employer?.referralsList || [];

    // Format the referrals list from the stored array
    const referralList = referralsList.map((referral) => {
      // Format date
      const date = referral.referredDate
        ? new Date(referral.referredDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      return {
        name: referral.referredUserName || "N/A",
        email: referral.referredUserEmail || "N/A",
        mobile: referral.referredUserMobile || "N/A",
        date: date,
        rewardEarned: referral.rewardEarned || 100,
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by newest first

    res.status(200).json({
      success: true,
      data: referralList,
      totalReferrals: referralList.length,
      referralCount: employerReferralCount, // Total referral count from employer profile
      referralRewards: employerReferralRewards, // Total rewards earned
    });
  } catch (err) {
    console.error("Error in getting referral list:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching referral list",
      error: err.message,
    });
  }
};

// Decrease profile view count when employer views an employee profile
const decreaseProfileView = async (req, res) => {
  try {
    const { employerId, employeeId } = req.params;

    if (!employerId || !employeeId) {
      return res.status(400).json({ 
        success: false, 
        message: "Employer ID and Employee ID are required" 
      });
    }

    const employer = await Employer.findById(employerId);
    if (!employer) {
      return res.status(404).json({ 
        success: false, 
        message: "Employer not found" 
      });
    }

    // Decrease totalprofileviews if greater than 0
    if (employer.totalprofileviews > 0) {
      employer.totalprofileviews -= 1;
      await employer.save();
    }

    // Add to viewedEmployees array if not already present
    const existingView = employer.viewedEmployees.find(
      view => view.employeeId.toString() === employeeId
    );

    if (!existingView) {
      employer.viewedEmployees.push({
        employeeId: employeeId,
        viewedAt: new Date()
      });
      await employer.save();
    }

    return res.status(200).json({
      success: true,
      message: "Profile view decreased",
      remainingViews: employer.totalprofileviews
    });
  } catch (error) {
    console.error("Error decreasing profile view:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Decrease resume download count when employer downloads a resume
const decreaseResumeDownload = async (req, res) => {
  try {
    const { employerId, employeeId } = req.params;

    if (!employerId || !employeeId) {
      return res.status(400).json({ 
        success: false, 
        message: "Employer ID and Employee ID are required" 
      });
    }

    const employer = await Employer.findById(employerId);
    if (!employer) {
      return res.status(404).json({ 
        success: false, 
        message: "Employer not found" 
      });
    }

    // Decrease totaldownloadresume if greater than 0
    if (employer.totaldownloadresume > 0) {
      employer.totaldownloadresume -= 1;
      await employer.save();
    }

    // Add to resumedownload array if not already present
    const existingDownload = employer.resumedownload.find(
      download => download.employeeId.toString() === employeeId
    );

    if (!existingDownload) {
      employer.resumedownload.push({
        employeeId: employeeId,
        viewedAt: new Date()
      });
      await employer.save();
    }

    return res.status(200).json({
      success: true,
      message: "Resume download decreased",
      remainingDownloads: employer.totaldownloadresume
    });
  } catch (error) {
    console.error("Error decreasing resume download:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get employer details by ID
// Get employer details by ID
const getEmployerDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Employer ID is required" });
    }

    // Check if ID is a valid MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: "Invalid employer ID format",
        providedId: id
      });
    }

    // Find the employer and exclude only the password
    // Use .lean() to get plain JavaScript object with all fields
    const employer = await Employer
      .findById(id)
      .select("-userPassword")
      .lean();

    if (!employer) {
      return res.status(404).json({ message: "Employer not found" });
    }

    // Return all fields
    res.json(employer);
  } catch (err) {
    console.error("Error fetching employer details:", err);

    if (err.kind === "ObjectId" || err.name === "CastError") {
      return res.status(400).json({ message: "Invalid employer ID format" });
    }

    res.status(500).json({ message: "Server error" });
  }
};
// Update employer details
const updateEmployerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Employer ID is required"
      });
    }

    // Remove password from update data if present (should be updated separately)
    delete updateData.userPassword;

    const employer = await Employer.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select("-userPassword");

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Employer details updated successfully",
      data: employer
    });
  } catch (error) {
    console.error("Error updating employer details:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Update employer profile picture
const updateProfilePicture = async (req, res) => {
  try {
    const { employid } = req.params;

    if (!employid) {
      return res.status(400).json({
        success: false,
        message: "Employer ID is required"
      });
    }

    const employer = await Employer.findById(employid);

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found"
      });
    }

    // If file was uploaded, update profile picture URL
    if (req.file && req.file.path) {
      employer.userProfilePic = req.file.path;
      await employer.save();
    }

    res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: {
        userProfilePic: employer.userProfilePic
      }
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// List all employees (for employer to view)
const listAllEmployees = async (req, res) => {
  try {
    const employees = await Employer.find().select("-userPassword").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Check if employer is subscribed
const getEmployerSubscribed = async (req, res) => {
  try {
    const { employerId } = req.params;

    if (!employerId) {
      return res.status(400).json({
        success: false,
        message: "Employer ID is required"
      });
    }

    const employer = await Employer.findById(employerId).select("subscription subscriptionleft subscriptionenddate currentSubscription");

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found"
      });
    }

    res.status(200).json({
      success: true,
      isSubscribed: employer.subscription === "true",
      subscriptionLeft: employer.subscriptionleft,
      subscriptionEndDate: employer.subscriptionenddate,
      currentSubscription: employer.currentSubscription
    });
  } catch (error) {
    console.error("Error checking employer subscription:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Employer forgot password - send OTP
const employerForgotPassword = async (req, res) => {
  try {
    const { userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const employer = await Employer.findOne({ userEmail });

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found with this email"
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    employer.otp = otp;
    employer.otpExpires = otpExpires;
    await employer.save();

    // TODO: Send OTP via email
    console.log("OTP for employer:", otp);

    res.status(200).json({
      success: true,
      message: "OTP sent to email",
      otp: otp // Remove in production
    });
  } catch (error) {
    console.error("Error in employer forgot password:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Verify OTP for employer
const employerverifyOTP = async (req, res) => {
  try {
    const { userEmail, otp } = req.body;

    if (!userEmail || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    const employer = await Employer.findOne({ userEmail });

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found"
      });
    }

    if (!employer.otp || employer.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    if (employer.otpExpires && new Date() > employer.otpExpires) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired"
      });
    }

    // Clear OTP after verification
    employer.otp = undefined;
    employer.otpExpires = undefined;
    await employer.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully"
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Employer change password (after OTP verification)
const employerChangePassword = async (req, res) => {
  try {
    const { userEmail, newPassword, confirmPassword } = req.body;

    if (!userEmail || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, new password, and confirm password are required"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    const employer = await Employer.findOne({ userEmail });

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    employer.userPassword = hashedPassword;
    await employer.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Employer change my password (when logged in)
const employerChangeMyPassword = async (req, res) => {
  try {
    const { employerId } = req.params;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password, new password, and confirm password are required"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match"
      });
    }

    const employer = await Employer.findById(employerId);

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found"
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, employer.userPassword);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    employer.userPassword = hashedPassword;
    await employer.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get referral link for employer
const getReferralLink = async (req, res) => {
  try {
    const { userId } = req.params;

    const employer = await Employer.findById(userId);

    if (!employer || !employer.referralCode) {
      return res.status(404).json({
        success: false,
        message: "Referral code not found for this employer"
      });
    }

    const referralUrl = `https://edprofio.com/signup?ref=${employer.referralCode}`;

    res.status(200).json({
      success: true,
      referralCode: employer.referralCode,
      referralUrl: referralUrl
    });
  } catch (error) {
    console.error("Error getting referral link:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get job and employer count
const getJobAndEmployerCount = async (req, res) => {
  try {
    const jobCount = await Job.countDocuments({ isActive: true });
    const employerCount = await Employer.countDocuments({ subscription: "true" });

    res.status(200).json({
      success: true,
      data: {
        activeJobs: jobCount,
        subscribedEmployers: employerCount
      }
    });
  } catch (error) {
    console.error("Error getting counts:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get employer dashboard count
const getEmployerDashboardCount = async (req, res) => {
  try {
    const { employerId } = req.params;

    if (!employerId) {
      return res.status(400).json({
        success: false,
        message: "Employer ID is required"
      });
    }

    const employer = await Employer.findById(employerId);

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found"
      });
    }

    // Count active jobs
    const activeJobsCount = await Job.countDocuments({
      employid: employerId,
      isActive: true
    });

    // Count total applications
    const jobs = await Job.find({ employid: employerId });
    const totalApplications = jobs.reduce((sum, job) => sum + (job.applications?.length || 0), 0);

    // Count pending applications
    const pendingApplications = jobs.reduce((sum, job) => {
      const pending = job.applications?.filter(app => app.employapplicantstatus === "Pending") || [];
      return sum + pending.length;
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        activeJobs: activeJobsCount,
        totalApplications: totalApplications,
        pendingApplications: pendingApplications,
        totalProfileViews: employer.totalprofileviews || 0,
        totalResumeDownloads: employer.totaldownloadresume || 0,
        subscriptionStatus: employer.subscription === "true",
        subscriptionLeft: employer.subscriptionleft || 0
      }
    });
  } catch (error) {
    console.error("Error getting employer dashboard count:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

//hbh
module.exports = {
  getHeaderCategoriesCount,
  deleteResumeLetter,
  deleteCoverLetter,
  deleteProfileAudioRecord,
  deleteAudioRecord,
  addwithouttoeken,
  addJobAlert,
  getDesiredJobAlerts,
  verifyTheCandidateRegisterOrNot,
  sendOtpToEmail,
  verifyEmailOtp,
  signUp,
  mobileLogin,
  loginweb,
  getDesiredJobAlertswithouttoken,
  googleAuth,
  googleAuthV2,
  getEmployeeDetails,
  appleAuth,
  uploadFile,
  uploadProfileVideo,
  applyForJob,
  uploadIntroAudio,
  userChangePassword,
  userForgotPassword,
  verifyOTP,
  getAllEmployers,
  getProfileCompletion,
  calculateProfileCompletion,
  getApplicationStatus,
  appliedjobsfetch,
  updateProfile,
  candidateChangePassword,
  fetchAvailabilityStatus, // <-- Add this
  updateAvailabilityStatus,
  getReferralList,
  decreaseProfileView,
  decreaseResumeDownload,
  getEmployerDetails,
  updateEmployerDetails,
  updateProfilePicture,
  listAllEmployees,
  getEmployerSubscribed,
  employerForgotPassword,
  employerverifyOTP,
  employerChangePassword,
  employerChangeMyPassword,
  getReferralLink,
  getJobAndEmployerCount,
  getEmployerDashboardCount,
};