// models/Item.js
const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

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






ItemSchema.pre('save', function(next) {

  if (!this.currentState) {
    this.currentState = {
      inMaintenance: 0,
      inSession: 0,
      rented: 0
    };
  }
  

  if (this.availableQuantity === undefined) {
  
    const itemsOut = (this.currentState.inMaintenance || 0) + 
                     (this.currentState.inSession || 0) + 
                     (this.currentState.rented || 0);
    this.availableQuantity = Math.max(0, this.quantity - itemsOut);
  }
  

  this.availableQuantity = Math.max(0, Math.min(this.availableQuantity, this.quantity));
  
 
  if (this.category === 'Consumable') {
  
    if (this.availableQuantity <= 0) {
      this.status = 'Out of Stock';
    } else if (this.availableQuantity <= this.reorderLevel) {
      this.status = 'Available'; 
    } else {
      this.status = 'Available';
    }
  } else {

    const totalOut = (this.currentState.inMaintenance || 0) + 
                     (this.currentState.inSession || 0) + 
                     (this.currentState.rented || 0);
    
    if (this.availableQuantity <= 0) {
   
      if (this.currentState.inMaintenance > 0 && this.currentState.inMaintenance === this.quantity) {
        this.status = 'Under Maintenance';
      } else if (this.currentState.rented > 0 && this.currentState.rented === this.quantity) {
        this.status = 'Rented Out';
      } else if (this.currentState.inSession > 0 && this.currentState.inSession === this.quantity) {
        this.status = 'In Session';
      } else if (totalOut >= this.quantity) {
      
        this.status = 'Unavailable';
      } else {
      
        this.status = 'Out of Stock';
      }
    } else if (this.availableQuantity < this.quantity) {
 
      this.status = 'Partially Available';
    } else {

      this.status = 'Available';
    }
  }
  

  const maxOut = Math.max(0, this.quantity);
  this.currentState.inMaintenance = Math.min(this.currentState.inMaintenance || 0, maxOut);
  this.currentState.inSession = Math.min(this.currentState.inSession || 0, maxOut);
  this.currentState.rented = Math.min(this.currentState.rented || 0, maxOut);
  

  const actualItemsOut = this.currentState.inMaintenance + this.currentState.inSession + this.currentState.rented;
  this.availableQuantity = Math.max(0, this.quantity - actualItemsOut);
  
  next();
});


ItemSchema.virtual('isLowStock').get(function() {
  if (this.category === 'Consumable') {
    return this.availableQuantity <= this.reorderLevel;
  }
  return false; 
});


ItemSchema.virtual('availabilityInfo').get(function() {
  const info = {
    total: this.quantity,
    available: this.availableQuantity,
    out: this.quantity - this.availableQuantity
  };
  
  if (this.category !== 'Consumable') {
    info.breakdown = {
      inMaintenance: this.currentState?.inMaintenance || 0,
      inSession: this.currentState?.inSession || 0,
      rented: this.currentState?.rented || 0
    };
  }
  
  return info;
});


ItemSchema.set('toJSON', { virtuals: true });
ItemSchema.set('toObject', { virtuals: true });


ItemSchema.index({ barcode: 1 });

module.exports = mongoose.model('Item', ItemSchema);