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
  getLowStockItems,
  createEnhancedTransaction,
  getItemTransactionsGrouped
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

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

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

// Create enhanced transaction for an item
router.post(
  '/:id/enhanced-transaction', 
  protect, 
  createEnhancedTransaction
);

// Keep original transaction endpoint for backward compatibility
router.post(
  '/:id/transaction', 
  protect, 
  createEnhancedTransaction // Use the enhanced handler for both endpoints
);

// Get grouped transactions for an item
router.get(
  '/:id/transactions/grouped',
  protect,
  getItemTransactionsGrouped
);

module.exports = router;