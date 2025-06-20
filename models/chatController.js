const Chat = require('../models/Chat');

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { employeeId, employerId, employerName, employerImage, message, sender } = req.body;

    const newMessage = new Chat({
      employeeId,
      employerId,
      employerName,
      employerImage,
      message,
      sender
    });

    await newMessage.save();
    res.status(201).json({ message: 'Message sent', data: newMessage });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error });
  }
};

// List messages between an employee and employer
exports.getChat = async (req, res) => {
  try {
    const { employeeId, employerId } = req.query;

    const chat = await Chat.find({ employeeId, employerId }).sort({ createdAt: 1 });
    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat', error });
  }
};

// Unread message count for employee
exports.getUnreadCount = async (req, res) => {
  try {
    const { employeeId, employerId, viewer } = req.query; // viewer = 'employee' or 'employer'

    const unreadCount = await Chat.countDocuments({
      employeeId,
      employerId,
      sender: { $ne: viewer }, // only count unread messages from the other party
      isRead: false
    });

    res.status(200).json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Error counting unread messages', error });
  }
};

// Mark all messages as read (by employee or employer)
exports.markAsRead = async (req, res) => {
  try {
    const { employeeId, employerId, viewer } = req.body;

    await Chat.updateMany(
      {
        employeeId,
        employerId,
        sender: { $ne: viewer },
        isRead: false
      },
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark messages as read', error });
  }
};
