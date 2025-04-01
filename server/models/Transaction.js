// models/Transaction.js
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  type: {
    type: String,  // Add this line - it was missing
    enum: [
      // Standard inventory transactions
      'Stock Addition',      // Adding new stock
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
      
      // Legacy types for backward compatibility
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
  // Rest of the schema remains the same
  fromLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  toLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  // For session-related transactions
  session: {
    name: String,
    location: String
  },
  
  // For rental-related transactions
  rental: {
    rentedTo: String,
    expectedReturnDate: Date
  },
  
  // For maintenance-related transactions
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