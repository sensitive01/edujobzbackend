require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dbConnect = require("./config/dbConnect.js");
const employeeRoute = require("./routes/employee/employeeRoute.js");
const employerRoute = require("./routes/employer/employerRoute.js");
const mainadminRoute = require("./routes/mainadmin/mainadmin.js");
const employerAdminRoute = require("./routes/admin/employeradminRoute.js");
const Employer = require("./models/employerSchema.js");
const Employee = require("./models/employeeschema.js");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const { PORT } = require("./config/variables.js");
const cron = require('node-cron');
app.set("trust proxy", true);

const server = http.createServer(app);

// DATABASE CONNECTION
dbConnect();

app.use(cookieParser());
app.use(express.json());

const allowedOrigins = ["https://edujobz.com", "https://keen-panda-d7dc32.netlify.app", "http://localhost:63003", "http://16.171.12.142:3000", "http://localhost:5173", "https://edujobzz.netlify.app", "http://127.0.0.1:5500", "http://localhost:4000/", "http://localhost:56222", "http://localhost:56966", "https://edujobz.netlify.app", "http://localhost:3000", "http://localhost:3001", "https://parmywheels-admin-ui.vercel.app", "https://parmywheels-vendor-ui.vercel.app", "https://spectacular-druid-ec619d.netlify.app", "https://edprofio.com", "www.edprofio.com", "https://www.edprofio.com"];
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

