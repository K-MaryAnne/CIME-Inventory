// server/controllers/itemController.js
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const path = require('path');
const sharp = require('sharp');

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
      // Use deleteOne() instead of remove()
      await item.deleteOne();
      
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
      performedBy: req.user._id
     
    });


// Only add non-empty fields
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



// @desc    Create an enhanced transaction
// @route   POST /api/items/:id/transaction
// @access  Private
const createEnhancedTransaction = async (req, res) => {
  try {
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
    
    // Handle different transaction types
    switch (type) {
      // STOCK MANAGEMENT TRANSACTIONS
      
      case 'Stock Addition':
        // Add to total and available quantity
        item.quantity += parseInt(quantity);
        item.availableQuantity += parseInt(quantity);
        break;
        
      case 'Stock Removal':
        // Make sure there's enough available quantity
        if (item.availableQuantity < parseInt(quantity)) {
          return res.status(400).json({ 
            message: 'Not enough available items for removal' 
          });
        }
        
        // Remove from total and available quantity
        item.quantity -= parseInt(quantity);
        item.availableQuantity -= parseInt(quantity);
        break;
      
      // LOCATION TRANSACTIONS
      
      case 'Relocate':
        // For relocation, the item remains available
        // Just update the item's location
        if (toLocation) {
          item.location.room = toLocation;
        }
        break;
      
      // SESSION TRANSACTIONS
      
      case 'Check Out for Session':
        // Make sure there's enough available quantity
        if (item.availableQuantity < parseInt(quantity)) {
          return res.status(400).json({ 
            message: 'Not enough available items' 
          });
        }
        
        // Reduce available quantity
        item.availableQuantity -= parseInt(quantity);
        
        // Update session state
        item.currentState.inSession += parseInt(quantity);
        
        // Add session record if session info provided
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
        // Make sure the amount being returned doesn't exceed what's in session
        if (item.currentState.inSession < parseInt(quantity)) {
          return res.status(400).json({ 
            message: `Cannot return more items than are in session (${item.currentState.inSession} currently in session)` 
          });
        }
        
        // Increase available quantity
        item.availableQuantity += parseInt(quantity);
        
        // Update session state
        item.currentState.inSession -= parseInt(quantity);
        
        // Update session record if matching session found
        if (session && session.name) {
          const sessionRecord = item.sessionRecords.find(
            record => record.sessionName === session.name && !record.endDate
          );
          
          if (sessionRecord) {
            sessionRecord.endDate = new Date();
            sessionRecord.notes += notes ? `\nReturn notes: ${notes}` : '';
          }
        }
        break;
      
      // RENTAL TRANSACTIONS
      
      case 'Rent Out':
        // Make sure there's enough available quantity
        if (item.availableQuantity < parseInt(quantity)) {
          return res.status(400).json({ 
            message: 'Not enough available items' 
          });
        }
        
        // Reduce available quantity
        item.availableQuantity -= parseInt(quantity);
        
        // Update rental state
        item.currentState.rented += parseInt(quantity);
        
        // Add rental record if rental info provided
        if (rental && rental.rentedTo) {
          item.rentalRecords.push({
            rentedTo: rental.rentedTo,
            startDate: new Date(),
            expectedReturnDate: rental.expectedReturnDate || null,
            quantity: parseInt(quantity),
            notes: notes || ''
          });
        }
        break;
        
      case 'Return from Rental':
        // Make sure the amount being returned doesn't exceed what's rented
        if (item.currentState.rented < parseInt(quantity)) {
          return res.status(400).json({ 
            message: `Cannot return more items than are rented (${item.currentState.rented} currently rented)` 
          });
        }
        
        // Increase available quantity
        item.availableQuantity += parseInt(quantity);
        
        // Update rental state
        item.currentState.rented -= parseInt(quantity);
        
        // Update rental record if matching rental found
        if (rental && rental.rentedTo) {
          const rentalRecord = item.rentalRecords.find(
            record => record.rentedTo === rental.rentedTo && !record.returnedDate
          );
          
          if (rentalRecord) {
            rentalRecord.returnedDate = new Date();
            rentalRecord.notes += notes ? `\nReturn notes: ${notes}` : '';
          }
        }
        break;
      
      // MAINTENANCE TRANSACTIONS
      
      case 'Send to Maintenance':
        // Make sure there's enough available quantity
        if (item.availableQuantity < parseInt(quantity)) {
          return res.status(400).json({ 
            message: 'Not enough available items' 
          });
        }
        
        // Reduce available quantity
        item.availableQuantity -= parseInt(quantity);
        
        // Update maintenance state
        item.currentState.inMaintenance += parseInt(quantity);
        
        // Record maintenance start
        item.lastMaintenanceDate = new Date();
        
        // Add maintenance record
        item.maintenanceRecords.push({
          startDate: new Date(),
          expectedEndDate: maintenance?.expectedEndDate || null,
          quantity: parseInt(quantity),
          notes: notes || ''
        });
        break;
        
      case 'Return from Maintenance':
        // Make sure the amount being returned doesn't exceed what's in maintenance
        if (item.currentState.inMaintenance < parseInt(quantity)) {
          return res.status(400).json({ 
            message: `Cannot return more items than are in maintenance (${item.currentState.inMaintenance} currently in maintenance)` 
          });
        }
        
        // Increase available quantity
        item.availableQuantity += parseInt(quantity);
        
        // Update maintenance state
        item.currentState.inMaintenance -= parseInt(quantity);
        
        // Update maintenance record
        const maintenanceRecord = item.maintenanceRecords
          .filter(record => !record.completedDate)
          .sort((a, b) => b.startDate - a.startDate)[0];
          
        if (maintenanceRecord) {
          maintenanceRecord.completedDate = new Date();
          maintenanceRecord.notes += notes ? `\nCompletion notes: ${notes}` : '';
        }
        break;
      
      // LEGACY TRANSACTION TYPES (for backward compatibility)
      
      case 'Check-in':
        item.availableQuantity += parseInt(quantity);
        // Check if we need to update a state counter (for non-consumables)
        if (item.category !== 'Consumable') {
          if (item.status === 'Under Maintenance') {
            item.currentState.inMaintenance -= Math.min(
              parseInt(quantity), 
              item.currentState.inMaintenance
            );
          } else if (item.status === 'Rented Out') {
            item.currentState.rented -= Math.min(
              parseInt(quantity), 
              item.currentState.rented
            );
          } else if (item.status === 'In Session') {
            item.currentState.inSession -= Math.min(
              parseInt(quantity), 
              item.currentState.inSession
            );
          }
        }
        break;
        
      case 'Check-out':
        if (item.availableQuantity < parseInt(quantity)) {
          return res.status(400).json({ 
            message: 'Not enough available items' 
          });
        }
        item.availableQuantity -= parseInt(quantity);
        break;
        
      case 'Restock':
        item.quantity += parseInt(quantity);
        item.availableQuantity += parseInt(quantity);
        break;
        
      case 'Maintenance':
        if (item.category === 'Consumable') {
          return res.status(400).json({ 
            message: 'Maintenance is not applicable for consumable items' 
          });
        }
        
        if (item.availableQuantity < parseInt(quantity)) {
          return res.status(400).json({ 
            message: 'Not enough available items' 
          });
        }
        
        item.availableQuantity -= parseInt(quantity);
        item.currentState.inMaintenance += parseInt(quantity);
        item.lastMaintenanceDate = new Date();
        break;
        
      default:
        return res.status(400).json({ 
          message: 'Invalid transaction type' 
        });
    }
    
    // Save the updated item
    item.updatedAt = new Date();
    await item.save();
    
    // Create transaction record
    const transaction = await Transaction.create({
      item: item._id,
      type,
      quantity: parseInt(quantity),
      fromLocation,
      toLocation,
      session,
      rental,
      maintenance,
      performedBy: req.user._id,
      notes
    });
    
    // Check if consumable is below reorder level (for any transaction type)
    if (item.category === 'Consumable' && item.quantity <= item.reorderLevel) {
      // Send low stock alert email
      // (Keep existing low stock alert code)
    }
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};


// @desc    Get item transactions by category
// @route   GET /api/items/:id/transactions/grouped
// @access  Private
const getItemTransactionsGrouped = async (req, res) => {
  try {
    const itemId = req.params.id;
    
    // Get the item to determine its category
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Get all transactions for this item
    const transactions = await Transaction.find({ item: itemId })
      .populate('performedBy', 'name')
      .populate('fromLocation', 'name')
      .populate('toLocation', 'name')
      .sort({ timestamp: -1 });
    
    // Group transactions by state
    const grouped = {
      stock: [],        // Stock addition/removal
      location: [],     // Relocations
      session: [],      // Session check-outs/returns
      rental: [],       // Rental check-outs/returns
      maintenance: [],  // Maintenance transactions
      legacy: []        // Old transaction types
    };
    
    // Categorize each transaction
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
    
    // Respond with grouped transactions
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