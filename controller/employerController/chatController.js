
const Chat = require('../../models/chatSchema');


const userModel = require('../../models/employeeschema');
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

    // ✅ Upload to Cloudinary if file exists
    if (req.file) {
      try {
        const mimetype = req.file.mimetype;
        const resourceType = mimetype.startsWith('image') ? 'image'
                          : mimetype.startsWith('audio') ? 'video'
                          : 'auto';

        const base64Data = `data:${mimetype};base64,${req.file.buffer.toString('base64')}`;

        const result = await cloudinary.uploader.upload(base64Data, {
          resource_type: resourceType,
          folder: resourceType === 'image' ? 'chat_images' : 'chat_audio',
        });

        mediaUrl = result.secure_url;
        mediaType = resourceType === 'image' ? 'image' : 'audio';

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

    // ✅ Message Object
    const newMessage = {
      message: message || (mediaType ? `[${mediaType === 'image' ? 'Image' : 'Voice Message'}]` : ''),
      sender,
      createdAt: new Date(),
      isRead: false,
      ...(mediaUrl && { mediaUrl }),
      ...(mediaType && { mediaType }),
    };

    // ✅ Find or Create Chat
    const chat = await Chat.findOneAndUpdate(
      { employeeId, employerId, jobId },
      {
        $setOnInsert: {
          employerName,
          employerImage,
          employeeName,
          employeeImage,
          createdAt: new Date(),
        },
        $push: { messages: newMessage },
        $set: { updatedAt: new Date() },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      chatId: chat._id,
      data: newMessage,
    });
  } catch (error) {
    console.error('❌ Error in sendMessage:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
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

    // Find all chats with the given jobId
    const chats = await Chat.find({ jobId });

    if (!chats || chats.length === 0) {
      return res.status(404).json({ message: 'No chats found for this job ID' });
    }

    // Map through chats to fetch employer details for each employeeId
    const enrichedChats = await Promise.all(
      chats.map(async (chat) => {
        // Fetch employer details using employeeId
        const employer = await userModel.findById(chat.employeeId).select('schoolName userProfilePic');

        return {
          _id: chat._id,
          employeeId: chat.employeeId,
          jobId: chat.jobId,
          updatedAt: chat.updatedAt,
          latestMessage: chat.latestMessage,
          schoolName: employer ? employer.schoolName : null,
          userProfilePic: employer ? employer.userProfilePic : null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: enrichedChats,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.getChatsByEmployerId = async (req, res) => {
  try {
    const employerId = String(req.params.employerId);

    console.log('📩 Employer ID:', employerId);

    const chats = await Chat.aggregate([
      {
        $match: {
          employerId: employerId,
        }
      },
      { $sort: { updatedAt: -1 } },
      {
        $addFields: {
          latestMessage: {
            $cond: [
              { $gt: [{ $size: "$messages" }, 0] },
              { $arrayElemAt: ["$messages", -1] },
              null
            ]
          }
        }
      },
      {
        $project: {
          employeeId: 1,
          employeeImage: 1,
          employerName: 1,
          employerImage: 1,
          jobId: 1,
          updatedAt: 1,
          latestMessage: 1
        }
      }
    ]);

    console.log('✅ Chat count:', chats.length);
    res.status(200).json({ success: true, data: chats });
  } catch (error) {
    console.error('❌ Error fetching chats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


exports.getChatsByEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const chats = await Chat.find({ employeeId })
     
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