const io = new Server(server, {
  cors: corsOptions,
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Join a personal room for private calling signaling
  socket.on("join_user_room", (userId) => {
    socket.join(userId);
    console.log(`User ${socket.id} joined personal room: ${userId}`);
  });

  // Join conversation room for chat
  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${socket.id} joined conversation: ${conversationId}`);
  });

  // Send Message
  socket.on("send_message", (data) => {
    socket.to(data.conversationId).emit("receive_message", data);
  });

  // WebRTC Signaling
  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("callUser", {
      signal: data.signalData,
      from: data.from,
      name: data.name,
      isVideo: data.isVideo
    });
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });

  socket.on("endCall", (data) => {
    io.to(data.to).emit("callEnded");
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

app.disable("x-powered-by");

app.use("/", employeeRoute);
app.use("/employer", employerRoute);
app.use("/employeradmin", employerAdminRoute);
app.use("/admin", mainadminRoute);
// 404 Route Handling
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});
cron.schedule("59 23 * * *", async () => {
  console.log("⏰ Running daily employer subscription & trial check...");

  try {
    const today = new Date();

    // 1. TRIAL CHECK: Employers still in trial mode
    const trialEmployers = await Employer.find({
      trial: "false", // Assuming "false" means trial is active
      'currentSubscription.isTrial': true,
      'currentSubscription.startDate': { $exists: true }
    });

    const Job = require('./models/jobSchema');

    for (const employer of trialEmployers) {
      const trialStart = new Date(employer.currentSubscription.startDate);
      const diffDays = Math.floor((today - trialStart) / (1000 * 60 * 60 * 24));

      if (diffDays >= 30) {
        employer.trial = "true"; // Trial completed
        employer.subscription = "false";
        employer.subscriptionleft = 0;
        employer.currentSubscription = null; // Clear current subscription

        // Reset all limits to 0 when trial expires
        employer.totalperdaylimit = 0;
        employer.totalprofileviews = 0;
        employer.totaldownloadresume = 0;
        employer.totaljobpostinglimit = 0;

        // Update subscription status in subscriptions array
        if (employer.subscriptions && employer.subscriptions.length > 0) {
          const activeSub = employer.subscriptions.find(sub => sub.status === 'active');
          if (activeSub) {
            activeSub.status = 'expired';
          }
        }

        // Deactivate all active jobs when trial expires
        const activeJobs = await Job.find({
          employid: employer._id,
          isActive: true
        });

        if (activeJobs.length > 0) {
          for (const job of activeJobs) {
            job.isActive = false;
            await job.save();
          }
          console.log(`🔴 Deactivated ${activeJobs.length} jobs for employer: ${employer.schoolName || employer.uuid} (trial expired)`);
        }

        console.log(`✅ Trial ended for employer: ${employer.schoolName || employer.uuid} - All limits reset to 0`);
        await employer.save();
      }
    }

    // 2. SUBSCRIPTION DECREMENT: Active subscriptions
    const activeEmployers = await Employer.find({
      subscription: "true",
      subscriptionleft: { $gt: 0 }
    });

    for (const employer of activeEmployers) {
      let left = parseInt(employer.subscriptionleft);
      left -= 1;
      employer.subscriptionleft = left.toString();

      if (employer.subscriptionleft <= 0) {
        employer.subscription = "false";
        employer.subscriptionleft = 0; // Ensure no negative values
        employer.currentSubscription = null; // Clear current subscription

        // Reset all limits to 0 when subscription expires
        employer.totalperdaylimit = 0;
        employer.totalprofileviews = 0;
        employer.totaldownloadresume = 0;
        employer.totaljobpostinglimit = 0;

        // Update subscription status in subscriptions array
        if (employer.subscriptions && employer.subscriptions.length > 0) {
          const activeSub = employer.subscriptions.find(sub => sub.status === 'active');
          if (activeSub) {
            activeSub.status = 'expired';
          }
        }

        // Deactivate all active jobs when subscription expires
        const activeJobs = await Job.find({
          employid: employer._id,
          isActive: true
        });

        if (activeJobs.length > 0) {
          for (const job of activeJobs) {
            job.isActive = false;
            await job.save();
          }
          console.log(`🔴 Deactivated ${activeJobs.length} jobs for employer: ${employer.schoolName || employer.uuid}`);
        }

        console.log(`🚫 Subscription expired for employer: ${employer.schoolName || employer.uuid} - All limits reset to 0`);
      } else {
        console.log(`📉 Decremented subscription for: ${employer.schoolName || employer.uuid} (${employer.subscriptionleft} days left)`);
      }

      await employer.save();
    }

    // 3. CHECK EXPIRED SUBSCRIPTIONS BY END DATE (Additional safety check)
    const employersWithSubscriptions = await Employer.find({
      subscription: "true",
      currentSubscription: { $ne: null }
    });

    for (const employer of employersWithSubscriptions) {
      if (employer.currentSubscription && employer.currentSubscription.endDate) {
        const endDate = new Date(employer.currentSubscription.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        // If subscription end date has passed
        if (endDate < today) {
          employer.subscription = "false";
          employer.subscriptionleft = 0;
          employer.currentSubscription = null;

          // Reset all limits to 0
          employer.totalperdaylimit = 0;
          employer.totalprofileviews = 0;
          employer.totaldownloadresume = 0;
          employer.totaljobpostinglimit = 0;

          // Update subscription status in subscriptions array
          if (employer.subscriptions && employer.subscriptions.length > 0) {
            const activeSub = employer.subscriptions.find(sub => sub.status === 'active');
            if (activeSub) {
              activeSub.status = 'expired';
            }
          }

          // Deactivate all active jobs
          const activeJobs = await Job.find({
            employid: employer._id,
            isActive: true
          });

          if (activeJobs.length > 0) {
            for (const job of activeJobs) {
              job.isActive = false;
              await job.save();
            }
            console.log(`🔴 Deactivated ${activeJobs.length} jobs for employer: ${employer.schoolName || employer.uuid} (by end date)`);
          }

          await employer.save();
          console.log(`🚫 Subscription expired (by end date) for employer: ${employer.schoolName || employer.uuid} - All limits reset to 0`);
        }
      }
    }

    // 4. ENFORCE JOB LIMITS: Check all employers and deactivate excess jobs
    const allEmployers = await Employer.find({
      subscription: "true"
    });

    for (const employer of allEmployers) {
      // Get the effective job limit - use totaljobpostinglimit as primary, fallback to subscription plan limit
      let allowedJobLimit = 0;
      if (employer.currentSubscription && employer.currentSubscription.planDetails) {
        allowedJobLimit = employer.currentSubscription.planDetails.jobPostingLimit || 0;
      }

      // Use totaljobpostinglimit as primary limit, fallback to subscription plan limit if totaljobpostinglimit is 0
      const effectiveLimit = employer.totaljobpostinglimit > 0
        ? employer.totaljobpostinglimit
        : allowedJobLimit;

      if (effectiveLimit > 0) {
        // Get all active jobs for this employer
        const activeJobs = await Job.find({
          employid: employer._id,
          isActive: true
        }).sort({ createdAt: -1 }); // Sort by newest first

        // If active jobs exceed the limit, deactivate the excess ones (oldest first)
        if (activeJobs.length > effectiveLimit) {
          const excessCount = activeJobs.length - effectiveLimit;
          const jobsToDeactivate = activeJobs.slice(effectiveLimit); // Get excess jobs (oldest)

          for (const job of jobsToDeactivate) {
            job.isActive = false;
            await job.save();
          }

          console.log(`🔴 Enforced job limit for employer: ${employer.schoolName || employer.uuid} - Deactivated ${excessCount} excess jobs (limit: ${effectiveLimit}, had: ${activeJobs.length})`);
        }
      }
    }

    console.log("✅ Daily employer subscription & trial check completed.");
  } catch (error) {
    console.error("❌ Error in cron job:", error);
  }
}, {
  timezone: "Asia/Kolkata" // Set timezone to IST
});
console.log('Cron job scheduled.'); // To confirm that the job is scheduled

// Employee subscription expiration check
cron.schedule("59 23 * * *", async () => {
  console.log("⏰ Running daily employee subscription check...");

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check all employees with active subscriptions
    const employeesWithSubscriptions = await Employee.find({
      isVerified: true,
      currentSubscription: { $ne: null }
    });

    for (const employee of employeesWithSubscriptions) {
      if (employee.currentSubscription && employee.currentSubscription.endDate) {
        const endDate = new Date(employee.currentSubscription.endDate);
        endDate.setHours(0, 0, 0, 0);

        // If subscription end date has passed
        if (endDate < today) {
          employee.isVerified = false;
          employee.verificationstatus = 'expired';
          employee.currentSubscription = null;

          // Update subscription status in subscriptions array
          if (employee.subscriptions && employee.subscriptions.length > 0) {
            employee.subscriptions.forEach(sub => {
              if (sub.status === 'active') {
                sub.status = 'expired';
              }
            });
          }

          await employee.save();
          console.log(`🚫 Subscription expired for employee: ${employee.userName || employee.userEmail || employee._id}`);
        }
      }
    }

    console.log("✅ Daily employee subscription check completed.");
  } catch (error) {
    console.error("❌ Error in employee subscription cron job:", error);
  }
}, {
  timezone: "Asia/Kolkata" // Set timezone to IST
});
console.log('Employee subscription cron job scheduled.');

// Initialize scheduled notifications
const { initializeScheduledNotifications } = require('./utils/scheduledNotifications');
initializeScheduledNotifications();

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
