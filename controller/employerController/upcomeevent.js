const Event = require('../../models/events');
// const userModel = require('../../models/employerModel');

// Create a new event
exports.createEvent = async (req, res) => {
  try {
    const { employerId } = req.params;
    const {
      title,
      description,
      type,
      date,
      startTime,
      endTime,
      imageurl,
      location,
      organizer
    } = req.body;

    const event = new Event({
      employerId,
      title,
      description,
      type,
      date,
      startTime,
      imageurl,
      endTime,
      location,
      organizer
    });

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all events for an employer
exports.getEmployerEvents = async (req, res) => {
  try {
    const { employerId } = req.params;
    const events = await Event.find({ employerId }).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get event details
exports.getEventDetails = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an event
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.eventId,
      req.body,
      { new: true, runValidators: true }
    );
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete an event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Enroll in an event (for employees)
exports.enrollInEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { employeeId, name, email, phone, resume } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if already enrolled
    const existingEnrollment = event.enrollments.find(
      e => e.employeeId.toString() === employeeId
    );
    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this event' });
    }

    event.enrollments.push({
      employeeId,
      name,
      email,
      phone,
      resume,
      status: 'Pending'
    });

    event.attendees = event.enrollments.length;
    await event.save();

    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get event enrollments
exports.getEventEnrollments = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .select('title date location enrollments');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({
      event: {
        title: event.title,
        date: event.date,
        location: event.location
      },
      enrollments: event.enrollments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update enrollment status
exports.updateEnrollmentStatus = async (req, res) => {
  try {
    const { eventId, enrollmentId } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const enrollment = event.enrollments.id(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    enrollment.status = status;
    await event.save();

    res.json(enrollment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};