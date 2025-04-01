// Add this to your inventory.js file

// Global variable to track the current item for transactions
let transactionItemData = null;

// Function to set up all transaction-related functionality
function setupEnhancedTransactions() {
  console.log("Setting up enhanced transaction functionality");
  
  // 1. Attach event listeners to transaction buttons
  document.addEventListener('click', function(e) {
    const transactionBtn = e.target.closest('.transaction-btn');
    if (transactionBtn) {
      e.preventDefault();
      e.stopPropagation();
      
      const itemId = transactionBtn.dataset.id;
      const itemName = transactionBtn.dataset.name;
      
      if (itemId && itemName) {
        // Fetch item data before opening modal
        fetchItemForTransaction(itemId);
      }
    }
  });
  
  // 2. Set up transaction type change handler
  const transactionTypeSelect = document.getElementById('enhancedTransactionType');
  if (transactionTypeSelect) {
    transactionTypeSelect.addEventListener('change', function() {
      updateEnhancedTransactionForm(this.value);
    });
  }
  
  // 3. Set up save button handler
  const saveBtn = document.getElementById('enhancedSaveTransactionBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveEnhancedTransaction);
  }
  
  // 4. Load locations for dropdowns
  loadLocationsForTransaction();
}

// Load locations for transaction dropdowns
async function loadLocationsForTransaction() {
  try {
    const response = await fetchWithAuth(`${API_URL}/locations/hierarchy`);
    
    if (!response || !response.ok) return;
    
    const locationHierarchy = await response.json();
    
    // Populate location dropdowns
    const fromLocationSelect = document.getElementById('enhancedTransactionFromLocation');
    const toLocationSelect = document.getElementById('enhancedTransactionToLocation');
    
    if (!fromLocationSelect || !toLocationSelect) return;
    
    // Clear existing options
    fromLocationSelect.innerHTML = '<option value="">Select Location</option>';
    toLocationSelect.innerHTML = '<option value="">Select Location</option>';
    
    // Add new options
    locationHierarchy.forEach(room => {
      fromLocationSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
      toLocationSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
    });
  } catch (error) {
    console.error('Error loading locations:', error);
  }
}

// Fetch item data before opening transaction modal
async function fetchItemForTransaction(itemId) {
  try {
    // Show loading state
    showAlert('Loading item data...', 'info', 'alertContainer', true);
    
    const response = await fetchWithAuth(`${API_URL}/items/${itemId}`);
    
    if (!response || !response.ok) {
      showAlert('Failed to load item data', 'danger');
      return;
    }
    
    const item = await response.json();
    
    // Store item data for transaction
    transactionItemData = item;
    
    // Now open the modal with the loaded data
    openEnhancedTransactionModal(item);
  } catch (error) {
    console.error('Error fetching item for transaction:', error);
    showAlert('Error loading item data', 'danger');
  }
}

// Open the enhanced transaction modal
function openEnhancedTransactionModal(item) {
  if (!item) return;
  
  // Get the modal element
  const modal = document.getElementById('enhancedTransactionModal');
  if (!modal) {
    console.error('Enhanced transaction modal not found');
    return;
  }
  
  // Reset form
  const form = document.getElementById('enhancedTransactionForm');
  if (form) form.reset();
  
  // Clear alerts
  const alertsContainer = document.getElementById('enhancedTransactionAlerts');
  if (alertsContainer) alertsContainer.innerHTML = '';
  
  // Set item details
  document.getElementById('enhancedTransactionItemId').value = item._id;
  document.getElementById('enhancedTransactionItem').value = item.name;
  
  // Determine appropriate transaction types based on item category and status
  configureTransactionTypes(item);
  
  // Set quantity max value based on available quantity
  const quantityInput = document.getElementById('enhancedTransactionQuantity');
  if (quantityInput) {
    const availableQuantity = item.availableQuantity !== undefined ? 
      item.availableQuantity : item.quantity;
      
    quantityInput.max = availableQuantity;
    quantityInput.value = 1;
  }
  
  // Create the Bootstrap modal instance
  try {
    // Initialize a new instance every time
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
    
    // Focus first field after modal is shown
    modal.addEventListener('shown.bs.modal', function() {
      const typeSelect = document.getElementById('enhancedTransactionType');
      if (typeSelect) typeSelect.focus();
    }, { once: true });
  } catch (error) {
    console.error('Error showing modal:', error);
    alert('Could not open transaction modal. Please try again or refresh the page.');
  }
}

