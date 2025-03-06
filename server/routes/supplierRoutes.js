
// server/routes/supplierRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierItems
} = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/auth');

// Get all suppliers and create new supplier
router.route('/')
  .get(protect, getSuppliers)
  .post(
    protect, 
    authorize('Admin', 'Inventory Manager'), 
    createSupplier
  );

// Get, update and delete supplier by ID
router.route('/:id')
  .get(protect, getSupplierById)
  .put(
    protect, 
    authorize('Admin', 'Inventory Manager'), 
    updateSupplier
  )
  .delete(
    protect, 
    authorize('Admin'), 
    deleteSupplier
  );

// Get items by supplier
router.get('/:id/items', protect, getSupplierItems);

module.exports = router;