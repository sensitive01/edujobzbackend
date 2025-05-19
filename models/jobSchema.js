const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // Basic Information
  companyName: { type: String, },
  employid: { type: String, },
  jobTitle: { type: String,  },
  description: { type: String,  },
  category: { type: String,  },
  
  // Salary Information
  salaryFrom: { type: String, },
  salaryTo: { type: String,  },
  salaryType: { type: String, },
  
  // Job Details
  jobType: { 
    type: String, 
   
   
  },
  experienceLevel: { 
    type: String, 


  },
  educationLevel: { 
    type: String, 
   
 
  },
  openings: { type: String,  },
  
  // Location Information
  locationTypes: { 
    type: [String], 
  
  },
  location: { type: String },
  isRemote: { type: Boolean, default: false },
  
  // Skills and Benefits
  skills: { type: [String], default: [] },
  benefits: { type: String },
  
  // Contact Information
  contactEmail: { 
    type: String, 
  
  
  },
  contactPhone: { type: String },
  companyUrl: { type: String },
  
  // Application Details
  applicationInstructions: { type: String },
  deadline: { type: Date },
  priority: { 
    type: String, 
    
  },
   status: { type: String, },
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  isActive: { type: Boolean, default: true }
});



const Job = mongoose.model('Job', jobSchema);

module.exports = Job;