// Configure transaction type options based on item category and status
function configureTransactionTypes(item) {
  const typeSelect = document.getElementById('enhancedTransactionType');
  if (!typeSelect) return;
  
  // Clear existing options
  typeSelect.innerHTML = '<option value="">Select Transaction Type</option>';
  
  // Add relevant transaction types based on category
  if (item.category === 'Consumable') {
    // Consumable-specific options
    typeSelect.innerHTML += `
      <option value="Stock Addition">Add Stock</option>
      <option value="Stock Removal">Remove Stock</option>
    `;
    
    // Default to stock addition for consumables
    typeSelect.value = 'Stock Addition';
  } else {
    // Equipment-specific options
    typeSelect.innerHTML += `
      <option value="Stock Addition">Add Stock</option>
      <option value="Stock Removal">Remove Stock</option>
      <option value="Relocate">Relocate</option>
      <option value="Check Out for Session">Use in Session</option>
      <option value="Return from Session">Return from Session</option>
      <option value="Rent Out">Rent Out</option>
      <option value="Return from Rental">Return from Rental</option>
      <option value="Send to Maintenance">Send to Maintenance</option>
      <option value="Return from Maintenance">Return from Maintenance</option>
    `;
    
    // Set intelligent default based on item state
    if ((item.currentState?.inMaintenance || 0) > 0) {
      typeSelect.value = 'Return from Maintenance';
    } else if ((item.currentState?.inSession || 0) > 0) {
      typeSelect.value = 'Return from Session';
    } else if ((item.currentState?.rented || 0) > 0) {
      typeSelect.value = 'Return from Rental';
    } else {
      typeSelect.value = 'Stock Addition';
    }
  }
  
  // Trigger update to show/hide relevant fields
  updateEnhancedTransactionForm(typeSelect.value);
}

// Update form fields based on selected transaction type
function updateEnhancedTransactionForm(type) {
  // Get all form groups
  const fromLocationGroup = document.getElementById('enhancedFromLocationGroup');
  const toLocationGroup = document.getElementById('enhancedToLocationGroup');
  const sessionDetailsGroup = document.getElementById('enhancedSessionDetailsGroup');
  const rentalDetailsGroup = document.getElementById('enhancedRentalDetailsGroup');
  const maintenanceDetailsGroup = document.getElementById('enhancedMaintenanceDetailsGroup');
  
  // Hide all groups first
  if (fromLocationGroup) fromLocationGroup.style.display = 'none';
  if (toLocationGroup) toLocationGroup.style.display = 'none';
  if (sessionDetailsGroup) sessionDetailsGroup.style.display = 'none';
  if (rentalDetailsGroup) rentalDetailsGroup.style.display = 'none';
  if (maintenanceDetailsGroup) maintenanceDetailsGroup.style.display = 'none';
  
  // Show relevant groups based on transaction type
  switch(type) {
    case 'Stock Addition':
      // No special fields needed
      break;
    
    case 'Stock Removal':
      // No special fields needed
      break;
    
    case 'Relocate':
      // Need destination location
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
    
    case 'Check Out for Session':
      // Need session details and destination
      if (sessionDetailsGroup) sessionDetailsGroup.style.display = 'block';
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
    
    case 'Return from Session':
      // Need session details
      if (sessionDetailsGroup) sessionDetailsGroup.style.display = 'block';
      break;
    
    case 'Rent Out':
      // Need rental details
      if (rentalDetailsGroup) rentalDetailsGroup.style.display = 'block';
      break;
    
    case 'Return from Rental':
      // Need rental details
      if (rentalDetailsGroup) rentalDetailsGroup.style.display = 'block';
      break;
    
    case 'Send to Maintenance':
      // Need maintenance details
      if (maintenanceDetailsGroup) maintenanceDetailsGroup.style.display = 'block';
      break;
    
    case 'Return from Maintenance':
      // Need maintenance details
      if (maintenanceDetailsGroup) maintenanceDetailsGroup.style.display = 'block';
      break;
  }
  
  // Set the max quantity based on transaction type and item state
  updateQuantityLimits(type);
}

// Update quantity limits based on transaction type
function updateQuantityLimits(type) {
  if (!transactionItemData) return;
  
  const quantityInput = document.getElementById('enhancedTransactionQuantity');
  if (!quantityInput) return;
  
  const item = transactionItemData;
  let maxQuantity = 1;
  
  switch(type) {
    case 'Stock Addition':
      // No real limit for adding stock
      maxQuantity = 9999;
      break;
      
    case 'Stock Removal':
    case 'Relocate':
    case 'Check Out for Session':
    case 'Rent Out':
    case 'Send to Maintenance':
      // Limited by available quantity
      maxQuantity = item.availableQuantity !== undefined ? 
        item.availableQuantity : item.quantity;
      break;
      
    case 'Return from Session':
      // Limited by items in session
      maxQuantity = item.currentState?.inSession || 0;
      break;
      
    case 'Return from Rental':
      // Limited by items rented
      maxQuantity = item.currentState?.rented || 0;
      break;
      
    case 'Return from Maintenance':
      // Limited by items in maintenance
      maxQuantity = item.currentState?.inMaintenance || 0;
      break;
  }
  
  // Set the max attribute
  quantityInput.max = maxQuantity;
  
  // If current value exceeds max, adjust it
  if (parseInt(quantityInput.value) > maxQuantity) {
    quantityInput.value = maxQuantity;
  }
  
  // Ensure minimum of 1
  if (parseInt(quantityInput.value) < 1) {
    quantityInput.value = 1;
  }
}

