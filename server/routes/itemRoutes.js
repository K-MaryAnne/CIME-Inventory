// server/routes/itemRoutes.js
const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  }
});

// File filter function - ADD THIS
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

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
  getItemTransactionsGrouped,
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

// Create enhanced transaction for an item
router.post(
  '/:id/enhanced-transaction', 
  protect, 
  createEnhancedTransaction
);

// Create transaction for an item (using enhanced handler)
router.post(
  '/:id/transaction', 
  protect, 
  createEnhancedTransaction
);

// Get grouped transactions for an item
router.get(
  '/:id/transactions/grouped',
  protect,
  getItemTransactionsGrouped
);

module.exports = router;