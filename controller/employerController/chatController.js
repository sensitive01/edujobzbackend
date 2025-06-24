
const Chat = require('../../models/chatSchema');



const { cloudinary } = require('../../config/cloudinary');

exports.sendMessage = async (req, res) => {
  try {
    console.log('📦 Incoming Request:', {
      file: req.file,
      body: req.body,
    });

    const {
      employeeId,
      employerId,
      jobId,
      message,
      sender,
      employerName,
      employerImage,
      employeeName,
      employeeImage,
    } = req.body;

    // ✅ Validation
    if (!employeeId || !employerId || !jobId || !sender) {
      console.error('❌ Missing required fields:', employeeId, employerId, jobId, sender);
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let mediaUrl = null;
    let mediaType = null;

    // ✅ Handle file upload to Cloudinary
    if (req.file) {
      try {
        const mimetype = req.file.mimetype;
        console.log('📁 File MIME type:', mimetype);

        // Determine Cloudinary resource_type
        const resourceType = mimetype.startsWith('image')
          ? 'image'
          : mimetype.startsWith('audio')
          ? 'video' // Cloudinary treats audio as 'video' resource type
          : 'auto';

        // Determine mediaType to save in DB
        if (mimetype.startsWith('image')) {
          mediaType = 'image';
        } else if (mimetype.startsWith('audio')) {
          mediaType = 'audio';
        } else {
          mediaType = 'file'; // Fallback if unknown type
        }

        // Convert buffer to base64
        const base64Data = `data:${mimetype};base64,${req.file.buffer.toString('base64')}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(base64Data, {
          resource_type: resourceType,
          folder: resourceType === 'image' ? 'chat_images' : 'chat_audio',
        });

        mediaUrl = result.secure_url;
        console.log('✅ Uploaded to Cloudinary:', mediaUrl);
      } catch (uploadError) {
        console.error('❌ Cloudinary upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'File upload failed',
          error: uploadError.message,
        });
      }
    }

    // ✅ Construct message data to store
    const newMessage = {
      message: message || (mediaType === 'image' ? '[Image]' : '[Voice Message]'),
      sender,
      employeeId,
      employerId,
      jobId,
      createdAt: new Date(),
      isRead: false,
      mediaUrl,
      mediaType,
      employerName,
      employerImage,
      employeeName,
      employeeImage,
    };

    // ✅ Save to DB (you can modify as needed)
    const chat = await Chat.create(newMessage);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      chatId: chat._id,
      data: newMessage,
    });

  } catch (error) {
    console.error('❌ sendMessage error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong while sending the message.',
      error: error.message,
    });
  }
};

// Add other chat controller functions as needed...
// Multer middleware for handling file uploads


exports.getChatMessagesByJobId = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    const chat = await Chat.findOne({ jobId });

    if (!chat) {
      return res.status(404).json({ message: 'No chat found for this job ID' });
    }

    return res.status(200).json({
      success: true,
      chatId: chat._id,
      messages: chat.messages,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// List messages between an employee and employer for a specific job
exports.getChatsByEmployerId = async (req, res) => {
  try {
    const { employerId } = req.params;

    const chats = await Chat.find({ employerId })
      .select('-messages') // Exclude messages for this list view
      .sort({ updatedAt: -1 });

    return res.status(200).json(chats);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getChatsByEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const chats = await Chat.find({ employeeId })
      .select('-messages') // Exclude messages here too
      .sort({ updatedAt: -1 });

    return res.status(200).json(chats);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
exports.getChatMessages = async (req, res) => {
  try {
    const { employeeId, employerId, jobId } = req.query;

    const chat = await Chat.findOne({ employeeId, employerId, jobId });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    return res.status(200).json(chat);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
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
