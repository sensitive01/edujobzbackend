const EmployeeHelpRequest = require('../../models/employeehelpsupport');
const { v4: uuidv4 } = require('uuid');

// Create or get active help session for employee
exports.getOrCreateHelpSession = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Find active session for this employee
    let helpSession = await EmployeeHelpRequest.findOne({ 
      employeeId, 
      status: 'Active' 
    }).sort({ date: -1 }); // Get most recent active session
    
    // If no active session exists, create a new one
    if (!helpSession) {
      helpSession = new EmployeeHelpRequest({
        employeeId,
        sessionId: uuidv4(),
        status: 'Active',
        messages: []
      });
      await helpSession.save();
    }
    
    res.status(200).json({ 
      success: true, 
      session: helpSession,
      messages: helpSession.messages 
    });
  } catch (error) {
    console.error('Error getting/creating help session:', error);
    res.status(500).json({ error: 'Failed to get help session' });
  }
};

// Save message to help session
exports.saveMessage = async (req, res) => {
  try {
    const { sessionId, sender, message, options, selectedOption } = req.body;
    
    if (!sessionId || !sender || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const messageData = {
      sender,
      message,
      timestamp: new Date(),
    };
    
    if (options && Array.isArray(options)) {
      messageData.options = options;
    }
    
    if (selectedOption) {
      messageData.selectedOption = selectedOption;
    }
    
    const helpSession = await EmployeeHelpRequest.findOneAndUpdate(
      { sessionId },
      { $push: { messages: messageData } },
      { new: true }
    );
    
    if (!helpSession) {
      return res.status(404).json({ error: 'Help session not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Message saved successfully',
      session: helpSession 
    });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
};

// Get all messages for a session
exports.getMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const helpSession = await EmployeeHelpRequest.findOne({ sessionId });
    
    if (!helpSession) {
      return res.status(404).json({ error: 'Help session not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      messages: helpSession.messages,
      session: helpSession 
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Close/Archive a help session
exports.closeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const helpSession = await EmployeeHelpRequest.findOneAndUpdate(
      { sessionId },
      { status: 'Closed' },
      { new: true }
    );
    
    if (!helpSession) {
      return res.status(404).json({ error: 'Help session not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Session closed successfully',
      session: helpSession 
    });
  } catch (error) {
    console.error('Error closing session:', error);
    res.status(500).json({ error: 'Failed to close session' });
  }
};

