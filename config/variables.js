require("dotenv").config();

module.exports = {
    PORT: process.env.PORT || 3002,
    MONGO_USERNAME: process.env.MONGO_USERNAME,
    MONGO_PASSWORD: process.env.MONGO_PASSWORD,
    MONGO_DATABASE_NAME: process.env.MONGO_DATABASE_NAME,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    // Firebase Configuration
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'edujobz-d714c',
    FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT,
    FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    JWT_SECRET: process.env.JWT_SECRET
};