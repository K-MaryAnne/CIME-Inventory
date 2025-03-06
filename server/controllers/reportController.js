// server/controllers/reportController.js
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const Location = require('../models/Location');
const Supplier = require('../models/Supplier');

// @desc    Get dashboard summary
// @route   GET /api/reports/dashboard
// @access  Private
const getDashboardSummary = async (req, res) => {
  try {
    // Get total items count
    const totalItems = await Item.countDocuments();
    
    // Get items count by category
    const itemsByCategory = await Item.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Get items count by status
    const itemsByStatus = await Item.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Get low stock items count
    const lowStockItems = await Item.countDocuments({
      $expr: { $lte: ['$quantity', '$reorderLevel'] }
    });
    
    // Get items under maintenance count
    const itemsUnderMaintenance = await Item.countDocuments({
      status: 'Under Maintenance'
    });
    
    // Get total value of inventory
    const inventoryValue = await Item.aggregate([
      {
        $project: {
          totalValue: { $multiply: ['$quantity', '$unitCost'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalValue' }
        }
      }
    ]);
    
    // Get recent transactions
    const recentTransactions = await Transaction.find({})
      .populate('item', 'name barcode')
      .populate('performedBy', 'name')
      .populate('fromLocation', 'name')
      .populate('toLocation', 'name')
      .sort({ timestamp: -1 })
      .limit(10);
    
    // Get locations count
    const locationsCount = {
      rooms: await Location.countDocuments({ type: 'Room' }),
      racks: await Location.countDocuments({ type: 'Rack' }),
      shelves: await Location.countDocuments({ type: 'Shelf' })
    };
    
    // Get suppliers count
    const suppliersCount = await Supplier.countDocuments();
    
    res.json({
      totalItems,
      itemsByCategory,
      itemsByStatus,
      lowStockItems,
      itemsUnderMaintenance,
      inventoryValue: inventoryValue.length > 0 ? inventoryValue[0].total : 0,
      recentTransactions,
      locationsCount,
      suppliersCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get inventory summary report
// @route   GET /api/reports/inventory
// @access  Private
const getInventoryReport = async (req, res) => {
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
    
    // Sort options
    let sort = { name: 1 };
    if (req.query.sort) {
      if (req.query.sort === 'value') {
        sort = { unitCost: -1 };
      } else if (req.query.sort === 'quantity') {
        sort = { quantity: -1 };
      }
    }
    
    // Get inventory items with populated fields
    const items = await Item.find(filter)
      .populate('location.room', 'name')
      .populate('location.rack', 'name')
      .populate('location.shelf', 'name')
      .populate('supplier', 'name')
      .sort(sort);
    
    // Calculate total values
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Group by category
    const itemsByCategory = {};
    items.forEach(item => {
      if (!itemsByCategory[item.category]) {
        itemsByCategory[item.category] = {
          count: 0,
          value: 0,
          quantity: 0
        };
      }
      
      itemsByCategory[item.category].count += 1;
      itemsByCategory[item.category].value += item.quantity * item.unitCost;
      itemsByCategory[item.category].quantity += item.quantity;
    });
    
    res.json({
      items,
      summary: {
        totalItems,
        totalValue,
        totalQuantity,
        itemsByCategory
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get transactions report
// @route   GET /api/reports/transactions
// @access  Private
const getTransactionsReport = async (req, res) => {
  try {
    // Build filter object from query parameters
    const filter = {};
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    if (req.query.item) {
      filter.item = req.query.item;
    }
    
    if (req.query.user) {
      filter.performedBy = req.query.user;
    }
    
    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      filter.timestamp = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.timestamp = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.timestamp = { $lte: new Date(req.query.endDate) };
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const total = await Transaction.countDocuments(filter);
    
    // Get transactions with pagination
    const transactions = await Transaction.find(filter)
      .populate('item', 'name barcode category')
      .populate('performedBy', 'name')
      .populate('fromLocation', 'name')
      .populate('toLocation', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    // Group by type
    const transactionsByType = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Group by day
    const transactionsByDay = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      transactions,
      page,
      pages: Math.ceil(total / limit),
      total,
      summary: {
        transactionsByType,
        transactionsByDay
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get maintenance report
// @route   GET /api/reports/maintenance
// @access  Private
const getMaintenanceReport = async (req, res) => {
  try {
    // Get items under maintenance
    const itemsUnderMaintenance = await Item.find({ status: 'Under Maintenance' })
      .populate('location.room', 'name')
      .sort({ lastMaintenanceDate: 1 });
    
    // Get items due for maintenance in the next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const itemsDueForMaintenance = await Item.find({
      nextMaintenanceDate: { $lte: thirtyDaysFromNow, $gte: new Date() }
    })
      .populate('location.room', 'name')
      .sort({ nextMaintenanceDate: 1 });
    
    // Get maintenance history (transactions with type 'Maintenance')
    const maintenanceHistory = await Transaction.find({ type: 'Maintenance' })
      .populate('item', 'name category')
      .populate('performedBy', 'name')
      .sort({ timestamp: -1 })
      .limit(50);
    
    res.json({
      itemsUnderMaintenance,
      itemsDueForMaintenance,
      maintenanceHistory
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get location usage report
// @route   GET /api/reports/locations
// @access  Private
const getLocationReport = async (req, res) => {
  try {
    // Get all locations with type Room
    const rooms = await Location.find({ type: 'Room' }).lean();
    
    // For each room, get the items and calculate usage statistics
    const roomsWithStats = await Promise.all(rooms.map(async (room) => {
      // Count items in this room
      const itemsCount = await Item.countDocuments({ 'location.room': room._id });
      
      // Calculate total value of items in this room
      const valueStats = await Item.aggregate([
        { $match: { 'location.room': room._id } },
        {
          $group: {
            _id: null,
            totalValue: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
            totalItems: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' }
          }
        }
      ]);
      
      // Count items by category in this room
      const itemsByCategory = await Item.aggregate([
        { $match: { 'location.room': room._id } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      return {
        ...room,
        itemsCount,
        valueStats: valueStats[0] || { totalValue: 0, totalItems: 0, totalQuantity: 0 },
        itemsByCategory
      };
    }));
    
    res.json(roomsWithStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getDashboardSummary,
  getInventoryReport,
  getTransactionsReport,
  getMaintenanceReport,
  getLocationReport
};