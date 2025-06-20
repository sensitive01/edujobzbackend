const HelpRequest = require('../../models/employerhelpsupport');

// Create Help Request
exports.createHelpRequest = async (req, res) => {
  try {
    const {issue, description, employerid, employeractive } = req.body;
    const helpRequest = new HelpRequest({issue, description, employerid, employeractive });
    await helpRequest.save();
    res.status(201).json({ message: 'Help request created successfully', helpRequest });
  } catch (error) {
    console.error('Error creating help request:', error);
    res.status(500).json({ error: 'Failed to create help request' });
  }
};

// Get Help Requests
exports.getHelpRequests = async (req, res) => {
  try {
    const { employerid } = req.params;
    const helpRequests = await HelpRequest.find({ employerid });
    res.status(200).json({ helpRequests });
  } catch (error) {
    console.error('Error fetching help requests:', error);
    res.status(500).json({ error: 'Failed to fetch help requests' });
  }
};

// Fetch Chat Messages
// For fetching chat messages
exports.fetchChat = async (req, res) => {
  try {
    const helpRequest = await HelpRequest.findById(req.params.docId);
    if (!helpRequest) {
      return res.status(404).json({ message: 'Help request not found' });
    }
    res.status(200).json({ chatbox: helpRequest.chatbox });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat', error });
  }
};

// For sending chat messages
exports.sendChat = async (req, res) => {
  try {
    const { docId } = req.params;
    const { employerid, message } = req.body;
    
    const updateData = {
      $push: {
        chatbox: {
          employerid,
          message: message || '',
          image: req.file ? req.file.path : null,
          timestamp: new Date()
        }
      }
    };

    const updatedRequest = await HelpRequest.findByIdAndUpdate(
      docId,
      updateData,
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: 'Help request not found' });
    }

    res.status(200).json(updatedRequest);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error });
  }
};
