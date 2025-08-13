// models/Transaction.js
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  type: {
    type: String,  
    enum: [
      // Standard inventory transactions
      'Stock Addition',     
      'Stock Removal',       // Removing stock permanently
      
      // Location transactions
      'Relocate',            // Moving items between storage locations
      
      // Usage transactions
      'Check Out for Session',  // In-house use
      'Return from Session',    // Back from in-house use
      
      // Rental transactions
      'Rent Out',            // External rental
      'Return from Rental',  // Back from external rental
      
      // Maintenance transactions
      'Send to Maintenance', // Start maintenance
      'Return from Maintenance', // End maintenance
      
 
      'Check-in',
      'Check-out',
      'Maintenance',
      'Restock'
    ],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },

  fromLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  toLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },

  session: {
    name: String,
    location: String
  },
  

  rental: {
    rentedTo: String,
    expectedReturnDate: Date
  },
  

  maintenance: {
    provider: String,
    expectedEndDate: Date
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', TransactionSchema);