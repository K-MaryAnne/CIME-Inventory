// server/controllers/supplierController.js
const Supplier = require('../models/Supplier');
const Item = require('../models/Item');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({}).sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get supplier by ID
// @route   GET /api/suppliers/:id
// @access  Private
const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (supplier) {
      res.json(supplier);
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new supplier
// @route   POST /api/suppliers
// @access  Private/Admin,InventoryManager
const createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, email, phone, address } = req.body;
    
    const supplier = await Supplier.create({
      name,
      contactPerson,
      email,
      phone,
      address
    });
    
    res.status(201).json(supplier);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a supplier
// @route   PUT /api/suppliers/:id
// @access  Private/Admin,InventoryManager
const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (supplier) {
      supplier.name = req.body.name || supplier.name;
      supplier.contactPerson = req.body.contactPerson || supplier.contactPerson;
      supplier.email = req.body.email || supplier.email;
      supplier.phone = req.body.phone || supplier.phone;
      supplier.address = req.body.address || supplier.address;
      
      const updatedSupplier = await supplier.save();
      res.json(updatedSupplier);
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a supplier
// @route   DELETE /api/suppliers/:id
// @access  Private/Admin
const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    // Check if supplier is being used by any items
    const itemsUsingSupplier = await Item.findOne({ supplier: req.params.id });
    if (itemsUsingSupplier) {
      return res.status(400).json({ 
        message: 'Cannot delete supplier that is associated with items' 
      });
    }
    
    await supplier.remove();
    res.json({ message: 'Supplier removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get items by supplier
// @route   GET /api/suppliers/:id/items
// @access  Private
const getSupplierItems = async (req, res) => {
  try {
    const items = await Item.find({ supplier: req.params.id })
      .populate('location.room', 'name')
      .sort({ name: 1 });
    
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierItems
};