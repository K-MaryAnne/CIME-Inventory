// server/routes/itemRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getItemByBarcode,
  createItemTransaction,
  getLowStockItems
} = require('../controllers/itemController');
const { protect, authorize } = require('../middleware/auth');

// Get all items and create new item
router.route('/')
  .get(protect, getItems)
  .post(
    protect, 
    authorize('Admin', 'Inventory Manager'), 
    createItem
  );

// Get low stock items
router.get(
  '/low-stock', 
  protect, 
  authorize('Admin', 'Inventory Manager'), 
  getLowStockItems
);

// Get item by barcode
router.get('/barcode/:code', protect, getItemByBarcode);

// Get, update and delete item by ID
router.route('/:id')
  .get(protect, getItemById)
  .put(
    protect, 
    authorize('Admin', 'Inventory Manager'), 
    updateItem
  )
  .delete(
    protect, 
    authorize('Admin'), 
    deleteItem
  );

// Create transaction for an item
router.post(
  '/:id/transaction', 
  protect, 
  createItemTransaction
);

module.exports = router;