const mongoose = require("mongoose");

const savedCandidateSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employer",  // reference to employer collection
    required: true,
  },
  employeeIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",  // reference to employee collection
      required: true,
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("SavedCandidate", savedCandidateSchema);
