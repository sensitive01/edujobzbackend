const mongoose = require("mongoose");
const Job = require("../../models/jobSchema");
const Employer = require("../../models/employerSchema");
const SavedCandidate = require('../../models/savedcandiSchema');
const getJobTitleByJobId = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    if (!jobId || jobId.length !== 24) {
      return res.status(400).json({ success: false, message: "Invalid jobId" });
    }
    const job = await Job.findById(jobId).select("jobTitle");
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res.json({ success: true, jobTitle: job.jobTitle });
  } catch (error) {
    console.error("Error fetching job title:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const updateJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    const updatedJob = await Job.findByIdAndUpdate(
      id,
      { ...updatedData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!updatedJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      job: updatedJob
    });
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};
const createJob = async (req, res) => {
  try {
    const jobData = req.body;
    console.log("Creating Job with Data:", jobData);
    // Find the employer by employid or email
    const employer = await Employer.findOne({
      $or: [{ _id: jobData.employid }, { userEmail: jobData.contactEmail }],
    });
    if (!employer) {
      return res.status(404).json({ message: "Employer not found" });
    }
    // Check if a job with the same jobTitle already exists for this employer (case-insensitive)
    if (jobData.jobTitle) {
      // Escape special regex characters to prevent regex injection
      const escapedJobTitle = jobData.jobTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingJob = await Job.findOne({
        employid: jobData.employid,
        jobTitle: { $regex: new RegExp(`^${escapedJobTitle}$`, 'i') },
      });
      if (existingJob) {
        return res.status(400).json({
          success: false,
          message: "A job with this title already exists. Please use a different job title.",
        });
      }
    }
    // Check subscription status
    if (employer.subscription === "false" || !employer.currentSubscription) {
      return res.status(403).json({
        success: false,
        message: "No active subscription. Please subscribe to post jobs.",
      });
    }
    // Get allowed job limit from current subscription plan (as fallback)
    let allowedJobLimit = 0;
    if (employer.currentSubscription && employer.currentSubscription.planDetails) {
      allowedJobLimit = employer.currentSubscription.planDetails.jobPostingLimit || 0;
    }
    // Use totaljobpostinglimit as primary limit, fallback to subscription plan limit if totaljobpostinglimit is 0
    const effectiveLimit = employer.totaljobpostinglimit > 0 
      ? employer.totaljobpostinglimit 
      : allowedJobLimit;
    // Check if effective limit is valid
    if (effectiveLimit <= 0) {
      return res.status(403).json({
        success: false,
        message: "Job posting limit reached. Please upgrade your subscription.",
      });
    }
    // Check how many active jobs the employer currently has
    const activeJobsCount = await Job.countDocuments({
      employid: jobData.employid,
      isActive: true,
    });
    // If active jobs count is already at or exceeds the plan limit, don't allow new job posting
    if (activeJobsCount >= effectiveLimit) {
      return res.status(403).json({
        success: false,
        message: `You have reached your active job limit (${effectiveLimit}). Please close an existing job before posting a new one.`,
      });
    }
    // Create the new job
    // jobData includes 'employerType' from the frontend
    const newJob = new Job(jobData);
    const savedJob = await newJob.save();
    // Verify if notification service exists before using it
    try {
      const notificationService = require('../../utils/notificationService');
      await notificationService.notifyEmployerJobPosted(
        jobData.employid,
        savedJob._id.toString(),
        savedJob.jobTitle
      );
    } catch (notifyError) {
      console.warn("Notification failed, but job was posted:", notifyError.message);
    }
    // Return the saved job
    res.status(201).json(savedJob);
  } catch (error) {
    console.error("Error in createJob:", error);
    res.status(400).json({ message: error.message });
  }
};


const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedJob = await Job.findByIdAndDelete(id);

    if (!deletedJob) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
      deletedJob
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};





const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.aggregate([
      {
        $match: { isActive: true }   
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $addFields: {
          employidObject: { $toObjectId: "$employid" },
        },
      },
      {
        $lookup: {
          from: "employers", // match with collection name, which is auto pluralized
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
            $concat: [
              { $ifNull: ["$employerInfo.firstName", ""] },
              " ",
              { $ifNull: ["$employerInfo.lastName", ""] },
            ],
          },
        },
      },
      {
        $project: {
          employidObject: 0,
          employerInfo: 0,
        },
      },
    ]);

    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error in getAllJobs:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/jobs/:id