// Save the transaction
async function saveEnhancedTransaction() {
  try {
    // Get form data
    const itemId = document.getElementById('enhancedTransactionItemId').value;
    const type = document.getElementById('enhancedTransactionType').value;
    const quantity = document.getElementById('enhancedTransactionQuantity').value;
    
    // Basic validation
    if (!type || !quantity || parseInt(quantity) <= 0) {
      showAlert('Please enter a valid quantity and select a transaction type', 'danger', 'enhancedTransactionAlerts');
      return;
    }
    
    // Build transaction data object
    const transactionData = {
      type,
      quantity: parseInt(quantity),
      notes: document.getElementById('enhancedTransactionNotes').value
    };
    
    // Add location data if visible and selected
    const fromLocationGroup = document.getElementById('enhancedFromLocationGroup');
    if (fromLocationGroup && fromLocationGroup.style.display !== 'none') {
      const fromLocation = document.getElementById('enhancedTransactionFromLocation').value;
      if (fromLocation) {
        transactionData.fromLocation = fromLocation;
      }
    }
    
    const toLocationGroup = document.getElementById('enhancedToLocationGroup');
    if (toLocationGroup && toLocationGroup.style.display !== 'none') {
      const toLocation = document.getElementById('enhancedTransactionToLocation').value;
      if (toLocation) {
        transactionData.toLocation = toLocation;
      }
    }
    
    // Add session data if visible and filled
    const sessionDetailsGroup = document.getElementById('enhancedSessionDetailsGroup');
    if (sessionDetailsGroup && sessionDetailsGroup.style.display !== 'none') {
      const sessionName = document.getElementById('enhancedSessionName').value;
      const sessionLocation = document.getElementById('enhancedSessionLocation').value;
      
      if (sessionName || sessionLocation) {
        transactionData.session = {
          name: sessionName,
          location: sessionLocation
        };
      }
    }
    
    // Add rental data if visible and filled
    const rentalDetailsGroup = document.getElementById('enhancedRentalDetailsGroup');
    if (rentalDetailsGroup && rentalDetailsGroup.style.display !== 'none') {
      const rentedTo = document.getElementById('enhancedRentedTo').value;
      const expectedReturnDate = document.getElementById('enhancedExpectedReturnDate').value;
      
      if (rentedTo) {
        transactionData.rental = {
          rentedTo,
          expectedReturnDate: expectedReturnDate || null
        };
      } else if (type === 'Rent Out') {
        showAlert('Please specify who the item is rented to', 'warning', 'enhancedTransactionAlerts');
        return;
      }
    }
    
    // Add maintenance data if visible and filled
    const maintenanceDetailsGroup = document.getElementById('enhancedMaintenanceDetailsGroup');
    if (maintenanceDetailsGroup && maintenanceDetailsGroup.style.display !== 'none') {
      const provider = document.getElementById('enhancedMaintenanceProvider').value;
      const expectedEndDate = document.getElementById('enhancedExpectedEndDate').value;
      
      if (provider || expectedEndDate) {
        transactionData.maintenance = {
          provider,
          expectedEndDate: expectedEndDate || null
        };
      }
    }
    
    // Show loading state
    const saveBtn = document.getElementById('enhancedSaveTransactionBtn');
    if (saveBtn) {
      saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';
      saveBtn.disabled = true;
    }
    
    // Send the request
    const response = await fetchWithAuth(`${API_URL}/items/${itemId}/enhanced-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    });
    
    // Reset button state
    if (saveBtn) {
      saveBtn.innerHTML = 'Save Transaction';
      saveBtn.disabled = false;
    }
    
    if (!response) {
      showAlert('Failed to connect to server', 'danger', 'enhancedTransactionAlerts');
      return;
    }
    
    if (response.ok) {
      // Close the modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('enhancedTransactionModal'));
      if (modal) modal.hide();
      
      // Show success message
      showAlert('Transaction created successfully', 'success');
      
      // Reload inventory to reflect changes
      loadInventoryItems();
      
      // Reset transaction item data
      transactionItemData = null;
    } else {
      try {
        const errorData = await response.json();
        showAlert(errorData.message || 'Failed to create transaction', 'danger', 'enhancedTransactionAlerts');
      } catch (e) {
        showAlert('Failed to create transaction', 'danger', 'enhancedTransactionAlerts');
      }
    }
  } catch (error) {
    console.error('Error saving transaction:', error);
    showAlert('An error occurred while saving the transaction', 'danger', 'enhancedTransactionAlerts');
    
    // Reset button state
    const saveBtn = document.getElementById('enhancedSaveTransactionBtn');
    if (saveBtn) {
      saveBtn.innerHTML = 'Save Transaction';
      saveBtn.disabled = false;
    }
  }
}

// Add the enhanced transaction modal setup to the DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
  // Add this call to your existing DOMContentLoaded handler
  setupEnhancedTransactions();
});