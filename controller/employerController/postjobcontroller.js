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
  try {
    // Fetch only the applications field from all job documents
    const jobs = await Job.find().select('applications');

    // Flatten all applications across jobs and filter favourites
    const favouriteCandidates = jobs
      .flatMap(job => job.applications)
      .filter(app => app.favourite === true);

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
    const { jobId, applicantId } = req.params;
    const { status } = req.body;

    const job = await Job.findOne({ _id: jobId });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const application = job.applications.find(app => app.applicantId === applicantId);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    application.employapplicantstatus = status;
    await job.save();

    res.status(200).json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating applicant status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  createJob,
  getAppliedCandidates,
  getAllJobs,
  getJobsByEmployee,
  getJobById,
  getFavouriteCandidates,
  updateFavoriteStatus,
  updateApplicantStatus,
  shortlistcand,

};