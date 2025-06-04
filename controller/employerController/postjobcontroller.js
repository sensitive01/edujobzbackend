const Job = require('../../models/jobSchema');

// Create a new job
const createJob = async (req, res) => {
  try {
    const newJob = new Job(req.body);
    const savedJob = await newJob.save();
    res.status(201).json(savedJob);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all jobs
const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// GET /api/jobs/:id
const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// GET /api/jobs/employee/:employid
const getJobsByEmployee = async (req, res) => {
  try {
    const jobs = await Job.find({ employid: req.params.employid }).sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getAppliedCandidates = async (req, res) => {
  const jobId = req.params.id;

  try {
    const job = await Job.findById(jobId).select('applications');

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Return the embedded application objects
    res.status(200).json({
      success: true,
      applications: job.applications
    });
  } catch (error) {
    console.error('Error fetching applied candidates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const shortlistcand = async (req, res) => {
  const jobId = req.params.id;

  try {
    const job = await Job.findById(jobId).select('applications');

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Filter out applications with employapplicantstatus === 'Pending'
    const nonPendingApplications = job.applications.filter(app => app.employapplicantstatus !== 'Pending');

    res.status(200).json({
      success: true,
      applications: nonPendingApplications
    });
  } catch (error) {
    console.error('Error fetching applied candidates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


const getFavouriteCandidates = async (req, res) => {
  const { employid } = req.params;

  try {
    // Find all jobs posted by the employer
    const jobs = await Job.find({ employid }).select('jobTitle applications');

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No jobs found for this employer ID'
      });
    }

    // Extract all favourite candidates from these jobs
    const favouriteCandidates = jobs.flatMap(job =>
      job.applications
        .filter(app => app.favourite === true)
        .map(app => ({
          ...app.toObject(),
          jobTitle: job.jobTitle // attach job title for context
        }))
    );

    res.status(200).json({
      success: true,
      favouriteCandidates
    });
  } catch (error) {
    console.error('Error fetching favourite candidates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
const updateFavoriteStatus = async (req, res) => {
  try {
    const { jobId, applicantId } = req.params;
    const { favourite } = req.body;

    const job = await Job.findOne({ _id: jobId });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const application = job.applications.find(app => app.applicantId === applicantId);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    application.favourite = favourite;
    await job.save();

    res.json({ success: true, message: 'Favorite status updated' });
  } catch (error) {
    console.error('Error updating favorite status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
const updateApplicantStatus = async (req, res) => {
  try {
    const { jobId, employid, applicantId } = req.params;
    const { status } = req.body;

    let job;

    // Case 1: Find by jobId
    if (jobId) {
      job = await Job.findOne({ _id: jobId });
    }

    // Case 2: Find by employid and check inside applications
    if (!job && employid) {
      job = await Job.findOne({ employid, "applications.applicantId": applicantId });
    }

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const application = job.applications.find(app => app.applicantId === applicantId);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    application.employapplicantstatus = status;
    await job.save();

    return res.status(200).json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating applicant status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateFavStatusforsavecand = async (req, res) => {
  try {
    const { employid, applicantId } = req.params;
    const { favourite } = req.body;

    // Find job by employer and where the applicant exists
    const job = await Job.findOne({ 
      employid: employid, 
      "applications.applicantId": applicantId 
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job or application not found' });
    }

    // Find index of the application
    const appIndex = job.applications.findIndex(app => app.applicantId === applicantId);
    if (appIndex === -1) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Update the favourite status
    job.applications[appIndex].favourite = favourite;
    await job.save();

    return res.json({ success: true, message: 'Favourite status updated' });
  } catch (error) {
    console.error('Error updating favourite status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
const getNonPendingApplicantsByEmployId = async (req, res) => {
  try {
    const { employid } = req.params;

    // Find jobs by employid and select jobTitle and applications
    const jobs = await Job.find({ employid }).select('jobTitle applications');

    // Flatten all applications from multiple jobs and filter non-pending,
    // attaching jobTitle and jobId for context
    const nonPendingApplications = jobs.flatMap(job =>
      job.applications
        .filter(app => app.employapplicantstatus !== 'Pending')
        .map(app => ({
          ...app.toObject(),
          jobTitle: job.jobTitle,
          jobId: job._id
        }))
    );

    res.status(200).json({
      success: true,
      data: nonPendingApplications
    });
  } catch (error) {
    console.error('Error fetching applicants:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
const getAllApplicantsByEmployId = async (req, res) => {
  try {
    const { employid } = req.params;

    // Find jobs by employid and select jobTitle and applications
    const jobs = await Job.find({ employid }).select('jobTitle applications');

    // Flatten all applications from multiple jobs, attaching jobTitle and jobId
    const allApplications = jobs.flatMap(job =>
      job.applications.map(app => ({
        ...app.toObject(),
        jobTitle: job.jobTitle,
        jobId: job._id
      }))
    );

    res.status(200).json({
      success: true,
      data: allApplications
    });
  } catch (error) {
    console.error('Error fetching applicants:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};


module.exports = {
  createJob,
  getAppliedCandidates,
  getAllJobs,
  getJobsByEmployee,
  getJobById,
  getAllApplicantsByEmployId,
  getFavouriteCandidates,
  updateFavoriteStatus,
  updateApplicantStatus,
  shortlistcand,
  getNonPendingApplicantsByEmployId,
  updateFavStatusforsavecand,

};