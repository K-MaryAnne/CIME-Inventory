// server/controllers/itemController.js
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const path = require('path');
const sharp = require('sharp');


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
        { akuNo: { $regex: req.query.search, $options: 'i' } }
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
        akuNo,
        barcode,
        barcodeType, 
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
      let barcodeImageUrl = null; 
      
     
      if (barcodeType === 'existing' && barcode && barcode.trim() !== '') {
        
        const existingItem = await Item.findOne({ barcode });
        if (existingItem) {
          return res.status(400).json({ 
            message: 'This barcode is already assigned to another item' 
          });
        }
        
      
        itemBarcode = barcode;
      } else {
      
       const prefix = '1000'; 
       const timestamp = Date.now().toString().substring(8, 14); 
       const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
       itemBarcode = `${prefix}${timestamp}${random}`; 
}
      
     
      const newItem = await Item.create({
        name,
        category,
        description,
        akuNo,
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
      
     
      if (error.code === 11000) {
     
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
    
  
    const newBarcodeType = req.body.barcodeType;
    const newBarcode = req.body.barcode;
    
   
    if (newBarcodeType === 'existing' && newBarcode && newBarcode !== item.barcode) {
      const existingItem = await Item.findOne({ barcode: newBarcode });
      if (existingItem && existingItem._id.toString() !== req.params.id) {
        return res.status(400).json({ 
          message: 'This barcode is already assigned to another item' 
        });
      }
    }
    
 
    let finalBarcode = item.barcode;
    let finalBarcodeType = item.barcodeType;
    
    if (newBarcodeType === 'existing') {
   
      finalBarcode = newBarcode;
      finalBarcodeType = 'existing';
    } else if (newBarcodeType === 'generate'  && (!item.barcode || item.barcodeType === 'existing' || newBarcode === '')) {
   
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
      
      await item.deleteOne();
      
      
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
    

    const transaction = await Transaction.create({
      item: item._id,
      type,
      quantity: parseInt(quantity),
      performedBy: req.user._id
     
    });



if (fromLocation && fromLocation !== '') {
  transactionData.fromLocation = fromLocation;
}

if (toLocation && toLocation !== '') {
  transactionData.toLocation = toLocation;
}

if (session && (session.name || session.location)) {
  transactionData.session = session;
}

if (rental && rental.rentedTo) {
  transactionData.rental = rental;
}

if (maintenance && (maintenance.provider || maintenance.expectedEndDate)) {
  transactionData.maintenance = maintenance;
}

if (notes) {
  transactionData.notes = notes;
}
    
  
    if (item.quantity <= item.reorderLevel && type === 'Check-out') {

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || 'system.cimenairobi@gmail.com',
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


// @desc    Create an enhanced transaction
// @route   POST /api/items/:id/enhanced-transaction
// @access  Private


const createEnhancedTransaction = async (req, res) => {
  try {
    console.log('=== TRANSACTION START ===');
    console.log('Request body:', req.body);
    
    const {
      type,
      quantity,
      fromLocation,
      toLocation,
      session,
      rental,
      maintenance,
      notes
    } = req.body;
    
    // Validate the quantity
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ 
        message: 'Quantity must be greater than zero' 
      });
    }
    
    // Get the item
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    console.log('Item found:', item.name, 'Category:', item.category);
    console.log('Current quantity:', item.quantity);
    console.log('Current availableQuantity:', item.availableQuantity);
    console.log('Current state:', item.currentState);

    // Initialize currentState if it doesn't exist
    if (!item.currentState) {
      item.currentState = {
        inMaintenance: 0,
        inSession: 0,
        rented: 0
      };
      console.log('Initialized currentState');
    }

    // Initialize availableQuantity if undefined
    if (item.availableQuantity === undefined) {
      if (item.category === 'Consumable') {
        item.availableQuantity = item.quantity;
      } else {
        item.availableQuantity = Math.max(0, 
          item.quantity - 
          (item.currentState.inMaintenance || 0) - 
          (item.currentState.inSession || 0) - 
          (item.currentState.rented || 0)
        );
      }
      console.log('Calculated availableQuantity:', item.availableQuantity);
    }
    
    // Process transaction based on type and category
    console.log('Processing transaction type:', type);
    
    if (item.category === 'Consumable') {
      // CONSUMABLE LOGIC
      switch (type) {
        case 'Stock Addition':
        case 'Add Stock':
        case 'Restock':
          console.log('Adding stock:', quantity);
          item.quantity += parseInt(quantity);
          item.availableQuantity = item.quantity; // For consumables, available = total
          break;
          
        case 'Stock Consumption':
        case 'Use Items':
        case 'Check-out':
          console.log('Consuming items:', quantity);
          if (item.availableQuantity < parseInt(quantity)) {
            return res.status(400).json({ 
              message: 'Not enough available items for consumption' 
            });
          }
          item.quantity -= parseInt(quantity);
          item.availableQuantity = item.quantity;
          break;
          
        case 'Check Out for Session':
          console.log('Taking for session:', quantity);
          if (item.availableQuantity < parseInt(quantity)) {
            return res.status(400).json({ 
              message: 'Not enough available items' 
            });
          }
          item.availableQuantity -= parseInt(quantity);
          item.currentState.inSession += parseInt(quantity);
          
          // Add session record
          if (!item.sessionRecords) item.sessionRecords = [];
          if (session && (session.name || session.location)) {
            item.sessionRecords.push({
              sessionName: session.name || 'Unnamed Session',
              location: session.location || 'Unknown Location',
              startDate: new Date(),
              quantity: parseInt(quantity),
              notes: notes || ''
            });
          }
          break;
          
        case 'Return from Session':
        case 'Check-in':
          console.log('Returning from session:', quantity);
          if (item.currentState.inSession < parseInt(quantity)) {
            return res.status(400).json({ 
              message: `Cannot return more items than are in session (${item.currentState.inSession} currently in session)` 
            });
          }
          item.availableQuantity += parseInt(quantity);
          item.currentState.inSession -= parseInt(quantity);
          break;
          
        case 'Stock Removal':
        case 'Remove Stock':
          console.log('Removing stock:', quantity);
          if (item.availableQuantity < parseInt(quantity)) {
            return res.status(400).json({ 
              message: 'Not enough available items for removal' 
            });
          }
          item.quantity -= parseInt(quantity);
          item.availableQuantity = item.quantity;
          break;
          
        default:
          return res.status(400).json({ 
            message: `Transaction type '${type}' is not valid for consumable items` 
          });
      }
    } else {
      // EQUIPMENT LOGIC
      switch (type) {
        case 'Stock Addition':
        case 'Add Stock':
        case 'Restock':
          console.log('Adding equipment:', quantity);
          item.quantity += parseInt(quantity);
          item.availableQuantity += parseInt(quantity);
          break;
          
        case 'Stock Removal':
        case 'Remove Stock':
          console.log('Removing equipment:', quantity);
          if (item.availableQuantity < parseInt(quantity)) {
            return res.status(400).json({ 
              message: 'Not enough available items for removal' 
            });
          }
          item.quantity -= parseInt(quantity);
          item.availableQuantity -= parseInt(quantity);
          break;
          
        case 'Check Out for Session':
        case 'Check-out':
          console.log('Taking equipment for session:', quantity);
          if (item.availableQuantity < parseInt(quantity)) {
            return res.status(400).json({ 
              message: 'Not enough available items' 
            });
          }
          item.availableQuantity -= parseInt(quantity);
          item.currentState.inSession += parseInt(quantity);
          
          if (!item.sessionRecords) item.sessionRecords = [];
          if (session && (session.name || session.location)) {
            item.sessionRecords.push({
              sessionName: session.name || 'Unnamed Session',
              location: session.location || 'Unknown Location',
              startDate: new Date(),
              quantity: parseInt(quantity),
              notes: notes || ''
            });
          }
          break;
          
        case 'Return from Session':
        case 'Check-in':
          console.log('Returning equipment from session:', quantity);
          if (item.currentState.inSession < parseInt(quantity)) {
            return res.status(400).json({ 
              message: `Cannot return more items than are in session (${item.currentState.inSession} currently in session)` 
            });
          }
          item.availableQuantity += parseInt(quantity);
          item.currentState.inSession -= parseInt(quantity);
          break;
          
        case 'Send to Maintenance':
        case 'Maintenance':
          console.log('Sending to maintenance:', quantity);
          if (item.availableQuantity < parseInt(quantity)) {
            return res.status(400).json({ 
              message: 'Not enough available items' 
            });
          }
          item.availableQuantity -= parseInt(quantity);
          item.currentState.inMaintenance += parseInt(quantity);
          item.lastMaintenanceDate = new Date();
          
          if (!item.maintenanceRecords) item.maintenanceRecords = [];
          item.maintenanceRecords.push({
            startDate: new Date(),
            expectedEndDate: maintenance?.expectedEndDate || null,
            provider: maintenance?.provider || '',
            quantity: parseInt(quantity),
            notes: notes || ''
          });
          break;
          
        case 'Return from Maintenance':
          console.log('Returning from maintenance:', quantity);
          if (item.currentState.inMaintenance < parseInt(quantity)) {
            return res.status(400).json({ 
              message: `Cannot return more items than are in maintenance (${item.currentState.inMaintenance} currently in maintenance)` 
            });
          }
          item.availableQuantity += parseInt(quantity);
          item.currentState.inMaintenance -= parseInt(quantity);
          break;
          
        default:
          return res.status(400).json({ 
            message: `Transaction type '${type}' is not valid for equipment items` 
          });
      }
    }
    
    // Ensure no negative values
    if (item.availableQuantity < 0) {
      item.availableQuantity = 0;
    }
    
    if (item.quantity < 0) {
      item.quantity = 0;
    }
    
    console.log('BEFORE SAVE:');
    console.log('Quantity:', item.quantity);
    console.log('Available:', item.availableQuantity);
    console.log('Current state:', item.currentState);
    
    // Update timestamp and save
    item.updatedAt = new Date();
    await item.save();
    
    console.log('Item saved successfully');
    
    // Create transaction record
    const transactionData = {
      item: item._id,
      type,
      quantity: parseInt(quantity),
      performedBy: req.user._id,
      notes
    };
    
    if (fromLocation && fromLocation !== '') {
      transactionData.fromLocation = fromLocation;
    }
    
    if (toLocation && toLocation !== '') {
      transactionData.toLocation = toLocation;
    }
    
    if (session && (session.name || session.location)) {
      transactionData.session = session;
    }
    
    if (rental && rental.rentedTo) {
      transactionData.rental = rental;
    }
    
    if (maintenance && (maintenance.provider || maintenance.expectedEndDate)) {
      transactionData.maintenance = maintenance;
    }
    
    const transaction = await Transaction.create(transactionData);
    console.log('Transaction created:', transaction._id);
    
    console.log('=== TRANSACTION COMPLETE ===');
    res.status(201).json(transaction);
    
  } catch (error) {
    console.error('=== TRANSACTION ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Get item transactions by category
// @route   GET /api/items/:id/transactions/grouped
// @access  Private
const getItemTransactionsGrouped = async (req, res) => {
  try {
    const itemId = req.params.id;
    
  
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    

    const transactions = await Transaction.find({ item: itemId })
      .populate('performedBy', 'name')
      .populate('fromLocation', 'name')
      .populate('toLocation', 'name')
      .sort({ timestamp: -1 });
    

    const grouped = {
      stock: [],      
      location: [],     
      session: [],      
      rental: [],     
      maintenance: [],  
      legacy: []        
    };
    
    
    transactions.forEach(txn => {
      switch (txn.type) {
        case 'Stock Addition':
        case 'Stock Removal':
          grouped.stock.push(txn);
          break;
          
        case 'Relocate':
          grouped.location.push(txn);
          break;
          
        case 'Check Out for Session':
        case 'Return from Session':
          grouped.session.push(txn);
          break;
          
        case 'Rent Out':
        case 'Return from Rental':
          grouped.rental.push(txn);
          break;
          
        case 'Send to Maintenance':
        case 'Return from Maintenance':
          grouped.maintenance.push(txn);
          break;
          
        default:
          grouped.legacy.push(txn);
          break;
      }
    });
    
  
    res.json({
      category: item.category,
      state: {
        available: item.availableQuantity,
        total: item.quantity,
        inMaintenance: item.currentState?.inMaintenance || 0,
        inSession: item.currentState?.inSession || 0,
        rented: item.currentState?.rented || 0
      },
      transactions: grouped
    });
  } catch (error) {
    console.error('Error getting grouped transactions:', error);
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
  getLowStockItems,
  createEnhancedTransaction,
  getItemTransactionsGrouped,
 
};