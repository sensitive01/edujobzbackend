const meetingModel = require("../../models/meetingSchema");

const create = async (req, res) => {
  try {
      const {
          name,
          department,
          email,
          mobile,
          businessURL,
          callbackTime,
          vendorId,
      } = req.body;

      if (!name || !department || !email || !mobile  || !callbackTime || !vendorId) {
          return res.status(400).json({ message: "All fields are required" });
      }

      const newMeeting = new meetingModel({
          name,
          department,
          email,
          mobile,
          businessURL,
          callbackTime,
          vendorId,
      });

      await newMeeting.save();

      res.status(200).json({
          message: "Meeting created successfully",
          meeting: newMeeting,
      });
  } catch (error) {
      res.status(500).json({ message: "Error creating meeting", error: error.stack });
  }
};

const getMeetingsByVendor = async (req, res) => {
  try {
    const { id } = req.params; 

    if (!id) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const meetings = await meetingModel.find({ vendorId: id });

    if (!meetings || meetings.length === 0) {
      return res.status(404).json({ message: "No meetings found for this vendor" });
    }

    res.status(200).json({ meetings });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving meetings", error: error.stack });
  }
};

module.exports = { create, getMeetingsByVendor };