const getJobById = async (req, res) => {
  try {
    const jobId = req.params.id;

    const jobs = await Job.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(jobId) },
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

    const job = jobs[0];

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json(job);
  } catch (error) {
    console.error("Error in getJobById:", error);
    res.status(500).json({ message: error.message });
  }
};
// GET /api/jobs/employee/:employid
const getJobsByEmployee = async (req, res) => {
  try {
    const jobs = await Job.aggregate([
      {
        $match: { employid: req.params.employid },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $addFields: {
          employidObject: {
            $toObjectId: "$employid",
          },
        },
      },
      {
        $lookup: {
          from: "employers", // MongoDB auto-pluralizes 'Employer' model
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

    res.status(200).json(jobs);
  } catch (error) {
    console.error("Failed to fetch jobs with employer data:", error);
    res.status(500).json({ message: error.message });
  }
};


const getAppliedCandidates = async (req, res) => {
  const jobId = req.params.id;

  try {
    // 1️⃣ Fetch the job with applications and employid
    const job = await Job.findById(jobId).select("applications employid");

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // 2️⃣ Fetch saved candidates for this employer
    const savedCandidatesDoc = await SavedCandidate.findOne({ employerId: job.employid });
    const savedEmployeeIds = savedCandidatesDoc
      ? savedCandidatesDoc.employeeIds.map(id => id.toString())
      : [];

    // 3️⃣ Map applications to mark favourite
    const applications = job.applications.map(app => ({
      ...app.toObject(),
      favourite: savedEmployeeIds.includes(app.applicantId)
    }));

    res.status(200).json({
      success: true,
      applications
    });

  } catch (error) {
    console.error("Error fetching applied candidates:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

//sjsjjs
const shortlistcand = async (req, res) => {
  const jobId = req.params.id;

  try {
    // 1️⃣ Fetch job and applications
    const job = await Job.findById(jobId).select("applications employid");

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // 2️⃣ Fetch saved candidates for this employer (using job.employid)
    const savedCandidatesDoc = await SavedCandidate.findOne({ employerId: job.employid });
    const savedEmployeeIds = savedCandidatesDoc
      ? savedCandidatesDoc.employeeIds.map(id => id.toString())
      : [];

    // 3️⃣ Map applications to mark favourites and filter non-pending
    const applications = job.applications
      .map(app => ({
        ...app.toObject(),
        favourite: savedEmployeeIds.includes(app.applicantId)
      }))
      .filter(app => app.employapplicantstatus !== "Pending");

    res.status(200).json({
      success: true,
      applications
    });

  } catch (error) {
    console.error("Error fetching applied candidates:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getFavouriteCandidates = async (req, res) => {
  const { employid } = req.params;

  try {
    // Find all jobs posted by the employer
    const jobs = await Job.find({ employid }).select("jobTitle applications");

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No jobs found for this employer ID",
      });
    }

    // Extract all favourite candidates from these jobs
    const favouriteCandidates = jobs.flatMap((job) =>
      job.applications
        .filter((app) => app.favourite === true)
        .map((app) => ({
          ...app.toObject(),
          jobTitle: job.jobTitle, // attach job title for context
        }))
    );

    res.status(200).json({
      success: true,
      favouriteCandidates,
    });
  } catch (error) {
    console.error("Error fetching favourite candidates:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
const updateFavoriteStatus = async (req, res) => {
  try {
    const { jobId, applicantId } = req.params;
    const { favourite } = req.body;

    const job = await Job.findOne({ _id: jobId });
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const application = job.applications.find(
      (app) => app.applicantId === applicantId
    );
    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    application.favourite = favourite;
    await job.save();

    res.json({ success: true, message: "Favorite status updated" });
  } catch (error) {
    console.error("Error updating favorite status:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
const updateApplicantStatus = async (req, res) => {
  try {
    const { applicationId, applicantId } = req.params;
    const {
      status,
      notes,
      interviewtype,
      interviewdate,
      interviewtime,
      interviewlink,
      interviewvenue,
    } = req.body;

    if (!status || !notes) {
      return res
        .status(400)
        .json({ success: false, message: "Status and notes are required" });
    }

    // ✅ Fix: define `now`
    const now = new Date();

    // Find the job and application first to get details for notifications
    const job = await Job.findOne({
      "applications._id": applicationId,
      "applications.applicantId": applicantId,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const application = job.applications.id(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const result = await Job.updateOne(
      {
        "applications._id": applicationId,
        "applications.applicantId": applicantId,
      },
      {
        $set: {
          "applications.$.employapplicantstatus": status,
          "applications.$.notes": notes,
          "applications.$.interviewtype": interviewtype,
          "applications.$.interviewdate": interviewdate,
          "applications.$.interviewtime": interviewtime,
          "applications.$.interviewlink": interviewlink,
          "applications.$.lastupdatestatusdate": now,
          "applications.$.interviewvenue": interviewvenue,
        },
        $push: {
          "applications.$.statusHistory": {
            status,
            notes,
            interviewtype,
            interviewdate,
            interviewtime,
            interviewlink,
            interviewvenue,
            updatedAt: now,
          },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found or not updated",
      });
    }

    // Send notifications based on status
    const notificationService = require('../../utils/notificationService');
    const Employee = require('../../models/employeeschema');
    const Employer = require('../../models/employerSchema');
    
    const employee = await Employee.findById(applicantId);
    const employer = await Employer.findById(job.employid);
    const employerName = employer ? `${employer.firstName || ''} ${employer.lastName || ''}`.trim() || employer.companyName || 'Employer' : 'Employer';
    const applicantName = application.firstName || 'Applicant';

    // Notify employee based on status
    if (employee) {
      if (status === 'Shortlisted') {
        await notificationService.notifyEmployeeApplicationShortlisted(
          applicantId,
          job._id.toString(),
          job.jobTitle,
          employerName
        );
      } else if (status === 'Accepted') {
        await notificationService.notifyEmployeeApplicationAccepted(
          applicantId,
          job._id.toString(),
          job.jobTitle,
          employerName
        );
        // Also notify employer
        if (employer) {
          await notificationService.notifyEmployerApplicationAccepted(
            job.employid,
            applicationId,
            applicantName,
            job.jobTitle
          );
        }
      } else if (status === 'Rejected') {
        await notificationService.notifyEmployeeApplicationRejected(
          applicantId,
          job._id.toString(),
          job.jobTitle,
          employerName
        );
        // Also notify employer
        if (employer) {
          await notificationService.notifyEmployerApplicationRejected(
            job.employid,
            applicationId,
            applicantName,
            job.jobTitle
          );
        }
      } else if (status === 'Interview Scheduled') {
        await notificationService.notifyEmployeeInterviewScheduled(
          applicantId,
          job._id.toString(),
          job.jobTitle,
          employerName,
          interviewdate,
          interviewtime,
          interviewtype,
          interviewlink,
          interviewvenue
        );
        // Also notify employer
        if (employer) {
          await notificationService.notifyEmployerInterviewScheduled(
            job.employid,
            applicationId,
            applicantName,
            interviewdate,
            interviewtime
          );
        }
      } else {
        // Generic status change
        await notificationService.notifyEmployeeApplicationStatusChanged(
          applicantId,
          job._id.toString(),
          job.jobTitle,
          employerName,
          status
        );
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Applicant status, notes, and interview details updated successfully",
    });
  } catch (error) {
    console.error("Error updating applicant status:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateFavStatusforsavecand = async (req, res) => {
  try {
    const { applicationId, employid } = req.params;
    const { favourite } = req.body;

    const result = await Job.updateOne(
      {
        employid: employid,
        "applications._id": applicationId,
      },
      {
        $set: {
          "applications.$.favourite": favourite,
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Application not found or favourite not updated",
        });
    }

    return res.json({
      success: true,
      message: "Favourite status updated successfully",
    });
  } catch (error) {
    console.error("Error updating favourite status:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
const getNonPendingApplicantsByEmployId = async (req, res) => {
  try {
    const { employid } = req.params;

    // 1️⃣ Find saved candidates for this employer
    const savedCandidatesDoc = await SavedCandidate.findOne({ employerId: employid });
    const savedEmployeeIds = savedCandidatesDoc
      ? savedCandidatesDoc.employeeIds.map(id => id.toString())
      : [];

    // 2️⃣ Find jobs by employid and select jobTitle and applications
    const jobs = await Job.find({ employid }).select("jobTitle applications");

    // 3️⃣ Flatten all applications, mark favourite, filter non-pending, attach job info
    const nonPendingApplications = jobs.flatMap((job) =>
      job.applications
        .filter((app) => app.employapplicantstatus !== "Pending")
        .map((app) => ({
          ...app.toObject(),
          favourite: savedEmployeeIds.includes(app.applicantId),
          jobTitle: job.jobTitle,
          jobId: job._id,
        }))
    );

    res.status(200).json({
      success: true,
      data: nonPendingApplications,
    });

  } catch (error) {
    console.error("Error fetching applicants:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
const getAllApplicantsByEmployId = async (req, res) => {
  try {
    const { employid } = req.params;

    // Find jobs by employid and select jobTitle and applications
    const jobs = await Job.find({ employid }).select("jobTitle applications");

    // Flatten all applications from multiple jobs, attaching jobTitle and jobId
    const allApplications = jobs.flatMap((job) =>
      job.applications.map((app) => ({
        ...app.toObject(),
        jobTitle: job.jobTitle,
        jobId: job._id,
      }))
    );

    res.status(200).json({
      success: true,
      data: allApplications,
    });
  } catch (error) {
    console.error("Error fetching applicants:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const toggleSaveJob = async (req, res) => {
  try {
    const { applicantId, jobId } = req.body;
    console.log("[TOGGLE-SAVE-JOB] incoming:", { applicantId, jobId });

    if (!applicantId || !jobId) {
      console.log("[TOGGLE-SAVE-JOB] missing applicantId or jobId");
      return res
        .status(400)
        .json({ message: "applicantId and jobId are required" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      console.log("[TOGGLE-SAVE-JOB] job not found");
      return res.status(404).json({ message: "Job not found" });
    }

    if (!Array.isArray(job.saved)) job.saved = [];

    const savedIndex = job.saved.findIndex(
      (s) => String(s.applicantId) === String(applicantId)
    );
    console.log("[TOGGLE-SAVE-JOB] savedIndex:", savedIndex);

    if (savedIndex === -1) {
      // Job is not saved, so save it
      job.saved.push({ applicantId, saved: true });
      await job.save();
      console.log("[TOGGLE-SAVE-JOB] job saved");
      
      // Notify employee of job saved
      const Employer = require('../../models/employerSchema');
      const notificationService = require('../../utils/notificationService');
      const employer = await Employer.findById(job.employid);
      if (employer) {
        const employerName = `${employer.firstName || ''} ${employer.lastName || ''}`.trim() || employer.companyName || 'Employer';
        await notificationService.notifyEmployeeJobSaved(
          applicantId,
          jobId,
          job.jobTitle,
          employerName
        );
      }
      
      return res
        .status(201)
        .json({ message: "Job saved successfully", isSaved: true });
    } else {
      // Job is already saved, so unsave it
      job.saved.splice(savedIndex, 1);
      await job.save();
      console.log("[TOGGLE-SAVE-JOB] job unsaved");
      return res
        .status(200)
        .json({ message: "Job unsaved successfully", isSaved: false });
    }
  } catch (error) {
    console.error("[TOGGLE-SAVE-JOB] error:", error);
    res
      .status(500)
      .json({ message: "Error toggling job save state", error: error.message });
  }
};

const fetchAllJobs = async (req, res) => {
  try {
    console.log("[FETCH-ALL-JOBS] fetching all jobs");

    const jobs = await Job.aggregate([
      {
        $match: {
          isActive: true, // Only fetch jobs that are active
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $addFields: {
          employidObject: {
            $toObjectId: "$employid",
          },
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
      console.log("[FETCH-ALL-JOBS] no jobs found");
      return res.status(404).json({ message: "No jobs found" });
    }

    console.log("[FETCH-ALL-JOBS] jobs fetched:", jobs.length);
    res.status(200).json(jobs);
  } catch (error) {
    console.error("[FETCH-ALL-JOBS] error:", error);
    res
      .status(500)
      .json({ message: "Error fetching jobs", error: error.message });
  }
};

const fetchSavedJobslist = async (req, res) => {
  try {
    const { employid } = req.params;
    console.log("[FETCH-SAVED-JOBS] incoming:", { employid });

    if (!employid) {
      console.log("[FETCH-SAVED-JOBS] employid not provided");
      return res.status(400).json({ message: "employid is required" });
    }

    const jobs = await Job.aggregate([
      {
        $match: {
          "saved.applicantId": employid,
        },
      },
      {
        $addFields: {
          employidObject: { $toObjectId: "$employid" },
        },
      },
      {
        $lookup: {
          from: "employers", // collection name
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
      console.log(
        "[FETCH-SAVED-JOBS] no saved jobs found for employid:",
        employid
      );
      return res.status(404).json({ message: "No saved jobs found" });
    }

    console.log("[FETCH-SAVED-JOBS] saved jobs fetched:", jobs.length);
    res.status(200).json({ jobs });
  } catch (error) {
    console.error("[FETCH-SAVED-JOBS] error:", error);
    res
      .status(500)
      .json({ message: "Error fetching saved jobs", error: error.message });
  }
};

const getJobsWithNonPendingApplications = async (req, res) => {
  const applicantId = req.params.applicantId;

  try {
    const result = await Job.aggregate([
      {
        $match: {
          applications: {
            $elemMatch: {
              applicantId: applicantId,
              employapplicantstatus: { $ne: "Pending" },
            },
          },
        },
      },
      {
        $addFields: {
          applications: {
            $filter: {
              input: "$applications",
              as: "app",
              cond: {
                $and: [
                  { $eq: ["$$app.applicantId", applicantId] },
                  { $ne: ["$$app.employapplicantstatus", "Pending"] },
                ],
              },
            },
          },
          employidObject: { $toObjectId: "$employid" },
        },
      },
      {
        $lookup: {
          from: "employers", // <- MongoDB uses lowercase/plural collection names
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

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching jobs with non-pending applications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const getPendingJobs = async (req, res) => {
  const applicantId = req.params.applicantId;

  try {
    const result = await Job.aggregate([
      {
        $match: {
          applications: {
            $elemMatch: {
              applicantId: applicantId,
              employapplicantstatus: { $eq: "Pending" },
            },
          },
        },
      },
      {
        $addFields: {
          applications: {
            $filter: {
              input: "$applications",
              as: "app",
              cond: {
                $and: [
                  { $eq: ["$$app.applicantId", applicantId] },
                  { $ne: ["$$app.employapplicantstatus", "Pending"] },
                ],
              },
            },
          },
          employidObject: { $toObjectId: "$employid" },
        },
      },
      {
        $lookup: {
          from: "employers", // <- MongoDB uses lowercase/plural collection names
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

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching jobs with non-pending applications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};





const getRejectedJobs = async (req, res) => {
  const applicantId = req.params.applicantId;

  try {
    const result = await Job.aggregate([
      {
        $match: {
          applications: {
            $elemMatch: {
              applicantId: applicantId,
              employapplicantstatus: { $eq: "Rejected" },
            },
          },
        },
      },
      {
        $addFields: {
          applications: {
            $filter: {
              input: "$applications",
              as: "app",
              cond: {
                $and: [
                  { $eq: ["$$app.applicantId", applicantId] },
                  { $ne: ["$$app.employapplicantstatus", "Rejected"] },
                ],
              },
            },
          },
          employidObject: { $toObjectId: "$employid" },
        },
      },
      {
        $lookup: {
          from: "employers", // <- MongoDB uses lowercase/plural collection names
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

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching jobs with non-pending applications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};












// GET /jobs/school-employers
const getSchoolEmployerJobs = async (req, res) => {
  try {
    const jobs = await Job.aggregate([
      // Convert string employid to ObjectId
      {
        $addFields: {
          employidObject: { $toObjectId: "$employid" },
        },
      },
      // Lookup employer info
      {
        $lookup: {
          from: "employers",
          localField: "employidObject",
          foreignField: "_id",
          as: "employerInfo",
        },
      },
      {
        $unwind: "$employerInfo",
      },
      // Match only School employers and active jobs
      {
        $match: {
          "employerInfo.employerType": "School",
          isActive: true, // ✅ Filter active jobs
        },
      },
      // Add user-friendly fields
      {
        $addFields: {
          employerProfilePic: "$employerInfo.userProfilePic",
          employerName: {
            $concat: ["$employerInfo.firstName", " ", "$employerInfo.lastName"],
          },
        },
      },
      // Remove unnecessary fields
      {
        $project: {
          employerInfo: 0,
          employidObject: 0,
        },
      },
      // Sort by latest
      { $sort: { createdAt: -1 } },
    ]);

    if (!jobs.length) {
      return res
        .status(404)
        .json({ message: "No jobs found for school employers" });
    }

    res.status(200).json(jobs);
  } catch (error) {
    console.error("[GET-SCHOOL-EMPLOYER-JOBS] error:", error);
    res.status(500).json({
      message: "Error fetching school employer jobs",
      error: error.message,
    });
  }
};

const getcompnanyEmployerJobs = async (req, res) => {
  try {
    const jobs = await Job.aggregate([
      // Convert string employid to ObjectId
      {
        $addFields: {
          employidObject: { $toObjectId: "$employid" },
        },
      },
      // Lookup employer info
      {
        $lookup: {
          from: "employers",
          localField: "employidObject",
          foreignField: "_id",
          as: "employerInfo",
        },
      },
      {
        $unwind: "$employerInfo",
      },
      // Match only Company employers and active jobs
      {
        $match: {
          "employerInfo.employerType": "Company",
          isActive: true, // ✅ Filter only active jobs
        },
      },
      // Add user-friendly fields
      {
        $addFields: {
          employerProfilePic: "$employerInfo.userProfilePic",
          employerName: {
            $concat: ["$employerInfo.firstName", " ", "$employerInfo.lastName"],
          },
        },
      },
      // Remove unnecessary fields
      {
        $project: {
          employerInfo: 0,
          employidObject: 0,
        },
      },
      // Sort by latest
      { $sort: { createdAt: -1 } },
    ]);

    if (!jobs.length) {
      return res
        .status(404)
        .json({ message: "No jobs found for Company employers" });
    }

    res.status(200).json(jobs);
  } catch (error) {
    console.error("[GET-Company-EMPLOYER-JOBS] error:", error);
    res.status(500).json({
      message: "Error fetching Company employer jobs",
      error: error.message,
    });
  }
};

const updateJobActiveStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean." });
    }

    // First, find the job to get employer info
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // If trying to activate, check the limit first
    if (isActive === true) {
      const employer = await Employer.findById(job.employid);
      
      if (!employer) {
        return res.status(404).json({ message: "Employer not found" });
      }

      // Check subscription status
      if (employer.subscription === "false" || !employer.currentSubscription) {
        return res.status(403).json({
          message: "No active subscription. Cannot activate job.",
        });
      }

      // Get effective limit - use totaljobpostinglimit as primary, fallback to subscription plan limit
      let allowedJobLimit = 0;
      if (employer.currentSubscription && employer.currentSubscription.planDetails) {
        allowedJobLimit = employer.currentSubscription.planDetails.jobPostingLimit || 0;
      }
      const effectiveLimit = employer.totaljobpostinglimit > 0 
        ? employer.totaljobpostinglimit 
        : allowedJobLimit;

      // Check if limit is valid
      if (effectiveLimit <= 0) {
        return res.status(403).json({
          message: "Job posting limit is 0. Please upgrade your subscription.",
        });
      }

      // Count current active jobs (excluding the job being activated)
      const activeJobsCount = await Job.countDocuments({
        employid: job.employid,
        isActive: true,
        _id: { $ne: jobId } // Exclude current job from count
      });

      // Check if activating would exceed limit
      if (activeJobsCount >= effectiveLimit) {
        return res.status(403).json({
          message: `Cannot activate job. You have reached your active job limit (${effectiveLimit}). Please deactivate another job first.`,
        });
      }
    }

    // Update the job status (deactivation is always allowed)
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { isActive, updatedAt: new Date() },
      { new: true }
    );

    // Notify employer of job status change
    const notificationService = require('../../utils/notificationService');
    await notificationService.notifyEmployerJobStatusChanged(
      job.employid,
      jobId,
      job.jobTitle,
      isActive
    );

    res.status(200).json({
      message: `Job has been ${
        isActive ? "activated" : "deactivated"
      } successfully.`,
      job: updatedJob,
    });
  } catch (error) {
    console.error("Error updating job status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getRejectedJobs,
  updateJobActiveStatus,
  toggleSaveJob,
  fetchAllJobs,
  fetchSavedJobslist,
  createJob,
  updateJobById,
  getSchoolEmployerJobs,
  getJobsWithNonPendingApplications,
  getAppliedCandidates,
  getAllJobs,
  getJobsByEmployee,
  getJobById,
  getcompnanyEmployerJobs,
  getAllApplicantsByEmployId,
  getFavouriteCandidates,
  updateFavoriteStatus,
  updateApplicantStatus,
  getJobTitleByJobId,
  shortlistcand,
  deleteJob,
  getNonPendingApplicantsByEmployId,
  updateFavStatusforsavecand,
  getPendingJobs
};
