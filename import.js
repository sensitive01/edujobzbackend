const XLSX = require("xlsx");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Employee = require("./models/employeeschema");
const dbConnect = require("./config/dbConnect");

// ======================
// MongoDB Connection
// ======================
(async () => {
    try {
        dbConnect()
        await importEmployees();
    } catch (err) {
        console.error("DB connection error:", err);
        process.exit();
    }
})();

// ======================
// Excel Import Function
// ======================
async function importEmployees() {
    try {
        const workbook = XLSX.readFile("./assets/EdProfio-Testing Email & Contact Details.xlsx");
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        for (const row of rows) {
            const name = row.Name;
            const email = row.Email?.toLowerCase().trim();
            const password = row.Password;
            const mobile = row["Ph no"]?.toString();

            console.log("name", name);
            console.log("email", email);
            console.log("password", password);
            console.log("mobile", mobile);

            if (!name || !email || !password || !mobile) continue;

            const exists = await Employee.findOne({
                $or: [{ userEmail: email }, { userMobile: mobile }],
            });

            if (exists) {
                console.log(`Skipping: User already exists → ${email}`);
                continue;
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = new Employee({
                uuid: crypto.randomUUID(),
                userName: name,
                userEmail: email,
                userMobile: mobile,
                userPassword: hashedPassword,
                emailverifedstatus: true,
                isVerified: true,
                blockstatus: "unblock",
            });

            newUser.referralCode = newUser.generateReferralCode();
            await newUser.save();

            console.log(`Inserted: ${name} (${email})`);
        }

        console.log("Excel import completed!");
        process.exit();
    } catch (err) {
        console.error("Error importing Excel:", err);
        process.exit();
    }
}
