// server/routes/locationRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationHierarchy
} = require('../controllers/locationController');
const { protect, authorize } = require('../middleware/auth');

// Get all locations and create new location
router.route('/')
  .get(protect, getLocations)
  .post(
    protect, 
    authorize('Admin', 'Inventory Manager'), 
    createLocation
  );

// Get location hierarchy
router.get('/hierarchy', protect, getLocationHierarchy);

// Get, update and delete location by ID
router.route('/:id')
  .get(protect, getLocationById)
  .put(
    protect, 
    authorize('Admin', 'Inventory Manager'), 
    updateLocation
  )
  .delete(
    protect, 
    authorize('Admin'), 
    deleteLocation
  );

module.exports = router;