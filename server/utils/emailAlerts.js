// Save the enhanced transaction
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
      // Close the modal using our direct method
      closeEnhancedModalDirectly();
      
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

// Add this function to the setupEnhancedTransactions function
function setupEnhancedTransactionEvents() {
  // Setup event for transaction type change
  const transactionTypeSelect = document.getElementById('enhancedTransactionType');
  if (transactionTypeSelect) {
    transactionTypeSelect.addEventListener('change', function() {
      updateEnhancedTransactionForm(this.value);
    });
  }
  
  // Setup close button handlers
  const closeButtons = document.querySelectorAll('#enhancedTransactionModal .btn-close, #enhancedTransactionModal .btn-secondary');
  closeButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      console.log('Close button clicked');
      e.preventDefault();
      e.stopPropagation();
      closeEnhancedModalDirectly();
    });
  });
  
  // Setup save button handler
  const saveBtn = document.getElementById('enhancedSaveTransactionBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function(e) {
      console.log('Save button clicked');
      e.preventDefault();
      saveEnhancedTransaction();
    });
  }
  
  // Add escape key handler
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('enhancedTransactionModal');
      if (modal && modal.classList.contains('show')) {
        closeEnhancedModalDirectly();
      }
    }
  });
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

// Add this to your setupEnhancedTransactions function
function setupEnhancedTransactions() {
  console.log("Setting up enhanced transaction functionality");
  
  // Load locations for dropdowns
  loadLocationsForTransaction();
  
  // Setup event listeners
  setupEnhancedTransactionEvents();
  
  // Setup transaction button click handlers
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
  }, true); // Use capture phase to ensure this runs first
}