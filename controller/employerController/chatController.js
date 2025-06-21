
const Chat = require('../../models/chatSchema');


exports.sendMessage = async (req, res) => {
  try {
    const {
      employeeId,
      employerId,
      jobId,
      message,
      sender, // "employee" or "employer"
      employerName,
      employerImage
    } = req.body;

    // Cloudinary file upload (if image sent)
    const uploadedImageUrl = req.file?.path || ''; // Cloudinary returns .path as secure_url

    const newMessage = {
      message,
      sender,
      employeeImage: uploadedImageUrl, // only filled if file was uploaded
      createdAt: new Date()
    };

    let chat = await Chat.findOne({ employeeId, employerId, jobId });

    if (chat) {
      // Append message to existing chat
      chat.messages.push(newMessage);
    } else {
      // Create new chat
      chat = new Chat({
        employeeId,
        employerId,
        jobId,
        employerName,
        employerImage,
        employeeImage: uploadedImageUrl, // root level field if needed
        messages: [newMessage]
      });
    }

    await chat.save();
    res.status(200).json(chat);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// List messages between an employee and employer for a specific job
exports.getChatByJobId = async (req, res) => {
  try {
    const { employeeId, employerId, jobId } = req.query;

    const chat = await Chat.findOne({ employeeId, employerId, jobId });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Unread message count
exports.getUnreadCount = async (req, res) => {
  try {
    const { employeeId, employerId, jobId, viewer } = req.query;

    const unreadCount = await Chat.countDocuments({
      employeeId,
      employerId,
      jobId,
      sender: { $ne: viewer },
      isRead: false
    });

    res.status(200).json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Error counting unread messages', error });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { employeeId, employerId, jobId, viewer } = req.body;

    await Chat.updateMany(
      {
        employeeId,
        employerId,
        jobId,
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
exports.getChatsByEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    const chats = await Chat.find({ employeeId });

    if (chats.length === 0) {
      return res.status(404).json({ message: 'No chats found for this employee' });
    }

    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
