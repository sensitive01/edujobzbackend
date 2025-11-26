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
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    JWT_SECRET: process.env.JWT_SECRET
};