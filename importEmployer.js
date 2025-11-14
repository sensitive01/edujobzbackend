const mongoose = require("mongoose");
const XLSX = require("xlsx");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const userModel = require("./models/employerSchema"); // your schema path
const dbConnect = require("./config/dbConnect");




async function processRow(row, index) {
    try {
        const firstName = (row["Name"] || "").trim();

        const employerType = (row["Sector"] || "").trim();
        const lastName = "";
        const schoolName = (row["Names of instution"] || "").trim();
        const userEmail = (row["Email"] || "").trim();
        const userPasswordRaw = (row["Password"] || "").trim();
        const userMobile = (row["Ph no"] || "").toString().trim();

        if (!userEmail && !userMobile) {
            console.log(`❌ Row ${index}: Missing Email and Mobile`);
            return;
        }

        // Check duplicate employer
        const existUser = await userModel.findOne({
            $or: [{ userEmail }, { userMobile }],
        });

        if (existUser) {
            console.log(`⚠️ Row ${index}: Duplicate skipped → ${userEmail}`);
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userPasswordRaw, 10);

        const newEmployer = new userModel({
            uuid: uuidv4(),
            employerType,
            schoolName,
            firstName,
            lastName,
            userEmail,
            userMobile,
            userPassword: hashedPassword,
            verificationstatus: "pending",
            blockstatus: "unblock",
            emailverifedstatus: true,
        });

        newEmployer.referralCode = newEmployer.generateReferralCode();

        await newEmployer.save();

        // Send Email
        const loginLink = "https://gregarious-empanada-38a625.netlify.app/employer/login";
        const emailHtml = `
      <div style="font-family: Arial; padding:20px;">
        <h2>Welcome to EdProfio</h2>
        <p><b>Login Credentials:</b></p>
        <ul>
          <li>Email: ${userEmail}</li>
          <li>Password: ${userPasswordRaw}</li>
        </ul>
        <a href="${loginLink}">Login here</a>
      </div>
    `;

        // await sendEmail(
        //   userEmail,
        //   "Your Employer Login Credentials - EdProfio",
        //   "",
        //   emailHtml
        // );

        // console.log(`✅ Row ${index}: Imported → ${userEmail}`);
    } catch (err) {
        console.log(`❌ ERROR Row ${index}: ${err.message}`);
    }
}

async function startImport() {
    try {
        dbConnect()

        const workbook = XLSX.readFile("./assets/Book1.xlsx");
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        console.log(`📌 Total Rows: ${rows.length}`);

        for (let i = 0; i < rows.length; i++) {
            await processRow(rows[i], i + 1);
        }

        console.log("🎉 Import Completed!");
        mongoose.connection.close();
    } catch (err) {
        console.error("Import Error:", err);
    }
}

startImport();
