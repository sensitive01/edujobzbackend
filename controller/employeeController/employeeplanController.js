const EmployeePlan = require('../../models/employeeplans');
const Employee = require('../../models/employeeschema');

/**
 * Get all active employee plans
 * GET /employee/plans
 */
const getPlans = async (req, res) => {
  try {
    const plans = await EmployeePlan.find({ isActive: true }).sort({ price: 1 });

    res.json({
      success: true,
      data: plans,
      count: plans.length
    });
  } catch (error) {
    console.error('❌ Error fetching employee plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans',
      error: error.message
    });
  }
};

/**
 * Activate a plan for an employee
 * POST /employee/plans/activate
 * Body: { employeeId, planId }
 */
const activatePlan = async (req, res) => {
  try {
    const { employeeId, planId } = req.body;

    if (!employeeId || !planId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and Plan ID are required'
      });
    }

    const employee = await Employee.findById(employeeId);
    const plan = await EmployeePlan.findById(planId);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: 'Plan not found or inactive' });
    }

    const currentDate = new Date();
    let subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + plan.validityDays);

    // Extend if already has active subscription
    if (employee.currentSubscription && employee.currentSubscription.endDate) {
      const endDate = new Date(employee.currentSubscription.endDate);
      if (endDate > currentDate) {
        subscriptionEndDate = new Date(endDate);
        subscriptionEndDate.setDate(subscriptionEndDate.getDate() + plan.validityDays);
      }
    }

    const subscriptionRecord = {
      planId: plan._id,
      planDetails: plan.toObject(),
      isTrial: plan.price === 0,
      startDate: currentDate,
      endDate: subscriptionEndDate,
      status: 'active'
    };

    employee.subscriptions = employee.subscriptions || [];
    employee.subscriptions.push(subscriptionRecord);
    employee.currentSubscription = subscriptionRecord;

    // Verified-badge plans grant verification
    if (plan.verifiedBadge) {
      employee.isVerified = true;
      employee.verificationstatus = 'verified';
    }

    await employee.save();

    res.status(200).json({
      success: true,
      message: `Plan "${plan.name}" activated successfully`,
      data: {
        employeeId: employee._id,
        currentSubscription: employee.currentSubscription,
        isVerified: employee.isVerified,
        verificationstatus: employee.verificationstatus
      }
    });
  } catch (error) {
    console.error('❌ Error activating employee plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate plan',
      error: error.message
    });
  }
};

/**
 * Get verification status for an employee
 * GET /employee/verification-status/:employeeid
 */
const getVerificationStatus = async (req, res) => {
  try {
    const { employeeid } = req.params;

    if (!employeeid) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const employee = await Employee.findById(employeeid).select(
      'isVerified verificationstatus currentSubscription subscriptions'
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const hasActiveSubscription =
      employee.currentSubscription &&
      employee.currentSubscription.endDate &&
      new Date(employee.currentSubscription.endDate) > new Date();

    res.json({
      success: true,
      data: {
        isVerified: employee.isVerified,
        verificationstatus: employee.verificationstatus || 'pending',
        hasActiveSubscription,
        currentSubscription: hasActiveSubscription ? employee.currentSubscription : null
      }
    });
  } catch (error) {
    console.error('❌ Error fetching verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification status',
      error: error.message
    });
  }
};

module.exports = {
  getPlans,
  activatePlan,
  getVerificationStatus
};
