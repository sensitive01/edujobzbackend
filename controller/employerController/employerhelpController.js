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
exports.fetchChat = async (req, res) => {
  try {
    const { docId } = req.params;
    const helpRequest = await HelpRequest.findById(docId).select('chatbox');
    if (!helpRequest) {
      return res.status(404).json({ error: 'Help request not found' });
    }
    res.status(200).json({ chatbox: helpRequest.chatbox });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
};

// Send Chat Message
exports.sendChat = async (req, res) => {
  try {
    const { docId } = req.params;
    const { employerid, message } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const helpRequest = await HelpRequest.findById(docId);
    if (!helpRequest) {
      return res.status(404).json({ error: 'Help request not found' });
    }

    const chatMessage = { employerid, message, image, timestamp: new Date() };
    helpRequest.chatbox.push(chatMessage);
    await helpRequest.save();

    res.status(200).json({ message: 'Chat message sent successfully', chatMessage });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({ error: 'Failed to send chat message' });
  }
};
