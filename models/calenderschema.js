const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  candidateId: {
    type: String,

  },

  employerId: {
    type: String,

  },
  title: {
    type: String,

  },
  description: {
    type: String,
  },
  location: {
    type: String,
  },
  start: {
    type: Date,

  },
  end: {
    type: Date,

  },
  color: {
    type: String,
    default: "#6C63FF",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
