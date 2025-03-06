// server/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getDashboardSummary,
  getInventoryReport,
  getTransactionsReport,
  getMaintenanceReport,
  getLocationReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// Get dashboard summary
router.get('/dashboard', protect, getDashboardSummary);

// Get inventory report
router.get('/inventory', protect, getInventoryReport);

// Get transactions report
router.get('/transactions', protect, getTransactionsReport);

// Get maintenance report
router.get('/maintenance', protect, getMaintenanceReport);

// Get location usage report
router.get('/locations', protect, getLocationReport);

module.exports = router;