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
  akuNo: { //serialNumber
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
    type: Number
    // required: true
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
    enum: ['Available', 'Partially Available', 'Unavailable', 'Under Maintenance', 'In Session', 'Rented Out', 'Out of Stock'],
    default: 'Available'
  },

   // Track availability separately from total quantity
   availableQuantity: {
    type: Number,
    default: function() {
      return this.quantity || 0;
    }
  },

   // Track items currently in various states
   currentState: {
    inMaintenance: {
      type: Number,
      default: 0
    },
    inSession: {
      type: Number,
      default: 0
    },
    rented: {
      type: Number,
      default: 0
    }
  },


   // Enhanced maintenance tracking
   maintenanceRecords: [{
    startDate: Date,
    expectedEndDate: Date,
    quantity: Number,
    notes: String,
    completedDate: Date
  }],
  
  // Enhanced rental tracking
  rentalRecords: [{
    rentedTo: String,
    startDate: Date,
    expectedReturnDate: Date,
    quantity: Number,
    notes: String,
    returnedDate: Date
  }],
  

  // Enhanced session tracking
  sessionRecords: [{
    sessionName: String,
    location: String,
    startDate: Date,
    endDate: Date,
    quantity: Number,
    notes: String
  }],


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




// Add a pre-save hook to update status based on availableQuantity and category
ItemSchema.pre('save', function(next) {
  // For consumables
  if (this.category === 'Consumable') {
    if (this.availableQuantity <= 0) {
      this.status = 'Out of Stock';
    } else if (this.availableQuantity < this.reorderLevel) {
      this.status = 'Available'; // Still available but low stock
    } else {
      this.status = 'Available';
    }
  } 
  // For non-consumables (equipment)
  else {
    if (this.availableQuantity <= 0) {
      // Determine the most appropriate unavailable status
      if (this.currentState.inMaintenance > 0 && 
          this.currentState.inMaintenance >= this.quantity) {
        this.status = 'Under Maintenance';
      } else if (this.currentState.rented > 0 && 
                this.currentState.rented >= this.quantity) {
        this.status = 'Rented Out';
      } else if (this.currentState.inSession > 0 && 
                this.currentState.inSession >= this.quantity) {
        this.status = 'In Session';
      } else {
        this.status = 'Unavailable';
      }
    } else if (this.availableQuantity < this.quantity) {
      this.status = 'Partially Available';
    } else {
      this.status = 'Available';
    }
  }
  
  next();
});

// Add index for fast barcode searching
ItemSchema.index({ barcode: 1 });

module.exports = mongoose.model('Item', ItemSchema);