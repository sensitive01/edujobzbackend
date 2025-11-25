const createError = require('http-errors');
const EmployeePlan = require('../../models/employeeplans.js');
const Employee = require('../../models/employeeschema.js');

// Get all active employee plans
exports.getAllPlans = async (req, res, next) => {
  try {
    const { employeeId } = req.query; // Get employeeId from query params
    
    let plans = await EmployeePlan.find({ isActive: true }).sort({ price: 1 });
    
    // If employeeId is provided, check if they've already activated a free plan
    if (employeeId) {
      const employee = await Employee.findById(employeeId);
      if (employee && employee.subscriptions && employee.subscriptions.length > 0) {
        // Check if employee has any free plan in their history
        const hasUsedFreePlan = employee.subscriptions.some(sub => {
          const planDetails = sub.planDetails || {};
          return planDetails.price === 0 || planDetails.price === null || planDetails.price === undefined;
        });
        
        // Filter out free plans if employee has already used one
        if (hasUsedFreePlan) {
          plans = plans.filter(plan => plan.price > 0);
        }
      }
    }
    
    // Return plans with base price (without GST) - GST will be calculated on frontend if needed
    const plansData = plans.map(plan => {
      const planObj = plan.toObject();
      // Ensure price is the base price without GST
      return {
        ...planObj,
        basePrice: planObj.price, // Base price without GST
        price: planObj.price, // Keep price as base price
      };
    });
    res.json({
      success: true,
      data: plansData,
      count: plansData.length
    });
  } catch (error) {
    next(createError(500, `Error fetching employee plans: ${error.message}`));
  }
};

// Get single plan by ID
exports.getPlanById = async (req, res, next) => {
  try {
    const plan = await EmployeePlan.findById(req.params.id);
    if (!plan || !plan.isActive) {
      return next(createError(404, 'Plan not found or inactive'));
    }
    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    next(createError(500, `Error fetching plan: ${error.message}`));
  }
};

// Create new employee plan
exports.createPlan = async (req, res, next) => {
  try {
    const plan = new EmployeePlan(req.body);
    await plan.save();
    res.status(201).json({
      success: true,
      data: plan,
      message: 'Employee plan created successfully'
    });
  } catch (error) {
    next(createError(400, `Error creating plan: ${error.message}`));
  }
};

// Update plan
exports.updatePlan = async (req, res, next) => {
  try {
    const plan = await EmployeePlan.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now(),
      },
      {
        new: true,
        runValidators: true
      }
    );
    if (!plan) {
      return next(createError(404, 'Plan not found'));
    }
    res.json({
      success: true,
      data: plan,
      message: 'Plan updated successfully'
    });
  } catch (error) {
    next(createError(400, `Error updating plan: ${error.message}`));
  }
};

// Delete plan (soft delete)
exports.deletePlan = async (req, res, next) => {
  try {
    const plan = await EmployeePlan.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );
    if (!plan) {
      return next(createError(404, 'Plan not found'));
    }
    res.json({
      success: true,
      data: plan,
      message: 'Plan deactivated successfully'
    });
  } catch (error) {
    next(createError(500, `Error deactivating plan: ${error.message}`));
  }
};

// Activate verified badge subscription for employee
exports.activateVerifiedBadge = async (req, res) => {
  try {
    const { employeeId, planId } = req.body;

    // Validate input
    if (!employeeId || !planId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee ID and Plan ID are required' 
      });
    }

    // Find the employee and plan
    const employee = await Employee.findById(employeeId);
    const plan = await EmployeePlan.findById(planId);

    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }
    
    if (!plan || !plan.isActive) {
      return res.status(404).json({ 
        success: false, 
        message: 'Plan not found or inactive' 
      });
    }

    // Verify it's a verified badge plan
    if (!plan.verifiedBadge) {
      return res.status(400).json({ 
        success: false, 
        message: 'This plan does not include verified badge feature' 
      });
    }

    const isFreeTrial = plan.price === 0;
    const currentDate = new Date();
    let subscriptionEndDate;

    // Calculate end date
    subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + plan.validityDays);

    // Create subscription record
    const subscriptionRecord = {
      planId: plan._id,
      planDetails: plan.toObject(), // Store complete plan details
      isTrial: isFreeTrial,
      startDate: currentDate,
      endDate: subscriptionEndDate,
      daysLeft: plan.validityDays,
      status: 'active'
    };

    // Update employee with verified badge and subscription
    employee.isVerified = true;
    employee.verificationstatus = 'verified';
    
    // Add to subscriptions history
    employee.subscriptions.push(subscriptionRecord);
    employee.currentSubscription = subscriptionRecord;

    // Maintain backward compatibility
    employee.subscription = "true";
    employee.trial = isFreeTrial ? 'true' : 'false';
    employee.subscriptionenddate = subscriptionEndDate.toISOString();
    employee.subscriptionleft = plan.validityDays;
    
    await employee.save();

    return res.status(200).json({
      success: true,
      message: `Verified badge activated successfully for ${plan.validityDays} days`,
      data: {
        employeeId: employee._id,
        isVerified: employee.isVerified,
        verificationstatus: employee.verificationstatus,
        planDetails: {
          planName: plan.name,
          validityDays: plan.validityDays,
          endDate: subscriptionEndDate,
          isTrial: isFreeTrial
        }
      }
    });
  } catch (error) {
    console.error('Error activating verified badge:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get employee's current verified badge status
exports.getEmployeeVerificationStatus = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    
    if (!employeeId) {
      return next(createError(400, 'Employee ID is required'));
    }

    const employee = await Employee.findById(employeeId);
    
    if (!employee) {
      return next(createError(404, 'Employee not found'));
    }

    // Calculate days left from current subscription
    let daysLeft = 0;
    let subscriptionStatus = 'inactive';
    
    if (employee.currentSubscription && employee.currentSubscription.endDate) {
      const endDate = new Date(employee.currentSubscription.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      const diffTime = endDate - today;
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 0) {
        subscriptionStatus = 'active';
      } else {
        subscriptionStatus = 'expired';
        daysLeft = 0;
      }
    }

    res.json({
      success: true,
      data: {
        employeeId: employee._id,
        isVerified: employee.isVerified || false,
        verificationstatus: employee.verificationstatus || 'pending',
        currentSubscription: employee.currentSubscription,
        subscriptions: employee.subscriptions || [],
        daysLeft: daysLeft,
        subscriptionStatus: subscriptionStatus
      }
    });
  } catch (error) {
    next(createError(500, `Error fetching verification status: ${error.message}`));
  }
};

