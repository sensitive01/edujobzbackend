const SavedCandidate = require("../../models/savedcandiSchema");

// const SavedCandidate = require("../models/savedCandidate");

exports.toggleSaveCandidate = async (req, res) => {
  try {
    const { employerId, employeeId } = req.params;

    if (!employerId || !employeeId) {
      return res.status(400).json({ message: "employerId and employeeId are required" });
    }

    // Find if employer already has a savedCandidate record
    let saved = await SavedCandidate.findOne({ employerId });

    if (!saved) {
      // If no record, create new with this employeeId
      saved = new SavedCandidate({
        employerId,
        employeeIds: [employeeId],
      });
      await saved.save();
      return res.status(201).json({ success: true, message: "Candidate saved", data: saved });
    }

    // Check if employee already exists in saved list
    const exists = saved.employeeIds.includes(employeeId);

    if (exists) {
      // Remove employeeId (unsave)
      saved.employeeIds = saved.employeeIds.filter(id => id.toString() !== employeeId);
      await saved.save();
      return res.status(200).json({ success: true, message: "Candidate removed", data: saved });
    } else {
      // Add employeeId (save)
      saved.employeeIds.push(employeeId);
      await saved.save();
      return res.status(200).json({ success: true, message: "Candidate saved", data: saved });
    }

  } catch (error) {
    console.error("Error saving/removing candidate:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.getSavedCandidates = async (req, res) => {
  try {
    const { employerId } = req.params;

    if (!employerId) {
      return res.status(400).json({ message: "employerId is required" });
    }

    const saved = await SavedCandidate.findOne({ employerId }).populate("employeeIds");

    if (!saved) {
      return res.status(200).json({
        success: true,
        message: "No saved candidates found",
        data: { employeeIds: [] },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Saved candidates retrieved",
      data: saved,
    });

  } catch (error) {
    console.error("Error fetching saved candidates:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};