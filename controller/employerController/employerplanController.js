const createError = require('http-errors');
const Plan = require('../../models/employerplans.js');

const planController = {
  // Get all plans
  async getAllPlans(req, res, next) {
    try {
      const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
      res.json({
        success: true,
        data: plans,
        count: plans.length
      });
    } catch (error) {
      next(createError(500, `Error fetching plans: ${error.message}`));
    }
  },

  // Get single plan by ID
  async getPlanById(req, res, next) {
    try {
      const plan = await Plan.findById(req.params.id);
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
  },

  // Create new plan
  async createPlan(req, res, next) {
    try {
      const plan = new Plan(req.body);
      await plan.save();
      res.status(201).json({
        success: true,
        data: plan,
        message: 'Plan created successfully'
      });
    } catch (error) {
      next(createError(400, `Error creating plan: ${error.message}`));
    }
  },

  // Update plan
  async updatePlan(req, res, next) {
    try {
      const plan = await Plan.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedAt: Date.now() },
        { new: true, runValidators: true }
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
  },

  // Delete plan (soft delete)
  async deletePlan(req, res, next) {
    try {
      const plan = await Plan.findByIdAndUpdate(
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
  }
};

module.exports = planController;