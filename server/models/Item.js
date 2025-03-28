// models/Item.js
const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  // category: {
  //   type: String,
  //   enum: ['Task Trainer', 'Manikin', 'Consumable', 'Electronic', 'Device', 'Other'],
  //   required: true
  // },
  category: {
    type: String,
    required: true
  },
  categoryType: {
    type: String,
    enum: ['Task Trainer', 'Manikin', 'Consumable', 'Electronic', 'Device', 'Custom'],
    default: 'Custom' 
  },
  description: {
    type: String
  },
  serialNumber: {
    type: String,
    unique: true,
    sparse: true // Allows null/undefined values
  },
  barcode: {
    type: String,
    unique: true
  },

  barcodeType: {
    type: String,
    enum: ['existing', 'generate'],
    default: 'generate'
  },
 
  barcodeImageUrl: {
    type: String
  },
  location: {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    },
    rack: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    },
    shelf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    }
  },
  quantity: {
    type: Number,
    default: 1
  },
  unit: {
    type: String,
    default: 'piece'
  },
  unitCost: {
    type: Number,
    required: true
  },
  reorderLevel: {
    type: Number,
    default: 5
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  manufacturer: {
    type: String
  },
  status: {
    type: String,
    enum: ['Available', 'Under Maintenance', 'Rented', 'Out of Stock'],
    default: 'Available'
  },
  lastMaintenanceDate: {
    type: Date
  },
  nextMaintenanceDate: {
    type: Date
  },
  purchaseDate: {
    type: Date
  },
//   imageUrl: {
//     type: String
//   },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for fast barcode searching
ItemSchema.index({ barcode: 1 });

module.exports = mongoose.model('Item', ItemSchema);