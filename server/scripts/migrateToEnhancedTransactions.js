 
// server/scripts/migrateToEnhancedTransactions.js

const mongoose = require('mongoose');
const Item = require('../models/Item');
require('dotenv').config();

async function migrateItems() {
  try {
    // Connect to the database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');
    
    // Get all items
    const items = await Item.find({});
    console.log(`Found ${items.length} items to migrate`);
    
    // Update each item
    for (const item of items) {
      // Set available quantity equal to total quantity initially
      item.availableQuantity = item.quantity;
      
      // Initialize current state
      item.currentState = {
        inMaintenance: 0,
        inSession: 0,
        rented: 0
      };
      
      // For items under maintenance, adjust accordingly
      if (item.status === 'Under Maintenance') {
        // Assume all are in maintenance
        item.currentState.inMaintenance = item.quantity;
        item.availableQuantity = 0;
      }
      
      // For rented items, adjust accordingly
      if (item.status === 'Rented') {
        item.currentState.rented = item.quantity;
        item.availableQuantity = 0;
      }
      
      // Save the updated item
      await item.save();
      console.log(`Migrated item: ${item.name}`);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

migrateItems();