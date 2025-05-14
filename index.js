require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dbConnect = require("./config/dbConnect.js");
const employeeRoute = require("./routes/employee/employeeRoute.js");
const employerRoute = require("./routes/employer/employerRoute.js");
const app = express();
const { PORT } = require("./config/variables.js");

app.set("trust proxy", true);

// DATABASE CONNECTION
dbConnect();

app.use(cookieParser());
app.use(express.json());

const allowedOrigins = ["http://16.171.12.142:3000", "http://localhost:5173", "http://127.0.0.1:5500", "http://localhost:4000/", "http://localhost:56222", "http://localhost:56966", "https://edujobz.netlify.app", "http://localhost:3000", "http://localhost:3001", "https://parmywheels-admin-ui.vercel.app", "https://parmywheels-vendor-ui.vercel.app"];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS error for origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.disable("x-powered-by");

app.use("/", employeeRoute);
app.use("/employer", employerRoute);

// 404 Route Handling
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});