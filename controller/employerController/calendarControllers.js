const Event = require("../../models/calenderschema");
const mongoose = require("mongoose");

// Create Event
const createEvent = async (req, res) => {
  console.log("req.body", req.body);
  const { employerId, candidateId, title, description, location, start, end, color } =
    req.body;

  if (!employerId || !title || !start || !end) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Employer ID, title, start time, and end time are required",
      });
  }

  if (new Date(start) >= new Date(end)) {
    return res
      .status(400)
      .json({ success: false, message: "End time must be after start time" });
  }

  try {
    let event;

    // Calendar flow: no candidateId → always create new event.
    // Candidate-linked flow: update existing by candidateId if present.
    const hasCandidate = candidateId != null && String(candidateId).trim() !== "";
    if (hasCandidate) {
      event = await Event.findOne({ candidateId });
      if (event) {
        event.title = title;
        event.description = description;
        event.location = location;
        event.start = new Date(start);
        event.end = new Date(end);
        event.color = color || event.color || "#6C63FF";
        event.candidateId = candidateId;
        await event.save();
      }
    }

    if (!event) {
      event = await Event.create({
        employerId,
        title,
        description,
        location,
        start: new Date(start),
        end: new Date(end),
        color: color || "#6C63FF",
        candidateId: hasCandidate ? candidateId : "",
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: event._id != null ? String(event._id) : null,
        employerId: event.employerId,
        title: event.title,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
        color: event.color,
        allDay: false,
        candidateId: event.candidateId ?? candidateId ?? "",
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: `Error saving event: ${error.message}`,
      });
  }
};

// Get All Events
// Use overlap logic: events that overlap [start, end] satisfy
// event.start <= rangeEnd && event.end >= rangeStart
const getEvents = async (req, res) => {
  const { employerId, start, end } = req.query;

  if (!employerId) {
    return res
      .status(400)
      .json({ success: false, message: "Employer ID is required" });
  }

  const query = { employerId };

  if (start && end) {
    const rangeStart = new Date(start);
    const rangeEnd = new Date(end);
    query.$and = [
      { start: { $lte: rangeEnd } },
      { end: { $gte: rangeStart } },
    ];
  }

  try {
    const events = await Event.find(query).sort({ start: 1 }).lean();

    res.status(200).json({
      success: true,
      count: events.length,
      data: events.map((event) => ({
        id: event._id != null ? String(event._id) : null,
        title: event.title,
        location: event.location,
        description: event.description,
        start: event.start,
        end: event.end,
        color: event.color || "#6C63FF",
        allDay: false,
      })),
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: `Error fetching events: ${error.message}`,
      });
  }
};

// Update Event
const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { employerId, title, description, start, end, color } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event ID" });
  }

  if (!employerId) {
    return res
      .status(400)
      .json({ success: false, message: "Employer ID is required" });
  }

  if (start && end && new Date(start) >= new Date(end)) {
    return res
      .status(400)
      .json({ success: false, message: "End time must be after start time" });
  }

  try {
    const event = await Event.findOneAndUpdate(
      { _id: id, employerId },
      {
        title,
        description,
        start: start ? new Date(start) : undefined,
        end: end ? new Date(end) : undefined,
        color,
      },
      { new: true, runValidators: true }
    );

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        id: event._id,
        employerId: event.employerId,
        title: event.title,
        description: event.description,
        start: event.start,
        end: event.end,
        color: event.color,
        allDay: false,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: `Error updating event: ${error.message}`,
      });
  }
};

// Delete Event
const deleteEvent = async (req, res) => {
  const { id } = req.params;
  const { employerId } = req.query;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event ID" });
  }

  if (!employerId) {
    return res
      .status(400)
      .json({ success: false, message: "Employer ID is required" });
  }

  try {
    const event = await Event.findOneAndDelete({ _id: id, employerId });

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: `Error deleting event: ${error.message}`,
      });
  }
};

module.exports = {
  createEvent,
  getEvents,
  updateEvent,
  deleteEvent,
};
