// server/controllers/itemController.js
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

// Setup email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// @desc    Get all items
// @route   GET /api/items
// @access  Private
const getItems = async (req, res) => {
  try {
    // Build filter object from query parameters
    const filter = {};
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.location) {
      filter['location.room'] = req.query.location;
    }
    
    // Support search by name or barcode
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { barcode: { $regex: req.query.search, $options: 'i' } },
        { serialNumber: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const total = await Item.countDocuments(filter);
    
    // Get items with pagination
    const items = await Item.find(filter)
      .populate('location.room', 'name')
      .populate('location.rack', 'name')
      .populate('location.shelf', 'name')
      .populate('supplier', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      items,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get item by ID
// @route   GET /api/items/:id
// @access  Private
const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('location.room', 'name')
      .populate('location.rack', 'name')
      .populate('location.shelf', 'name')
      .populate('supplier', 'name')
      .populate('createdBy', 'name');
    
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new item
// @route   POST /api/items
// @access  Private/Admin,InventoryManager
const createItem = async (req, res) => {
  console.log('User from request:', req.user);
console.log('Authorization header:', req.headers.authorization);
console.log('Attempting to create item with data:', req.body);
    try {
      const {
        name,
        category,
        description,
        serialNumber,
        barcode,
        barcodeType, // 'existing' or 'generate'
        location,
        quantity,
        unit,
        unitCost,
        reorderLevel,
        supplier,
        manufacturer,
        status,
        purchaseDate,
        notes
      } = req.body;
      
      let itemBarcode;
      let barcodeImageUrl = null; // Not storing an image URL anymore
      
      // Handle barcode based on type
      if (barcodeType === 'existing' && barcode && barcode.trim() !== '') {
        // Check if the existing barcode is already in use
        const existingItem = await Item.findOne({ barcode });
        if (existingItem) {
          return res.status(400).json({ 
            message: 'This barcode is already assigned to another item' 
          });
        }
        
        // Use the existing manufacturer barcode
        itemBarcode = barcode;
      } else {
       // Generate a scanner-friendly barcode
       const prefix = '1000'; // Simple numeric prefix
       const timestamp = Date.now().toString().substring(8, 14); // 6 digits from timestamp
       const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
       itemBarcode = `${prefix}${timestamp}${random}`; // Purely numeric barcode
}
      
      // Create the item without barcodeImageUrl
      const newItem = await Item.create({
        name,
        category,
        description,
        serialNumber,
        barcode: itemBarcode,
        barcodeType: barcodeType || 'generate',
        location,
        quantity,
        unit,
        unitCost,
        reorderLevel,
        supplier,
        manufacturer,
        status: status || 'Available',
        purchaseDate,
        notes,
        createdBy: req.user ? req.user._id : null
      });
      
      res.status(201).json(newItem);
    } catch (error) {
      console.error('Error creating item:', error);
      
      // Check for duplicate key error
      if (error.code === 11000) {
        // Determine which field caused the duplicate key error
        let duplicateField = 'item';
        if (error.keyPattern) {
          duplicateField = Object.keys(error.keyPattern)[0];
        }
        
        return res.status(400).json({ 
          message: `An ${duplicateField} with this value already exists` 
        });
      }
      
      res.status(500).json({ message: 'Server Error' });
    }
  };

// @desc    Update an item
// @route   PUT /api/items/:id
// @access  Private/Admin,InventoryManager
const updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Check if barcode is being changed
    const newBarcodeType = req.body.barcodeType;
    const newBarcode = req.body.barcode;
    
    // If changing to an existing barcode, verify it's not already in use
    if (newBarcodeType === 'existing' && newBarcode && newBarcode !== item.barcode) {
      const existingItem = await Item.findOne({ barcode: newBarcode });
      if (existingItem && existingItem._id.toString() !== req.params.id) {
        return res.status(400).json({ 
          message: 'This barcode is already assigned to another item' 
        });
      }
    }
    
    // For generated barcodes, generate a new one if explicitly requested
    let finalBarcode = item.barcode;
    let finalBarcodeType = item.barcodeType;
    
    if (newBarcodeType === 'existing') {
      // Use the provided barcode
      finalBarcode = newBarcode;
      finalBarcodeType = 'existing';
    } else if (newBarcodeType === 'generate'  && (!item.barcode || item.barcodeType === 'existing' || newBarcode === '')) {
      // Generate a new barcode when:
      // 1. The item doesn't have a barcode yet OR
      // 2. We're explicitly generating a new one (empty barcode sent) OR
      // 3. We're changing from existing to generated barcode type
      if (!item.barcode || newBarcode === '' || item.barcodeType === 'existing') {
        const prefix = '1000'; // Simple numeric prefix
        const timestamp = Date.now().toString().substring(8, 14); 
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        finalBarcode =  `${prefix}${timestamp}${random}`;
        finalBarcodeType = 'generate';
        
        console.log('Generated new barcode:', finalBarcode);
      }
    }
    
    // Update item fields
    item.barcode = finalBarcode;
    item.barcodeType = finalBarcodeType;
    
    // Rest of your update logic...
    
    const updatedItem = await item.save();
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete an item
// @route   DELETE /api/items/:id
// @access  Private/Admin
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (item) {
      await item.remove();
      
      // Also remove related transactions
      await Transaction.deleteMany({ item: req.params.id });
      
      res.json({ message: 'Item removed' });
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get item by barcode
// @route   GET /api/items/barcode/:code
// @access  Private
const getItemByBarcode = async (req, res) => {
  try {
    const item = await Item.findOne({ barcode: req.params.code })
      .populate('location.room', 'name')
      .populate('location.rack', 'name')
      .populate('location.shelf', 'name')
      .populate('supplier', 'name');
    
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ message: 'Item not found with this barcode' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Check-in/Check-out item
// @route   POST /api/items/:id/transaction
// @access  Private
const createItemTransaction = async (req, res) => {
  try {
    const {
      type,
      quantity,
      fromLocation,
      toLocation,
      notes
    } = req.body;
    
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Update item quantity based on transaction type
    if (type === 'Check-in') {
      item.quantity += parseInt(quantity);
      if (item.status === 'Out of Stock' && item.quantity > 0) {
        item.status = 'Available';
      }
    } else if (type === 'Check-out') {
      if (item.quantity < parseInt(quantity)) {
        return res.status(400).json({ message: 'Not enough items in stock' });
      }
      item.quantity -= parseInt(quantity);
      if (item.quantity === 0) {
        item.status = 'Out of Stock';
      }
    } else if (type === 'Maintenance') {
      item.status = 'Under Maintenance';
      item.lastMaintenanceDate = Date.now();
    }
    
    item.updatedAt = Date.now();
    await item.save();
    
    // Create transaction record
    const transaction = await Transaction.create({
      item: item._id,
      type,
      quantity: parseInt(quantity),
      fromLocation,
      toLocation,
      performedBy: req.user._id,
      notes
    });
    
    // Check if below reorder level
    if (item.quantity <= item.reorderLevel && type === 'Check-out') {
      // Send low stock alert email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || 'admin@cimenairobi.com',
        subject: `Low Stock Alert: ${item.name}`,
        html: `
          <h2>Low Stock Alert</h2>
          <p>The following item has reached its reorder level:</p>
          <ul>
            <li><strong>Item:</strong> ${item.name}</li>
            <li><strong>Current Quantity:</strong> ${item.quantity} ${item.unit}</li>
            <li><strong>Reorder Level:</strong> ${item.reorderLevel} ${item.unit}</li>
          </ul>
          <p>Please restock this item soon.</p>
        `
      };
      
      try {
        await transporter.sendMail(mailOptions);
        console.log(`Low stock alert sent for ${item.name}`);
      } catch (err) {
        console.error('Email sending failed:', err);
      }
    }
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get low stock items
// @route   GET /api/items/low-stock
// @access  Private/Admin,InventoryManager
const getLowStockItems = async (req, res) => {
  try {
    const items = await Item.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] }
    })
      .populate('location.room', 'name')
      .populate('supplier', 'name')
      .sort({ quantity: 1 });
    
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getItemByBarcode,
  createItemTransaction,
  getLowStockItems
};