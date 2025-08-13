// public/js/scanner.js

// Global variables
let currentItemId = null;
let locationHierarchy = [];


// Add this to scanner.js
let bulkMode = false;
let bulkItems = []; // Will store items for bulk transaction

// Helper function to get maximum quantity allowed for an item
function getMaxQuantityForItem(item) {
  // If we have a transaction-specific max, use it
  if (item.maxForTransaction !== undefined) {
    return item.maxForTransaction;
  }
  
  // Default high value if we don't know the transaction type yet
  return item.availableQuantity || item.quantity || 999;
}

// Toggle bulk mode
function toggleBulkMode() {
  bulkMode = !bulkMode;
  
  // Update UI to reflect current mode
  const bulkModeButton = document.getElementById('bulkModeToggle');
  const bulkItemsContainer = document.getElementById('bulkItemsContainer');
  
  if (!bulkModeButton || !bulkItemsContainer) {
    console.error('Bulk mode elements not found');
    return;
  }
  
  if (bulkMode) {
    // Entering bulk mode
    bulkModeButton.classList.replace('btn-outline-primary', 'btn-primary');
    bulkModeButton.innerHTML = '<i class="fas fa-layer-group me-1"></i> Exit Bulk Mode';
    bulkItemsContainer.classList.remove('d-none');
    
    // Create bulk items display if it doesn't exist
    if (!document.getElementById('bulkItemsList').children.length) {
      createBulkItemsDisplay();
    }
    
    showAlert('Bulk Mode activated. Scan multiple items, then process them all at once.', 'info');
  } else {
    // Exiting bulk mode
    bulkModeButton.classList.replace('btn-primary', 'btn-outline-primary');
    bulkModeButton.innerHTML = '<i class="fas fa-layer-group me-1"></i> Bulk Mode';
    
    // Don't hide container if we have items
    if (bulkItems.length === 0) {
      bulkItemsContainer.classList.add('d-none');
    }
    
    showAlert('Bulk Mode deactivated.', 'info');
  }
  
  // Focus back on barcode input
  document.getElementById('barcodeInput').focus();
}







// Function to set up bulk functionality event listeners
function setupBulkFunctionality() {
  const bulkModeToggle = document.getElementById('bulkModeToggle');
  const clearBulkItemsBtn = document.getElementById('clearBulkItems');
  const processBulkItemsBtn = document.getElementById('processBulkItems');
  
  if (bulkModeToggle) {
    bulkModeToggle.addEventListener('click', toggleBulkMode);
  } else {
    console.error('Bulk mode toggle button not found');
  }
  
  if (clearBulkItemsBtn) {
    clearBulkItemsBtn.addEventListener('click', clearBulkItems);
  } else {
    console.error('Clear bulk items button not found');
  }
  
  if (processBulkItemsBtn) {
    processBulkItemsBtn.addEventListener('click', processBulkItems);
  } else {
    console.error('Process bulk items button not found');
  }
}


// Clear all bulk items
function clearBulkItems() {
  if (bulkItems.length === 0) return;
  
  // Confirm before clearing
  if (confirm(`Are you sure you want to clear all ${bulkItems.length} items?`)) {
    bulkItems = [];
    
    // Update the display
    updateBulkItemsDisplay();
    
    // Update count
    document.getElementById('bulkItemCount').textContent = '0';
    
    // Hide buttons
    document.getElementById('clearBulkItems').classList.add('d-none');
    document.getElementById('processBulkItems').classList.add('d-none');
    
    // Hide container if not in bulk mode
    if (!bulkMode) {
      document.getElementById('bulkItemsContainer').classList.add('d-none');
    }
    
    showAlert('All bulk items cleared', 'info');
  }
}

// Helper function to get status class
function getStatusClass(status) {
  switch (status) {
    case 'Available':
      return 'bg-success';
    case 'Under Maintenance':
      return 'bg-warning';
    case 'Out of Stock':
      return 'bg-danger';
    case 'Rented':
      return 'bg-info';
    default:
      return 'bg-secondary';
  }

  // Get the maximum quantity allowed for an item based on its state
function getMaxQuantityForItem(item) {
  // If we have a transaction-specific max, use it
  if (item.maxForTransaction !== undefined) {
    return item.maxForTransaction;
  }
  
  // Default high value if we don't know the transaction type yet
  return 999;
}
}


// Create the display for bulk items
function createBulkItemsDisplay() {
  const container = document.getElementById('bulkItemsList');
  if (container) {
    container.innerHTML = '<div class="text-center py-3 text-muted">No items scanned yet. Start scanning to add items.</div>';
  } else {
    console.error('Bulk items list element not found');
  }
}

// Update the display of bulk items
function updateBulkItemsDisplay() {
  const container = document.getElementById('bulkItemsList');
  
  if (!container) {
    console.error('Bulk items list container not found');
    return;
  }
  
  if (bulkItems.length === 0) {
    container.innerHTML = '<div class="text-center py-3 text-muted">No items scanned yet. Start scanning to add items.</div>';
    return;
  }
  
  // Clear existing items
  container.innerHTML = '';
  
  // Add each item
  bulkItems.forEach((item, index) => {
    const itemElement = document.createElement('div');
    itemElement.id = `bulk-item-${item._id}`;
    itemElement.className = 'list-group-item';
    
    const statusClass = getStatusClass(item.status);
    const maxQuantity = getMaxQuantityForItem(item);
    
    itemElement.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center flex-grow-1">
          <span class="badge ${statusClass} me-2">${item.status}</span>
          <div>
            <div class="fw-semibold">${item.name}</div>
            <small class="text-muted">${item.category}</small>
          </div>
        </div>
        <div class="d-flex align-items-center">
          <div class="input-group input-group-sm me-2" style="width: 120px;">
            <button class="btn btn-outline-secondary decrease-quantity" type="button" data-index="${index}">-</button>
            <input type="number" class="form-control text-center item-quantity" value="${item.bulkCount || 1}" 
                   min="1" max="${maxQuantity}" data-index="${index}">
            <button class="btn btn-outline-secondary increase-quantity" type="button" data-index="${index}">+</button>
          </div>
          <button class="btn btn-sm btn-outline-danger remove-bulk-item" data-index="${index}">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
    
    container.appendChild(itemElement);
  });
  
  // Add event listeners to quantity controls
  document.querySelectorAll('.decrease-quantity').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      decreaseBulkItemQuantity(index);
    });
  });
  
  document.querySelectorAll('.increase-quantity').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      increaseBulkItemQuantity(index);
    });
  });
  
  document.querySelectorAll('.item-quantity').forEach(input => {
    input.addEventListener('change', function() {
      const index = parseInt(this.getAttribute('data-index'));
      updateBulkItemQuantity(index, parseInt(this.value));
    });
  });
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-bulk-item').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      removeBulkItemByIndex(index);
    });
  });
}


// Decrease quantity for a bulk item
function decreaseBulkItemQuantity(index) {
  if (index >= 0 && index < bulkItems.length) {
    const currentCount = bulkItems[index].bulkCount || 1;
    if (currentCount > 1) {
      bulkItems[index].bulkCount = currentCount - 1;
      updateBulkItemsDisplay();
    }
  }
}

// Increase quantity for a bulk item
function increaseBulkItemQuantity(index) {
  if (index >= 0 && index < bulkItems.length) {
    const currentCount = bulkItems[index].bulkCount || 1;
    const maxCount = getMaxQuantityForItem(bulkItems[index]);
    
    if (currentCount < maxCount) {
      bulkItems[index].bulkCount = currentCount + 1;
      updateBulkItemsDisplay();
    }
  }
}

// Update quantity for a bulk item
function updateBulkItemQuantity(index, newQuantity) {
  if (index >= 0 && index < bulkItems.length && newQuantity >= 1) {
    const maxCount = getMaxQuantityForItem(bulkItems[index]);
    
    // Ensure quantity doesn't exceed max
    bulkItems[index].bulkCount = Math.min(newQuantity, maxCount);
    updateBulkItemsDisplay();
  }
}




// Remove a bulk item by index
function removeBulkItemByIndex(index) {
  if (index >= 0 && index < bulkItems.length) {
    const removedItem = bulkItems[index];
    bulkItems.splice(index, 1);
    
    // Update the display
    updateBulkItemsDisplay();
    
    // Update count
    document.getElementById('bulkItemCount').textContent = bulkItems.length;
    
    // Hide buttons if no items
    if (bulkItems.length === 0) {
      document.getElementById('clearBulkItems').classList.add('d-none');
      document.getElementById('processBulkItems').classList.add('d-none');
      
      // Hide container if not in bulk mode
      if (!bulkMode) {
        document.getElementById('bulkItemsContainer').classList.add('d-none');
      }
    }
    
    showAlert(`Removed ${removedItem.name} from bulk items`, 'info');
  }
}


// Add an item to the bulk list
function addToBulkItems(item) {
  try {
    const now = Date.now();
    
    // Prevent duplicate adds within 500ms
    if (item.lastAddedTime && (now - item.lastAddedTime) < 500) {
      console.log('Preventing duplicate add for', item.name);
      return;
    }
    
    item.lastAddedTime = now;
    
    console.log('Adding item to bulk list:', item.name);
    
    // Check if this item is already in the list
    const existingItemIndex = bulkItems.findIndex(i => i._id === item._id);
    
    if (existingItemIndex >= 0) {
      // If already in list, increment the count
      bulkItems[existingItemIndex].bulkCount = (bulkItems[existingItemIndex].bulkCount || 1) + 1;
      
      // Update the display
      updateBulkItemsDisplay();
      
      showAlert(`Added another ${item.name} (total: ${bulkItems[existingItemIndex].bulkCount})`, 'success');
    } else {
      // Add to list with count of 1
      item.bulkCount = 1;
      bulkItems.push(item);
      
      // Add to display
      updateBulkItemsDisplay();
      
      showAlert(`Added ${item.name} to bulk items`, 'success');
    }
    
    // Update count and show process buttons
    const countElement = document.getElementById('bulkItemCount');
    if (countElement) {
      countElement.textContent = bulkItems.length;
    }
    
    // Show the process and clear buttons
    const clearBtn = document.getElementById('clearBulkItems');
    const processBtn = document.getElementById('processBulkItems');
    
    if (clearBtn) clearBtn.classList.remove('d-none');
    if (processBtn) processBtn.classList.remove('d-none');
    
    // Make sure container is visible
    const container = document.getElementById('bulkItemsContainer');
    if (container) container.classList.remove('d-none');
    
    // Play a success sound ONLY ONCE
    if (typeof playSuccessSound === 'function') {
      playSuccessSound();
    }
    
    console.log('Item added to bulk list successfully');
  } catch (error) {
    console.error('Error in addToBulkItems:', error);
    throw error;
  }
  console.log('addToBulkItems called from:', new Error().stack);
}


// Remove an item from bulk list
function removeBulkItem(itemId) {
  const itemIndex = bulkItems.findIndex(item => item._id === itemId);
  
  if (itemIndex !== -1) {
    const removedItem = bulkItems[itemIndex];
    bulkItems.splice(itemIndex, 1);
    
    // Update the display
    updateBulkItemsDisplay();
    
    // Update count
    document.getElementById('bulkItemCount').textContent = bulkItems.length;
    
    // Hide buttons if no items
    if (bulkItems.length === 0) {
      document.getElementById('clearBulkItems').classList.add('d-none');
      document.getElementById('processBulkItems').classList.add('d-none');
      
      // Hide container if not in bulk mode
      if (!bulkMode) {
        document.getElementById('bulkItemsContainer').classList.add('d-none');
      }
    }
    
    showAlert(`Removed ${removedItem.name} from bulk items`, 'info');
  }
}

// Clear all bulk items
function clearBulkItems() {
  if (bulkItems.length === 0) return;
  
  // Confirm before clearing
  if (confirm(`Are you sure you want to clear all ${bulkItems.length} items?`)) {
    bulkItems = [];
    
    // Update the display
    updateBulkItemsDisplay();
    
    // Update count
    document.getElementById('bulkItemCount').textContent = '0';
    
    // Hide buttons
    document.getElementById('clearBulkItems').classList.add('d-none');
    document.getElementById('processBulkItems').classList.add('d-none');
    
    // Hide container if not in bulk mode
    if (!bulkMode) {
      document.getElementById('bulkItemsContainer').classList.add('d-none');
    }
    
    showAlert('All bulk items cleared', 'info');
  }
}




function debugQuickButtons() {
    console.log('Debug Quick Buttons:');
    console.log('checkInBtn exists:', !!document.getElementById('checkInBtn'));
    console.log('quickTransactionModal exists:', !!document.getElementById('quickTransactionModal'));
    console.log('currentItemId:', currentItemId);
  }

// Setup event listeners
function setupEventListeners() {
  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
  
  // Sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.body.classList.toggle('sidebar-toggled');
  });
  
  // Manual search button
  document.getElementById('searchButton').addEventListener('click', () => {
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput.value.trim()) {
      searchItem(barcodeInput.value.trim());
    } else {
      showAlert('Please enter a barcode', 'warning');
    }
  });
  
  // Enter key on barcode input
  document.getElementById('barcodeInput').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      if (e.target.value.trim()) {
        searchItem(e.target.value.trim());
      } else {
        showAlert('Please enter a barcode', 'warning');
      }
    }
  });
  
  // View item button
  document.getElementById('viewItemBtn').addEventListener('click', () => {
    if (currentItemId) {
      window.location.href = `inventory.html?id=${currentItemId}`;
    }
  });
  
  // Transaction button
  document.getElementById('transactionBtn').addEventListener('click', () => {
    openTransactionModal();
  });
  
  // Save transaction button
  document.getElementById('saveTransactionBtn').addEventListener('click', saveTransaction);
  
  // Add event to refocus on barcode input when clicking anywhere in the document
  document.addEventListener('click', (e) => {
    // Don't refocus if clicking on another input, button, or dropdown
    if (!e.target.closest('input, button, select, textarea, .dropdown-menu, .modal')) {
      document.getElementById('barcodeInput').focus();
    }
  });
  
  // Add event listener for page visibility to refocus when returning to tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(() => {
        document.getElementById('barcodeInput').focus();
      }, 100);
    }
  });

  
}

// Search for an item by barcode
// Update your existing searchItem function
// Update your existing searchItem function
async function searchItem(barcode) {
  try {
    // Show loading indicator
    document.getElementById('itemDetails').innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary mb-3" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mb-0">Searching for item...</p>
      </div>
    `;
    
    // Also update the barcode input field
    document.getElementById('barcodeInput').value = barcode;
    
    // Add visual feedback for scan
    document.getElementById('barcodeInput').classList.add('highlight-scan');
    setTimeout(() => {
      document.getElementById('barcodeInput').classList.remove('highlight-scan');
    }, 300);
    
    // Play a scan sound
    playBeepSound();
    
    // Fetch item by barcode
    const response = await fetchWithAuth(`${API_URL}/items/barcode/${encodeURIComponent(barcode)}`);
    
    if (!response) {
      document.getElementById('itemDetails').innerHTML = `
        <div class="text-center py-5">
          <i class="fas fa-exclamation-circle fa-3x mb-3 text-danger"></i>
          <p class="mb-0">Server connection error</p>
        </div>
      `;
      return;
    }
    
    if (response.ok) {
      const item = await response.json();
      
      // If in bulk mode, add to bulk items instead of displaying
      if (bulkMode) {
        try {
          // Add to bulk items
          addToBulkItems(item);
          
          // Clear the item details for the next scan
          resetItemDetails();
          
          // Clear and refocus the input field for next scan
          document.getElementById('barcodeInput').value = '';
          document.getElementById('barcodeInput').focus();
        } catch (error) {
          console.error('Error adding item to bulk list:', error);
          showAlert('Error adding item to bulk list: ' + error.message, 'danger');
        }
      } else {
        // Normal mode - display item details
        displayItemDetails(item);
        
        // Load transactions for this item
        loadItemTransactions(item._id);
        
        // Show success message
        showAlert(`Item found: ${item.name}`, 'success');
        
        // Clear and refocus the input field for next scan
        setTimeout(() => {
          document.getElementById('barcodeInput').select();
        }, 100);
      }
    } else {
      // Handle item not found
      document.getElementById('itemDetails').innerHTML = `
        <div class="text-center py-5">
          <i class="fas fa-exclamation-circle fa-3x mb-3 text-warning"></i>
          <p class="mb-0">Item not found with barcode: ${barcode}</p>
          <p class="small text-muted mt-2">Verify that the barcode exists in the system</p>
          <div class="mt-3">
            <a href="inventory.html" class="btn btn-outline-primary me-2">
              <i class="fas fa-search me-1"></i> Search Inventory
            </a>
            <button type="button" class="btn btn-success" onclick="window.location.href='inventory.html#addItem'">
              <i class="fas fa-plus me-1"></i> Add New Item
            </button>
          </div>
        </div>
      `;
      
      // Reset transactions table
      document.getElementById('transactionsTable').innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4">No transactions found</td>
        </tr>
      `;
      
      // Hide action buttons
      document.getElementById('itemActions').classList.add('d-none');
      
      // Show appropriate alert
      if (response.status === 404) {
        showAlert(`Item with barcode "${barcode}" not found.`, 'warning');
      } else {
        showAlert('Failed to search for item', 'danger');
      }
      
      // Clear and refocus the input field for next scan
      setTimeout(() => {
        document.getElementById('barcodeInput').select();
      }, 100);
    }
  } catch (error) {
    console.error('Search error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    
    // Reset item details
    resetItemDetails();
  }
}
// Play beep sound for successful scan
function playBeepSound() {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 1000; // frequency in Hz
      gainNode.gain.value = 0.1; // volume (0-1)
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      setTimeout(function() {
        oscillator.stop();
      }, 100); // beep duration in ms
    } catch (e) {
      console.log('Beep sound not supported');
    }
  }





// Play success sound for successful transaction
function playSuccessSound() {
    try {
      // Create a success sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // First tone (higher)
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      oscillator1.type = 'sine';
      oscillator1.frequency.value = 1200;
      gainNode1.gain.value = 0.1;
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      
      // Second tone (even higher)
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      oscillator2.type = 'sine';
      oscillator2.frequency.value = 1500;
      gainNode2.gain.value = 0.1;
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      // Play the tones in sequence
      oscillator1.start();
      setTimeout(() => {
        oscillator1.stop();
        oscillator2.start();
        setTimeout(() => {
          oscillator2.stop();
        }, 150);
      }, 150);
    } catch (e) {
      console.log('Success sound not supported');
    }
  }



// Display item details
function displayItemDetails(item) {
    // Save current item ID
    currentItemId = item._id;
    
    // Format location
    let location = 'N/A';
    if (item.location) {
      location = '';
      if (item.location.room && item.location.room.name) {
        location += item.location.room.name;
      }
      if (item.location.rack && item.location.rack.name) {
        location += ` → ${item.location.rack.name}`;
      }
      if (item.location.shelf && item.location.shelf.name) {
        location += ` → ${item.location.shelf.name}`;
      }
    }

      // Get state information
  const availableQuantity = item.availableQuantity !== undefined ? 
  item.availableQuantity : item.quantity;

const inMaintenanceCount = item.currentState?.inMaintenance || 0;
const inSessionCount = item.currentState?.inSession || 0;
const rentedCount = item.currentState?.rented || 0;
    
    // Create HTML for item details with improved structure
    
   
    
    
    const detailsHtml = `
    <div class="row">
      <div class="col-md-4 text-center mb-3 mb-md-0">
        ${item.barcode ? `
          <div class="mb-2" id="barcodeDisplay">
            <!-- Barcode will be rendered here -->
          </div>
          <div class="font-monospace small">${item.barcode}</div>
          <div class="small text-muted">${item.barcodeType === 'existing' ? 'Manufacturer Barcode' : 'Generated Barcode'}</div>
        ` : '<div class="text-muted">No barcode</div>'}
      </div>
      <div class="col-md-8">
        <h5 class="item-name mb-3">${item.name}</h5>
        <div class="mb-3">
          <span class="${getStatusBadgeClass(item.status)}">${item.status}</span>
          <span class="badge bg-secondary ms-2">${item.category}</span>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Total Quantity:</div>
          <div class="detail-value">
            ${item.quantity} ${item.unit}
            ${item.quantity <= item.reorderLevel ? '<span class="badge bg-danger ms-2">Low Stock</span>' : ''}
          </div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Available:</div>
          <div class="detail-value">${availableQuantity} ${item.unit}</div>
        </div>
        
        ${item.category !== 'Consumable' ? `
          <div class="detail-row">
            <div class="detail-label">Item Status:</div>
            <div class="detail-value">
              ${inMaintenanceCount > 0 ? `<span class="badge bg-info me-1">${inMaintenanceCount} in maintenance</span>` : ''}
              ${inSessionCount > 0 ? `<span class="badge bg-warning me-1">${inSessionCount} in use</span>` : ''}
              ${rentedCount > 0 ? `<span class="badge bg-primary me-1">${rentedCount} rented</span>` : ''}
              ${inMaintenanceCount + inSessionCount + rentedCount === 0 ? 'All items available' : ''}
            </div>
          </div>
        ` : ''}
        
        <div class="detail-row">
          <div class="detail-label">Location:</div>
          <div class="detail-value">${location}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Serial Number:</div>
          <div class="detail-value">${item.akuNo || 'N/A'}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Unit Cost:</div>
          <div class="detail-value">${formatCurrency(item.unitCost)}</div>
        </div>
        
        ${item.description ? `
          <div class="mt-3">
            <div class="detail-label mb-1">Description:</div>
            <p class="small">${item.description}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
    
    // Update item details
    document.getElementById('itemDetails').innerHTML = detailsHtml;
    
    // If JsBarcode is available and we have a barcode, generate one
    if (typeof JsBarcode !== 'undefined' && item.barcode) {
      const barcodeDisplay = document.getElementById('barcodeDisplay');
      if (barcodeDisplay) {
        try {
          // Create canvas for the barcode
          const canvas = document.createElement('canvas');
          barcodeDisplay.appendChild(canvas);
          
          // Generate the barcode
          JsBarcode(canvas, item.barcode, {
            format: "CODE128",
            lineColor: "#000",
            width: 2,
            height: 50,
            displayValue: false
          });
        } catch (e) {
          console.error('Error generating barcode display:', e);
        }
      }
    }
    
    // Show action buttons
    document.getElementById('itemActions').classList.remove('d-none');
    
    // Update transaction modal
    document.getElementById('transactionItemId').value = item._id;
    document.getElementById('transactionItem').value = item.name;
    
    // Enable quick transaction buttons
    enableQuickTransactionButtons(item.status);
    updateTransactionButtonsForItem(item);
  } // End of displayItemDetails function
  
  // Play beep sound for successful scan - PROPERLY PLACED AS A SEPARATE FUNCTION
  function playBeepSound() {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 1000; // frequency in Hz
      gainNode.gain.value = 0.1; // volume (0-1)
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      setTimeout(function() {
        oscillator.stop();
      }, 100); // beep duration in ms
    } catch (e) {
      console.log('Beep sound not supported');
    }
  }
  
  // Play success sound for successful transaction - PROPERLY PLACED AS A SEPARATE FUNCTION
  function playSuccessSound() {
    try {
      // Create a success sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // First tone (higher)
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      oscillator1.type = 'sine';
      oscillator1.frequency.value = 1200;
      gainNode1.gain.value = 0.1;
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      
      // Second tone (even higher)
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      oscillator2.type = 'sine';
      oscillator2.frequency.value = 1500;
      gainNode2.gain.value = 0.1;
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      // Play the tones in sequence
      oscillator1.start();
      setTimeout(() => {
        oscillator1.stop();
        oscillator2.start();
        setTimeout(() => {
          oscillator2.stop();
        }, 150);
      }, 150);
    } catch (e) {
      console.log('Success sound not supported');
    }
  }

// Reset item details
function resetItemDetails() {
  document.getElementById('itemDetails').innerHTML = `
    <div class="text-center py-5">
      <i class="fas fa-barcode fa-3x mb-3 text-muted"></i>
      <p class="mb-0">Scan a barcode or enter it manually to view item details</p>
    </div>
  `;
  
  // Hide action buttons
  const itemActions = document.getElementById('itemActions');
  if (itemActions) {
    itemActions.classList.add('d-none');
  }
  
  // Reset current item
  currentItemId = null;
}





// Enable/disable quick transaction buttons based on item status
function enableQuickTransactionButtons(itemStatus) {
    // Enable all buttons first
    document.getElementById('checkInBtn').disabled = false;
    document.getElementById('checkOutBtn').disabled = false;
    document.getElementById('maintenanceBtn').disabled = false;
    document.getElementById('restockBtn').disabled = false;
    
    // Then disable inappropriate ones based on status
    switch (itemStatus) {
      case 'Out of Stock':
        // Only allow Restock for out of stock items
        document.getElementById('checkInBtn').disabled = true;
        document.getElementById('checkOutBtn').disabled = true;
        document.getElementById('maintenanceBtn').disabled = true;
        break;
      case 'Under Maintenance':
        // Only allow Check-in from maintenance
        document.getElementById('checkOutBtn').disabled = true;
        document.getElementById('maintenanceBtn').disabled = true;
        document.getElementById('restockBtn').disabled = true;
        break;
      case 'Rented':
        // Only allow Check-in
        document.getElementById('checkOutBtn').disabled = true;
        document.getElementById('maintenanceBtn').disabled = true;
        document.getElementById('restockBtn').disabled = true;
        break;
      case 'Available':
        // Don't allow Check-in for available items
        document.getElementById('checkInBtn').disabled = true;
        break;
    }
  }





  // Disable all quick transaction buttons
function disableQuickTransactionButtons() {
    document.getElementById('checkInBtn').disabled = true;
    document.getElementById('checkOutBtn').disabled = true;
    document.getElementById('maintenanceBtn').disabled = true;
    document.getElementById('restockBtn').disabled = true;
  }




// Load transactions for an item
async function loadItemTransactions(itemId) {
  try {
    // Show loading indicator
    document.getElementById('transactionsTable').innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4">
          <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          Loading transactions...
        </td>
      </tr>
    `;
    
    // Fetch transactions
    const response = await fetchWithAuth(`${API_URL}/reports/transactions?item=${itemId}&limit=10`);
    
    if (!response) return;
    
    if (response.ok) {
      const data = await response.json();
      
      if (!data.transactions || data.transactions.length === 0) {
        document.getElementById('transactionsTable').innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4">No transactions found for this item</td>
          </tr>
        `;
        return;
      }
      
      // Display transactions
      let html = '';
      
      data.transactions.forEach(transaction => {
        const time = formatDate(transaction.timestamp);
        const itemName = transaction.item ? transaction.item.name : 'N/A';
        const type = transaction.type || 'N/A';
        const quantity = transaction.quantity || 0;
        const userName = transaction.performedBy ? transaction.performedBy.name : 'N/A';
        
        // Get location info
        let location = 'N/A';
        if (transaction.type === 'Check-in' && transaction.fromLocation) {
          location = transaction.fromLocation.name || 'N/A';
        } else if ((transaction.type === 'Check-out' || transaction.type === 'Restock') && transaction.toLocation) {
          location = transaction.toLocation.name || 'N/A';
        }
        
        html += `
          <tr>
            <td>${time}</td>
            <td>${itemName}</td>
            <td>
              <span class="badge ${getTransactionTypeBadge(type)}">${type}</span>
            </td>
            <td>${quantity}</td>
            <td>${location}</td>
            <td>${userName}</td>
          </tr>
        `;
      });
      
      document.getElementById('transactionsTable').innerHTML = html;
    } else {
      document.getElementById('transactionsTable').innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4">Failed to load transactions</td>
        </tr>
      `;
      
      const errorData = await response.json();
      console.error('Transaction loading error:', errorData);
    }
  } catch (error) {
    console.error('Transaction loading error:', error);
    document.getElementById('transactionsTable').innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4">Failed to load transactions</td>
      </tr>
    `;
  }
}

// Get badge class for transaction type
function getTransactionTypeBadge(type) {
  switch (type) {
    case 'Check-in':
      return 'bg-success';
    case 'Check-out':
      return 'bg-warning';
    case 'Maintenance':
      return 'bg-info';
    case 'Restock':
      return 'bg-primary';
    default:
      return 'bg-secondary';
  }
}

// Load locations for forms
async function loadLocations() {
  try {
    // Fetch locations
    const response = await fetchWithAuth(`${API_URL}/locations/hierarchy`);
    
    if (!response) return;
    
    if (response.ok) {
      locationHierarchy = await response.json();
      
      // Populate location dropdowns
      const fromLocationSelect = document.getElementById('transactionFromLocation');
      const toLocationSelect = document.getElementById('transactionToLocation');
      
      fromLocationSelect.innerHTML = '<option value="">Select Location</option>';
      toLocationSelect.innerHTML = '<option value="">Select Location</option>';
      
      locationHierarchy.forEach(room => {
        fromLocationSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
        toLocationSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
      });
    }
  } catch (error) {
    console.error('Error loading locations:', error);
  }
}

// Open transaction modal
function openTransactionModal() {
  if (!currentItemId) return;
  
  const modal = document.getElementById('transactionModal');
  const transactionType = document.getElementById('transactionType');
  
  // Reset form
  document.getElementById('transactionForm').reset();
  
  // Set item ID (already set in displayItemDetails)
  
  // Add event listener to transaction type
  transactionType.addEventListener('change', () => {
    updateTransactionForm(transactionType.value);
  });
  
  // Open the modal
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
  
  // Set the default transaction type after modal is shown
  setTimeout(() => {
    // Select appropriate default transaction type based on current item status
    const item = document.querySelector('#itemDetails h5');
    if (item) {
      const itemName = item.textContent;
      const itemStatus = document.querySelector('#itemDetails .status-badge').textContent;
      
      if (itemStatus === 'Available') {
        transactionType.value = 'Check-out';
      } else if (itemStatus === 'Under Maintenance') {
        transactionType.value = 'Check-in';
      } else if (itemStatus === 'Rented') {
        transactionType.value = 'Check-in';
      } else if (itemStatus === 'Out of Stock') {
        transactionType.value = 'Restock';
      }
      
      // Trigger change event to update form
      transactionType.dispatchEvent(new Event('change'));
    }
  }, 300);
}

// Update transaction form based on type
function updateTransactionForm(type) {
  const fromLocationGroup = document.getElementById('fromLocationGroup');
  const toLocationGroup = document.getElementById('toLocationGroup');
  
  // Reset display
  fromLocationGroup.style.display = 'none';
  toLocationGroup.style.display = 'none';
  
  // Show relevant fields based on transaction type
  switch (type) {
    case 'Check-in':
      fromLocationGroup.style.display = 'block';
      break;
    case 'Check-out':
      toLocationGroup.style.display = 'block';
      break;
    case 'Maintenance':
      // No locations needed
      break;
    case 'Restock':
      // Show both for complete tracking
      fromLocationGroup.style.display = 'block';
      toLocationGroup.style.display = 'block';
      break;
    default:
      break;
  }
}

// Save transaction
async function saveTransaction() {
  try {
    // Get form data
    const itemId = document.getElementById('transactionItemId').value;
    const type = document.getElementById('transactionType').value;
    const quantity = document.getElementById('transactionQuantity').value;
    const fromLocation = document.getElementById('transactionFromLocation').value;
    const toLocation = document.getElementById('transactionToLocation').value;
    const notes = document.getElementById('transactionNotes').value;
    
    // Validate required fields
    if (!type || !quantity) {
      showAlert('Please fill in all required fields', 'danger');
      return;
    }
    
    // Prepare transaction data
    const transactionData = {
      type,
      quantity: parseInt(quantity),
      notes
    };
    
    // Add locations based on transaction type
    if (fromLocation) {
      transactionData.fromLocation = fromLocation;
    }
    
    if (toLocation) {
      transactionData.toLocation = toLocation;
    }
    
    // Show loading state
    const saveBtn = document.getElementById('saveTransactionBtn');
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';
    saveBtn.disabled = true;
    
    // Create transaction
    const response = await fetchWithAuth(`${API_URL}/items/${itemId}/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    });
    
    // Reset button state
    saveBtn.innerHTML = 'Save Transaction';
    saveBtn.disabled = false;
    
    if (!response) return;
    
    if (response.ok) {
      // Close modal
      bootstrap.Modal.getInstance(document.getElementById('transactionModal')).hide();
      
      // Show success message
      showAlert('Transaction created successfully', 'success');
      
      // Reload item details 
      searchItem(document.getElementById('barcodeInput').value);
    } else {
      try {
        const errorData = await response.json();
        showAlert(errorData.message || 'Failed to create transaction', 'danger');
      } catch (e) {
        showAlert('Failed to create transaction', 'danger');
      }
    }
  } catch (error) {
    console.error('Save transaction error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    
    // Reset button state
    const saveBtn = document.getElementById('saveTransactionBtn');
    saveBtn.innerHTML = 'Save Transaction';
    saveBtn.disabled = false;
  }
}







// Process all bulk items
function processBulkItems() {
  if (bulkItems.length === 0) {
    showAlert('No items to process', 'warning');
    return;
  }
  
  // Open the bulk transaction modal
  openBulkTransactionModal();
}

// Open the bulk transaction modal
function openBulkTransactionModal() {
  // Update item count in modal
  document.getElementById('bulkModalItemCount').textContent = bulkItems.length;
  
  // Populate the items table
  const bulkItemsTable = document.getElementById('bulkItemsTable');
  bulkItemsTable.innerHTML = '';
  
  bulkItems.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="fw-semibold">${item.name}</div>
        <small class="text-muted">${item.barcode || 'No barcode'}</small>
      </td>
      <td>${item.category}</td>
      <td><span class="badge ${getStatusClass(item.status)}">${item.status}</span></td>
      <td><strong>${item.bulkCount || 1}</strong></td>
    `;
    bulkItemsTable.appendChild(row);
  });
  
  // Populate transaction type dropdown based on items
  populateBulkTransactionTypes();
  
  // Populate location dropdowns
  populateBulkLocationDropdowns();
  
  // Open the modal
  const modal = new bootstrap.Modal(document.getElementById('bulkTransactionModal'));
  modal.show();
}

// Populate transaction type dropdown based on items
function populateBulkTransactionTypes() {
  const typeSelect = document.getElementById('bulkTransactionType');
  typeSelect.innerHTML = '<option value="">Select Transaction Type</option>';
  
  // Determine common categories
  const hasConsumables = bulkItems.some(item => item.category === 'Consumable');
  const hasEquipment = bulkItems.some(item => item.category !== 'Consumable');
  
  // If mixed categories, show only common operations
  if (hasConsumables && hasEquipment) {
    typeSelect.innerHTML += `
      <option value="Stock Addition">Add Stock</option>
      <option value="Stock Removal">Remove Stock</option>
    `;
  } else if (hasConsumables) {
    // Consumable operations
    typeSelect.innerHTML += `
      <option value="Stock Addition">Add Stock</option>
      <option value="Stock Removal">Remove Stock</option>
    `;
  } else {
    // Equipment operations
    typeSelect.innerHTML += `
      <option value="Stock Addition">Add Stock</option>
      <option value="Stock Removal">Remove Stock</option>
      <option value="Relocate">Relocate</option>
      <option value="Check Out for Session">Use in Session</option>
      <option value="Rent Out">Rent Out</option>
      <option value="Send to Maintenance">Send to Maintenance</option>
    `;
    
    // Check if any items are in various states
    const hasMaintenanceItems = bulkItems.some(item => item.currentState?.inMaintenance > 0);
    const hasSessionItems = bulkItems.some(item => item.currentState?.inSession > 0);
    const hasRentedItems = bulkItems.some(item => item.currentState?.rented > 0);
    
    if (hasMaintenanceItems) {
      typeSelect.innerHTML += `<option value="Return from Maintenance">Return from Maintenance</option>`;
    }
    
    if (hasSessionItems) {
      typeSelect.innerHTML += `<option value="Return from Session">Return from Session</option>`;
    }
    
    if (hasRentedItems) {
      typeSelect.innerHTML += `<option value="Return from Rental">Return from Rental</option>`;
    }
  }
  
  // Add event listener for transaction type changes
  typeSelect.addEventListener('change', function() {
    updateBulkTransactionForm(this.value);
  });
}

// Populate location dropdowns
function populateBulkLocationDropdowns() {
  // Fetch locations
  fetchWithAuth(`${API_URL}/locations/hierarchy`)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to fetch locations');
    })
    .then(locations => {
      const fromSelect = document.getElementById('bulkFromLocation');
      const toSelect = document.getElementById('bulkToLocation');
      
      fromSelect.innerHTML = '<option value="">Select Location</option>';
      toSelect.innerHTML = '<option value="">Select Location</option>';
      
      locations.forEach(room => {
        fromSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
        toSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
      });
    })
    .catch(error => {
      console.error('Error loading locations:', error);
      showAlert('Failed to load locations', 'danger', 'bulkTransactionAlerts');
    });
}

// Update form based on selected transaction type
function updateBulkTransactionForm(type) {
  // Get all form groups
  const fromLocationGroup = document.getElementById('bulkFromLocationGroup');
  const toLocationGroup = document.getElementById('bulkToLocationGroup');
  const sessionGroup = document.getElementById('bulkSessionGroup');
  const rentalGroup = document.getElementById('bulkRentalGroup');
  const maintenanceGroup = document.getElementById('bulkMaintenanceGroup');
  
  // Hide all groups first
  fromLocationGroup.style.display = 'none';
  toLocationGroup.style.display = 'none';
  sessionGroup.style.display = 'none';
  rentalGroup.style.display = 'none';
  maintenanceGroup.style.display = 'none';
  
  // Show relevant groups based on transaction type
  switch (type) {
    case 'Stock Addition':
      toLocationGroup.style.display = 'block';
      break;
      
    case 'Stock Removal':
      fromLocationGroup.style.display = 'block';
      break;
      
    case 'Relocate':
      fromLocationGroup.style.display = 'block';
      toLocationGroup.style.display = 'block';
      break;
      
    case 'Check Out for Session':
      sessionGroup.style.display = 'block';
      toLocationGroup.style.display = 'block';
      break;
      
    case 'Return from Session':
      sessionGroup.style.display = 'block';
      break;
      
    case 'Rent Out':
      rentalGroup.style.display = 'block';
      break;
      
    case 'Return from Rental':
      rentalGroup.style.display = 'block';
      break;
      
    case 'Send to Maintenance':
      maintenanceGroup.style.display = 'block';
      break;
      
    case 'Return from Maintenance':
      maintenanceGroup.style.display = 'block';
      break;
  }

  updateMaxQuantitiesForTransactionType(type);
}



// Update max quantities based on transaction type
function updateMaxQuantitiesForTransactionType(type) {
  let updatedDisplay = false;
  
  // Calculate max quantities for each item based on transaction type
  bulkItems.forEach((item, index) => {
    const oldMax = getMaxQuantityForItem(item);
    let newMax;
    
    switch(type) {
      case 'Stock Addition':
        // No real limit for stock addition
        newMax = 999;
        break;
      case 'Stock Removal':
      case 'Relocate':
      case 'Check Out for Session':
      case 'Rent Out':
      case 'Send to Maintenance':
        // Limited by available quantity
        newMax = item.availableQuantity || item.quantity;
        break;
      case 'Return from Session':
        // Limited by items in session
        newMax = item.currentState?.inSession || 0;
        break;
      case 'Return from Rental':
        // Limited by items rented
        newMax = item.currentState?.rented || 0;
        break;
      case 'Return from Maintenance':
        // Limited by items in maintenance
        newMax = item.currentState?.inMaintenance || 0;
        break;
      default:
        newMax = 1;
    }
    
    // Update item max quantity if different
    if (oldMax !== newMax) {
      // Set a temporary property to track the max for this transaction type
      item.maxForTransaction = newMax;
      
      // If current count exceeds new max, adjust it
      if (item.bulkCount > newMax) {
        item.bulkCount = Math.max(1, newMax);
        updatedDisplay = true;
      }
    }
  });
  
  // Update display if any quantities changed
  if (updatedDisplay) {
    updateBulkItemsDisplay();
  }
  
  // Show warning if some items have zero max quantity
  const zeroMaxItems = bulkItems.filter(item => (item.maxForTransaction || 0) === 0);
  if (zeroMaxItems.length > 0) {
    let warningMsg = `Warning: The following items cannot be processed with this transaction type:`;
    zeroMaxItems.forEach(item => {
      warningMsg += `<br>• ${item.name}`;
    });
    
    showAlert(warningMsg, 'warning', 'bulkTransactionAlerts');
  }
}

// Process the bulk transaction - UPDATE YOUR EXISTING FUNCTION
async function saveBulkTransaction() {
  // Get form data
  const type = document.getElementById('bulkTransactionType').value;
  const fromLocation = document.getElementById('bulkFromLocation').value;
  const toLocation = document.getElementById('bulkToLocation').value;
  const notes = document.getElementById('bulkTransactionNotes').value;
  
  // Check for required fields
  if (!type) {
    showAlert('Please select a transaction type', 'danger', 'bulkTransactionAlerts');
    return;
  }
  
  // Get session data if visible
  let session = null;
  if (document.getElementById('bulkSessionGroup').style.display !== 'none') {
    const sessionName = document.getElementById('bulkSessionName').value;
    const sessionLocation = document.getElementById('bulkSessionLocation').value;
    
    if (sessionName || sessionLocation) {
      session = { name: sessionName, location: sessionLocation };
    }
  }
  
  // Get rental data if visible
  let rental = null;
  if (document.getElementById('bulkRentalGroup').style.display !== 'none') {
    const rentedTo = document.getElementById('bulkRentedTo').value;
    const expectedReturnDate = document.getElementById('bulkExpectedReturnDate').value;
    
    if (type === 'Rent Out' && !rentedTo) {
      showAlert('Please specify who the items are rented to', 'danger', 'bulkTransactionAlerts');
      return;
    }
    
    if (rentedTo) {
      rental = { rentedTo, expectedReturnDate };
    }
  }
  
  // Get maintenance data if visible
  let maintenance = null;
  if (document.getElementById('bulkMaintenanceGroup').style.display !== 'none') {
    const provider = document.getElementById('bulkMaintenanceProvider').value;
    const expectedEndDate = document.getElementById('bulkExpectedEndDate').value;
    
    if (provider || expectedEndDate) {
      maintenance = { provider, expectedEndDate };
    }
  }
  
  // Build the base transaction data
  const baseTransaction = {
    type,
    notes,
    fromLocation: fromLocation || undefined,
    toLocation: toLocation || undefined,
    session,
    rental,
    maintenance
  };
  
  // Show loading state
  const saveBtn = document.getElementById('saveBulkTransactionBtn');
  saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';
  saveBtn.disabled = true;
  
  // Create progress container in the modal
  const progressContainer = document.createElement('div');
  progressContainer.className = 'mt-4';
  progressContainer.innerHTML = `
    <h6>Processing Items...</h6>
    <div class="progress mb-3">
      <div id="bulkProgressBar" class="progress-bar progress-bar-striped progress-bar-animated" 
           role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
    </div>
    <div id="bulkProgressText" class="small text-muted">Preparing to process items...</div>
  `;
  
  // Add to form
  const form = document.getElementById('bulkTransactionForm');
  form.appendChild(progressContainer);
  
  // Process each item sequentially to avoid overloading the server
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  // Calculate total items (accounting for counts)
  const totalItems = bulkItems.reduce((total, item) => total + (item.bulkCount || 1), 0);
  let processedCount = 0;
  
  // Process items one by one
  for (let i = 0; i < bulkItems.length; i++) {
    const item = bulkItems[i];
    const itemQuantity = item.bulkCount || 1;
    
    // Skip items with zero allowed quantity for this transaction
    if ((item.maxForTransaction || 0) === 0) {
      processedCount++;
      results.skipped++;
      continue;
    }
    
    // Update progress
    const progressPercent = Math.round((processedCount / totalItems) * 100);
    document.getElementById('bulkProgressBar').style.width = `${progressPercent}%`;
    document.getElementById('bulkProgressBar').setAttribute('aria-valuenow', progressPercent);
    document.getElementById('bulkProgressText').textContent = 
      `Processing item ${i + 1} of ${bulkItems.length}: ${item.name} (quantity: ${itemQuantity})`;
    
    // Create transaction data for this item
    const transactionData = {
      ...baseTransaction,
      quantity: itemQuantity
    };
    
    try {
      // Create the transaction
      const response = await fetchWithAuth(`${API_URL}/items/${item._id}/enhanced-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData)
      });
      
      if (response.ok) {
        results.success++;
      } else {
        results.failed++;
        const errorData = await response.json();
        results.errors.push({
          item: item.name,
          error: errorData.message || 'Unknown error'
        });
      }
    } catch (error) {
      console.error(`Error processing item ${item.name}:`, error);
      results.failed++;
      results.errors.push({
        item: item.name,
        error: error.message || 'Network error'
      });
    }
    
    // Update processed count
    processedCount += itemQuantity;
  }
  
  // Complete the progress bar
  document.getElementById('bulkProgressBar').style.width = '100%';
  document.getElementById('bulkProgressBar').setAttribute('aria-valuenow', 100);
  document.getElementById('bulkProgressBar').classList.remove('progress-bar-animated');
  document.getElementById('bulkProgressText').textContent = 'Processing complete!';
  
  // Reset button state
  saveBtn.innerHTML = 'Process All Items';
  saveBtn.disabled = false;
  
  // Show results
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'mt-4 alert ' + (results.failed > 0 ? 'alert-warning' : 'alert-success');
  
  let resultsHtml = `
    <h5><i class="fas ${results.failed > 0 ? 'fa-exclamation-triangle' : 'fa-check-circle'} me-2"></i>Transaction Results</h5>
    <p>Successfully processed ${results.success} out of ${results.success + results.failed + results.skipped} items.</p>
  `;
  
  if (results.skipped > 0) {
    resultsHtml += `<p>${results.skipped} items were skipped because they couldn't be processed with this transaction type.</p>`;
  }
  
  if (results.failed > 0) {
    resultsHtml += '<div class="mt-3"><strong>Errors:</strong><ul>';
    results.errors.forEach(error => {
      resultsHtml += `<li>${error.item}: ${error.error}</li>`;
    });
    resultsHtml += '</ul></div>';
  }
  
  resultsContainer.innerHTML = resultsHtml;
  form.appendChild(resultsContainer);
  
  // Set timeout to close modal and clean up after successful operation
  if (results.failed === 0) {
    setTimeout(() => {
      // Close modal
      bootstrap.Modal.getInstance(document.getElementById('bulkTransactionModal')).hide();
      
      // Clear bulk items
      bulkItems = [];
      updateBulkItemsDisplay();
      document.getElementById('bulkItemCount').textContent = '0';
      
      // Hide buttons
      document.getElementById('clearBulkItems').classList.add('d-none');
      document.getElementById('processBulkItems').classList.add('d-none');
      
      // Hide container if not in bulk mode
      if (!bulkMode) {
        document.getElementById('bulkItemsContainer').classList.add('d-none');
      }
      
      // Show success message
      showAlert(`Successfully processed ${results.success} items!`, 'success');
      
      // Refocus barcode input
      document.getElementById('barcodeInput').focus();
    }, 3000);
  }
}







// Open quick transaction modal for Check-in, Check-out, etc.
function openQuickTransactionModal(type) {
  console.log(`Opening quick transaction modal for ${type}`);
  
  if (!currentItemId) {
    console.error('No current item ID');
    showAlert('Please scan an item first', 'warning');
    return;
  }
  
  // Fetch the current item data to ensure we have the most up-to-date information
  fetchWithAuth(`${API_URL}/items/${currentItemId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch item');
      }
      return response.json();
    })
    .then(item => {
      const modal = document.getElementById('quickTransactionModal');
      if (!modal) {
        console.error('Quick transaction modal not found in the DOM!');
        showAlert('Quick transaction feature is not properly set up', 'danger');
        return;
      }
      
      // Reset form and alerts
      const form = document.getElementById('quickTransactionForm');
      if (form) {
        form.reset();
      }
      
      const alertsContainer = document.getElementById('quickTransactionAlerts');
      if (alertsContainer) {
        alertsContainer.innerHTML = '';
      }
      
      // Prepare transaction data based on item and type
      let transactionType = '';
      let badge = '';
      let title = '';
      let showFromLocation = false;
      let showToLocation = false;
      let showSessionFields = false;
      let showRentalFields = false;
      let showMaintenanceFields = false;
      let maxQuantity = 0;
      let defaultQuantity = 1;
      let quantityLabel = 'Quantity';
      
      // Prepare values for each transaction type
      if (type === 'Return') {
        // Configure for return/check-in
        const itemsOut = (
          (item.currentState?.inMaintenance || 0) +
          (item.currentState?.inSession || 0) +
          (item.currentState?.rented || 0)
        );
        
        // Default to most appropriate return type
        if (item.currentState?.inMaintenance > 0) {
          transactionType = 'Return from Maintenance';
          badge = 'bg-info';
          title = 'Return from Maintenance';
          showMaintenanceFields = true;
          maxQuantity = item.currentState.inMaintenance;
        } else if (item.currentState?.inSession > 0) {
          transactionType = 'Return from Session';
          badge = 'bg-warning';
          title = 'Return from Session';
          showSessionFields = true;
          maxQuantity = item.currentState.inSession;
        } else if (item.currentState?.rented > 0) {
          transactionType = 'Return from Rental';
          badge = 'bg-primary';
          title = 'Return from Rental';
          showRentalFields = true;
          maxQuantity = item.currentState.rented;
        } else {
          // Fallback to generic check-in
          transactionType = 'Check-in';
          badge = 'bg-success';
          title = 'Return Item';
          showFromLocation = true;
          maxQuantity = item.quantity - (item.availableQuantity || 0);
        }
        
        quantityLabel = 'Return Quantity';
      } 
      else if (type === 'CheckOut') {
        // Configure for check-out
        if (item.category === 'Consumable') {
          transactionType = 'Stock Removal';
          badge = 'bg-warning';
          title = 'Remove Stock';
          maxQuantity = item.availableQuantity || item.quantity;
          quantityLabel = 'Remove Quantity';
        } else {
          // For equipment, default to session check-out
          transactionType = 'Check Out for Session';
          badge = 'bg-warning';
          title = 'Use in Session';
          showSessionFields = true;
          showToLocation = true;
          maxQuantity = item.availableQuantity || item.quantity;
          quantityLabel = 'Quantity for Session';
        }
      }
      else if (type === 'Maintenance') {
        // Configure for maintenance
        transactionType = 'Send to Maintenance';
        badge = 'bg-info';
        title = 'Send to Maintenance';
        showMaintenanceFields = true;
        maxQuantity = item.availableQuantity || item.quantity;
        quantityLabel = 'Quantity for Maintenance';
      }
      else if (type === 'Restock') {
        // Configure for restock
        transactionType = 'Stock Addition';
        badge = 'bg-success';
        title = 'Add Stock';
        maxQuantity = 9999; // No real limit on adding stock
        defaultQuantity = 10; // Default to adding 10 for restocking
        quantityLabel = 'Add Quantity';
      }
      
      // Set modal title
      const modalTitle = document.getElementById('quickTransactionTitle');
      if (modalTitle) {
        modalTitle.textContent = title;
      }
      
      // Set form values
      document.getElementById('quickTransactionItemId').value = item._id;
      document.getElementById('quickTransactionItem').value = item.name;
      document.getElementById('quickTransactionType').value = transactionType;
      
      // Set quantity default and max
      const quantityField = document.getElementById('quickTransactionQuantity');
      if (quantityField) {
        quantityField.value = defaultQuantity;
        quantityField.max = maxQuantity;
        
        // Update the label
        const quantityLabel = document.querySelector('label[for="quickTransactionQuantity"]');
        if (quantityLabel) {
          quantityLabel.textContent = `${quantityLabel}*`;
        }
      }
      
      // Set badge
      const badgeEl = document.getElementById('quickTransactionTypeBadge');
      if (badgeEl) {
        badgeEl.textContent = title;
        badgeEl.className = `badge ${badge} mb-2`;
      }
      
      // Show/hide fields based on transaction type
      const fromLocationGroup = document.getElementById('quickFromLocationGroup');
      const toLocationGroup = document.getElementById('quickToLocationGroup');
      const sessionFieldsGroup = document.getElementById('quickSessionGroup');
      const rentalFieldsGroup = document.getElementById('quickRentalGroup');
      const maintenanceFieldsGroup = document.getElementById('quickMaintenanceGroup');
      
      if (fromLocationGroup) {
        fromLocationGroup.style.display = showFromLocation ? 'block' : 'none';
      }
      
      if (toLocationGroup) {
        toLocationGroup.style.display = showToLocation ? 'block' : 'none';
      }
      
      if (sessionFieldsGroup) {
        sessionFieldsGroup.style.display = showSessionFields ? 'block' : 'none';
      }
      
      if (rentalFieldsGroup) {
        rentalFieldsGroup.style.display = showRentalFields ? 'block' : 'none';
      }
      
      if (maintenanceFieldsGroup) {
        maintenanceFieldsGroup.style.display = showMaintenanceFields ? 'block' : 'none';
      }
      
      // Populate location dropdowns
      populateQuickTransactionLocations();
      
      // Open the modal
      try {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Focus on quantity field
        setTimeout(() => {
          const quantityField = document.getElementById('quickTransactionQuantity');
          if (quantityField) {
            quantityField.focus();
          }
        }, 300);
      } catch (error) {
        console.error('Error showing modal:', error);
        showAlert('Error showing transaction modal. Please try again.', 'danger');
      }
    })
    .catch(error => {
      console.error('Error fetching item for transaction:', error);
      showAlert('Error preparing transaction. Please try again.', 'danger');
    });
}



  // Save quick transaction
  async function saveQuickTransaction() {
    try {
      // Create alert container if it doesn't exist
      let alertsContainer = document.getElementById('quickTransactionAlerts');
      if (!alertsContainer) {
        alertsContainer = document.createElement('div');
        alertsContainer.id = 'quickTransactionAlerts';
        
        const modalBody = document.querySelector('#quickTransactionModal .modal-body');
        if (modalBody) {
          modalBody.insertBefore(alertsContainer, modalBody.firstChild);
        }
      }
      
      // Get form data
      const itemId = document.getElementById('quickTransactionItemId').value;
      const type = document.getElementById('quickTransactionType').value;
      const quantity = document.getElementById('quickTransactionQuantity').value;
      
      // Gather all possible form fields (we'll only send the relevant ones)
      const transactionData = {
        type,
        quantity: parseInt(quantity)
      };
      
    // Get form fields based on transaction type
if (document.getElementById('quickFromLocation') && 
document.getElementById('quickFromLocation').parentElement.style.display !== 'none' &&
document.getElementById('quickFromLocation').value !== '') {  // Check for empty value
transactionData.fromLocation = document.getElementById('quickFromLocation').value;
}

if (document.getElementById('quickToLocation') && 
document.getElementById('quickToLocation').parentElement.style.display !== 'none' &&
document.getElementById('quickToLocation').value !== '') {  // Check for empty value
transactionData.toLocation = document.getElementById('quickToLocation').value;
}
      
      // Session fields
      if (document.getElementById('quickSessionGroup') && 
          document.getElementById('quickSessionGroup').style.display !== 'none') {
        const sessionName = document.getElementById('quickSessionName')?.value;
        const sessionLocation = document.getElementById('quickSessionLocation')?.value;
        
        if (sessionName || sessionLocation) {
          transactionData.session = {
            name: sessionName,
            location: sessionLocation
          };
        }
      }
      
      // Rental fields
      if (document.getElementById('quickRentalGroup') && 
          document.getElementById('quickRentalGroup').style.display !== 'none') {
        const rentedTo = document.getElementById('quickRentedTo')?.value;
        const expectedReturnDate = document.getElementById('quickExpectedReturnDate')?.value;
        
        if (rentedTo) {
          transactionData.rental = {
            rentedTo,
            expectedReturnDate
          };
        }
      }
      
      // Maintenance fields
      if (document.getElementById('quickMaintenanceGroup') && 
          document.getElementById('quickMaintenanceGroup').style.display !== 'none') {
        const provider = document.getElementById('quickMaintenanceProvider')?.value;
        const expectedEndDate = document.getElementById('quickExpectedEndDate')?.value;
        
        if (provider || expectedEndDate) {
          transactionData.maintenance = {
            provider,
            expectedEndDate
          };
        }
      }
      
      // Get notes
      const notes = document.getElementById('quickTransactionNotes')?.value;
      if (notes) {
        transactionData.notes = notes;
      }
      
      // Validate required fields
      if (!type || !quantity || parseInt(quantity) <= 0) {
        showAlert('Please specify a valid quantity', 'danger', 'quickTransactionAlerts', false);
        return;
      }
      
      // Show loading state
      const saveBtn = document.getElementById('saveQuickTransactionBtn');
      if (saveBtn) {
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';
        saveBtn.disabled = true;
      }
      
      // Create transaction using enhanced endpoint
      const response = await fetchWithAuth(`${API_URL}/items/${itemId}/enhanced-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData)
      });
      
      // Reset button state
      if (saveBtn) {
        saveBtn.innerHTML = 'Complete Transaction';
        saveBtn.disabled = false;
      }
      
      if (!response) {
        showAlert('Failed to connect to server', 'danger', 'quickTransactionAlerts', false);
        return;
      }
      
      if (response.ok) {
        // Close modal
        const modalElement = document.getElementById('quickTransactionModal');
        if (modalElement) {
          const modalInstance = bootstrap.Modal.getInstance(modalElement);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
        
        // Get the transaction result
        const transaction = await response.json();
        
        // Play success sound
        playSuccessSound();
        
        // Show success message with more details
        showAlert(`Transaction complete: ${transaction.type} of ${transaction.quantity} ${transaction.item ? 'units' : 'items'}`, 'success');
        
        // Reload item details
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput && barcodeInput.value) {
          searchItem(barcodeInput.value);
        }
        
        // Refocus on barcode input for next scan
        setTimeout(() => {
          if (barcodeInput) {
            barcodeInput.focus();
            barcodeInput.select();
          }
        }, 500);
      } else {
        try {
          const errorData = await response.json();
          showAlert(errorData.message || 'Failed to create transaction', 'danger', 'quickTransactionAlerts', false);
        } catch (e) {
          showAlert('Failed to create transaction', 'danger', 'quickTransactionAlerts', false);
        }
      }
    } catch (error) {
      console.error('Save quick transaction error:', error);
      showAlert('Failed to connect to server. Please try again.', 'danger', 'quickTransactionAlerts', false);
      
      // Reset button state
      const saveBtn = document.getElementById('saveQuickTransactionBtn');
      if (saveBtn) {
        saveBtn.innerHTML = 'Complete Transaction';
        saveBtn.disabled = false;
      }
    }
  }



    // Populate location dropdowns for quick transaction
    function populateQuickTransactionLocations() {
        if (!locationHierarchy || locationHierarchy.length === 0) {
          console.error('Location hierarchy not available');
          return;
        }
        
        const fromLocationSelect = document.getElementById('quickFromLocation');
        const toLocationSelect = document.getElementById('quickToLocation');
        
        // Clear previous options
        fromLocationSelect.innerHTML = '<option value="">Select Location</option>';
        toLocationSelect.innerHTML = '<option value="">Select Location</option>';
        
        // Add new options
        locationHierarchy.forEach(room => {
          fromLocationSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
          toLocationSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
        });
      }


        // Re-attach event listeners for transaction buttons
//   function reattachQuickTransactionListeners() {
//     // Quick transaction buttons
//     document.getElementById('checkInBtn').addEventListener('click', () => {
//       if (currentItemId) {
//         openQuickTransactionModal('Check-in');
//       } else {
//         showAlert('Please scan an item first', 'warning');
//       }
//     });
    
//     document.getElementById('checkOutBtn').addEventListener('click', () => {
//       if (currentItemId) {
//         openQuickTransactionModal('Check-out');
//       } else {
//         showAlert('Please scan an item first', 'warning');
//       }
//     });
    
//     document.getElementById('maintenanceBtn').addEventListener('click', () => {
//       if (currentItemId) {
//         openQuickTransactionModal('Maintenance');
//       } else {
//         showAlert('Please scan an item first', 'warning');
//       }
//     });
    
//     document.getElementById('restockBtn').addEventListener('click', () => {
//       if (currentItemId) {
//         openQuickTransactionModal('Restock');
//       } else {
//         showAlert('Please scan an item first', 'warning');
//       }
//     });
    
//     // Save quick transaction button
//     document.getElementById('saveQuickTransactionBtn').addEventListener('click', saveQuickTransaction);
//   }




function fixAllQuickButtons() {
    console.log("Fixing all quick transaction buttons");
    
    // Fix each button one by one, completely replacing the old ones
    const buttons = [
      { id: 'checkInBtn', type: 'Check-in' },
      { id: 'checkOutBtn', type: 'Check-out' },
      { id: 'maintenanceBtn', type: 'Maintenance' },
      { id: 'restockBtn', type: 'Restock' }
    ];
    
    buttons.forEach(button => {
      const btn = document.getElementById(button.id);
      if (btn) {
        console.log(`Found button: ${button.id}`);
        
        // Create entirely new button
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        // Add a direct click handler without any other functions
        newBtn.onclick = function() {
          console.log(`${button.type} button clicked`);
          if (currentItemId) {
            console.log(`Opening modal for ${button.type}`);
            // Direct call to open modal with specific type
            openQuickTransactionModalDirect(button.type);
          } else {
            console.log('No current item, showing alert');
            showAlert('Please scan an item first', 'warning');
          }
        };
      } else {
        console.error(`Button not found: ${button.id}`);
      }
    });
    
    // Also fix the save button
    const saveBtn = document.getElementById('saveQuickTransactionBtn');
    if (saveBtn) {
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
      newSaveBtn.onclick = saveQuickTransaction;
    }
  }



  function openQuickTransactionModalDirect(type) {
    console.log(`Direct modal open for ${type}`);
    if (!currentItemId) {
      console.error('No current item ID');
      return;
    }
    
    const modal = document.getElementById('quickTransactionModal');
    if (!modal) {
      console.error('Modal not found!');
      alert('Quick transaction modal not found in the page');
      return;
    }
    
    console.log('Modal found, preparing to open');
    
    // Get item name
    const itemName = document.querySelector('#itemDetails h5') ? 
                    document.querySelector('#itemDetails h5').textContent : 
                    'Unknown Item';
    
    // Set all form values
    document.getElementById('quickTransactionItemId').value = currentItemId;
    document.getElementById('quickTransactionItem').value = itemName;
    document.getElementById('quickTransactionType').value = type;
    
    // Set badge
    const badge = document.getElementById('quickTransactionTypeBadge');
    badge.textContent = type;
    
    // Configure fields based on type
    switch (type) {
      case 'Check-in':
        badge.className = 'badge bg-success mb-2';
        document.getElementById('quickFromLocationGroup').style.display = 'block';
        document.getElementById('quickToLocationGroup').style.display = 'none';
        break;
      case 'Check-out':
        badge.className = 'badge bg-warning mb-2';
        document.getElementById('quickFromLocationGroup').style.display = 'none';
        document.getElementById('quickToLocationGroup').style.display = 'block';
        break;
      case 'Maintenance':
        badge.className = 'badge bg-info mb-2';
        document.getElementById('quickFromLocationGroup').style.display = 'none';
        document.getElementById('quickToLocationGroup').style.display = 'none';
        break;
      case 'Restock':
        badge.className = 'badge bg-primary mb-2';
        document.getElementById('quickFromLocationGroup').style.display = 'block';
        document.getElementById('quickToLocationGroup').style.display = 'block';
        break;
    }
    
    // Populate locations
    populateQuickTransactionLocations();
    
    // Open modal
    console.log('Showing modal');
    try {
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    } catch (err) {
      console.error('Error showing modal:', err);
      alert('Error showing modal: ' + err.message);
    }
  }



  function fixCheckInButton() {
    const checkInBtn = document.getElementById('checkInBtn');
    if (checkInBtn) {
      // Remove any existing listeners to avoid duplicates
      const newCheckInBtn = checkInBtn.cloneNode(true);
      checkInBtn.parentNode.replaceChild(newCheckInBtn, checkInBtn);
      
      // Add a fresh listener
      newCheckInBtn.addEventListener('click', function() {
        console.log('Check-in button clicked!');
        if (currentItemId) {
          console.log('Opening quick transaction modal for Check-in');
          openQuickTransactionModal('Check-in');
        } else {
          console.log('No current item, showing alert');
          showAlert('Please scan an item first', 'warning');
        }
      });
    }
  }


  // Add this to public/js/scanner.js

/**
 * REVISED SCANNER TRANSACTION SYSTEM
 * 
 * This implementation fixes the issues with the quick transaction buttons
 * on the scanner page and makes them more intuitive based on item category.
 */

// Replace the existing updateTransactionButtonsForItem function with this improved version
function updateTransactionButtonsForItem(item) {
  console.log('Updating transaction buttons for item:', item);
  
  // Get references to buttons
  const checkInBtn = document.getElementById('checkInBtn');
  const checkOutBtn = document.getElementById('checkOutBtn');
  const maintenanceBtn = document.getElementById('maintenanceBtn');
  const restockBtn = document.getElementById('restockBtn');
  
  // Reset all buttons first
  if (checkInBtn) checkInBtn.disabled = true;
  if (checkOutBtn) checkOutBtn.disabled = true;
  if (maintenanceBtn) maintenanceBtn.disabled = true;
  if (restockBtn) restockBtn.disabled = true;
  
  // Exit if no item
  if (!item || !item._id) {
    currentItemId = null;
    return;
  }
  
  // Store the current item ID
  currentItemId = item._id;
  
  // Get availability information
  const availableQuantity = item.availableQuantity !== undefined ? 
    item.availableQuantity : item.quantity;
  
  const inMaintenanceCount = item.currentState?.inMaintenance || 0;
  const inSessionCount = item.currentState?.inSession || 0;
  const rentedCount = item.currentState?.rented || 0;
  const itemsOut = inMaintenanceCount + inSessionCount + rentedCount;
  
  // Enable/disable and rename buttons based on item category and status
  if (item.category === 'Consumable') {
    // For consumables:
    
    // 1. Always allow restocking
    if (restockBtn) {
      restockBtn.disabled = false;
      restockBtn.innerHTML = '<i class="fas fa-boxes"></i><span>Add Stock</span>';
      restockBtn.dataset.action = 'Stock Addition';
    }
    
    // 2. Allow removal if available quantity > 0
    if (checkOutBtn) {
      checkOutBtn.disabled = availableQuantity <= 0;
      checkOutBtn.innerHTML = '<i class="fas fa-minus"></i><span>Remove Stock</span>';
      checkOutBtn.dataset.action = 'Stock Removal';
    }
    
    // 3. Hide maintenance button for consumables
    if (maintenanceBtn) {
      maintenanceBtn.style.display = 'none';
    }
    
    // 4. Hide check-in button for consumables
    if (checkInBtn) {
      checkInBtn.style.display = 'none';
    }
  }
  else {
    // For equipment (non-consumables):
    
    // Make sure buttons are visible
    if (maintenanceBtn) maintenanceBtn.style.display = 'block';
    if (checkInBtn) checkInBtn.style.display = 'block';
    
    // 1. Allow maintenance if there are available items
    if (maintenanceBtn) {
      maintenanceBtn.disabled = availableQuantity <= 0;
      maintenanceBtn.innerHTML = '<i class="fas fa-tools"></i><span>Maintenance</span>';
      maintenanceBtn.dataset.action = 'Send to Maintenance';
    }
    
    // 2. Allow check-out for sessions if available quantity > 0
    if (checkOutBtn) {
      checkOutBtn.disabled = availableQuantity <= 0;
      checkOutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>Check Out</span>';
      checkOutBtn.dataset.action = 'Check Out for Session';
    }
    
    // 3. Enable restock button for adding new equipment
    if (restockBtn) {
      restockBtn.disabled = false;
      restockBtn.innerHTML = '<i class="fas fa-boxes"></i><span>Add Stock</span>';
      restockBtn.dataset.action = 'Stock Addition';
    }
    
    // 4. Enable check-in button if any items are out
    if (checkInBtn) {
      checkInBtn.disabled = itemsOut <= 0;
      checkInBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Return Item</span>';
      // We'll determine exactly what type of return in the click handler
      checkInBtn.dataset.action = 'Return';
    }
  }
}

// Replace the fixAllQuickButtons function with this improved version
function setupQuickTransactionButtons() {
  console.log("Setting up quick transaction buttons");
  
  // Function to handle quick transaction button clicks
  function handleQuickTransactionButton(actionType) {
    console.log(`Quick transaction button clicked: ${actionType}`);
    
    if (!currentItemId) {
      showAlert('Please scan an item first', 'warning');
      return;
    }
    
    // Fetch the latest item data
    fetchWithAuth(`${API_URL}/items/${currentItemId}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch item');
        return response.json();
      })
      .then(item => {
        // For 'Return' action, we need to determine the correct return type
        if (actionType === 'Return') {
          const inMaintenanceCount = item.currentState?.inMaintenance || 0;
          const inSessionCount = item.currentState?.inSession || 0;
          const rentedCount = item.currentState?.rented || 0;
          
          // Determine the most appropriate return type
          if (inMaintenanceCount > 0) {
            actionType = 'Return from Maintenance';
          } else if (inSessionCount > 0) {
            actionType = 'Return from Session';
          } else if (rentedCount > 0) {
            actionType = 'Return from Rental';
          } else {
            // Fallback
            showAlert('No items to return', 'warning');
            return;
          }
        }
        
        // Open the quick transaction modal
        openQuickTransactionModal(item, actionType);
      })
      .catch(error => {
        console.error('Error fetching item:', error);
        showAlert('Error loading item data', 'danger');
      });
  }
  
  // Set up click handlers for each button
  const checkInBtn = document.getElementById('checkInBtn');
  if (checkInBtn) {
    checkInBtn.onclick = function() {
      handleQuickTransactionButton(this.dataset.action || 'Return');
    };
  }
  
  const checkOutBtn = document.getElementById('checkOutBtn');
  if (checkOutBtn) {
    checkOutBtn.onclick = function() {
      handleQuickTransactionButton(this.dataset.action || 'Check Out for Session');
    };
  }
  
  const maintenanceBtn = document.getElementById('maintenanceBtn');
  if (maintenanceBtn) {
    maintenanceBtn.onclick = function() {
      handleQuickTransactionButton(this.dataset.action || 'Send to Maintenance');
    };
  }
  
  const restockBtn = document.getElementById('restockBtn');
  if (restockBtn) {
    restockBtn.onclick = function() {
      handleQuickTransactionButton(this.dataset.action || 'Stock Addition');
    };
  }
}

/**
 * Opens the quick transaction modal with appropriate settings
 */
function openQuickTransactionModal(item, actionType) {
  console.log(`Opening quick transaction modal for ${actionType}`);
  
  // Create or get the modal
  let quickModal = document.getElementById('quickTransactionModal');
  
  if (!quickModal) {
    console.error('Quick transaction modal not found in the DOM!');
    showAlert('Quick transaction feature is not properly set up', 'danger');
    return;
  }
  
  // Reset form and alerts
  const form = document.getElementById('quickTransactionForm');
  if (form) {
    form.reset();
  }
  
  const alertsContainer = document.getElementById('quickTransactionAlerts');
  if (alertsContainer) {
    alertsContainer.innerHTML = '';
  }
  
  // Prepare transaction data based on item and action type
  let title = '';
  let badge = '';
  let showFromLocation = false;
  let showToLocation = false;
  let showSessionFields = false;
  let showRentalFields = false;
  let showMaintenanceFields = false;
  let maxQuantity = 0;
  let defaultQuantity = 1;
  let quantityLabel = 'Quantity';
  
  // Set values based on action type
  switch (actionType) {
    case 'Stock Addition':
      title = 'Add Stock';
      badge = 'bg-success';
      showToLocation = true;
      maxQuantity = 9999; // No real limit on adding stock
      quantityLabel = 'Add Quantity';
      break;
      
    case 'Stock Removal':
      title = 'Remove Stock';
      badge = 'bg-warning';
      showFromLocation = true;
      maxQuantity = item.availableQuantity || item.quantity;
      quantityLabel = 'Remove Quantity';
      break;
      
    case 'Check Out for Session':
      title = 'Use in Session';
      badge = 'bg-warning';
      showSessionFields = true;
      showToLocation = true;
      maxQuantity = item.availableQuantity || item.quantity;
      quantityLabel = 'Quantity for Session';
      break;
      
    case 'Return from Session':
      title = 'Return from Session';
      badge = 'bg-info';
      showSessionFields = true;
      maxQuantity = item.currentState?.inSession || 0;
      quantityLabel = 'Return Quantity';
      break;
      
    case 'Rent Out':
      title = 'Rent Out';
      badge = 'bg-primary';
      showRentalFields = true;
      maxQuantity = item.availableQuantity || item.quantity;
      quantityLabel = 'Quantity to Rent';
      break;
      
    case 'Return from Rental':
      title = 'Return from Rental';
      badge = 'bg-primary';
      showRentalFields = true;
      maxQuantity = item.currentState?.rented || 0;
      quantityLabel = 'Return Quantity';
      break;
      
    case 'Send to Maintenance':
      title = 'Send to Maintenance';
      badge = 'bg-info';
      showMaintenanceFields = true;
      maxQuantity = item.availableQuantity || item.quantity;
      quantityLabel = 'Quantity for Maintenance';
      break;
      
    case 'Return from Maintenance':
      title = 'Return from Maintenance';
      badge = 'bg-info';
      showMaintenanceFields = true;
      maxQuantity = item.currentState?.inMaintenance || 0;
      quantityLabel = 'Return Quantity';
      break;
  }
  
  // Set modal title
  const modalTitle = document.getElementById('quickTransactionTitle');
  if (modalTitle) {
    modalTitle.textContent = title;
  }
  
  // Set form values
  document.getElementById('quickTransactionItemId').value = item._id;
  document.getElementById('quickTransactionItem').value = item.name;
  document.getElementById('quickTransactionType').value = actionType;
  
  // Set quantity default and max
  const quantityField = document.getElementById('quickTransactionQuantity');
  if (quantityField) {
    quantityField.value = Math.min(defaultQuantity, maxQuantity);
    quantityField.max = maxQuantity;
    
    // Update the label
    const quantityLabel = document.querySelector('label[for="quickTransactionQuantity"]');
    if (quantityLabel) {
      quantityLabel.textContent = `${quantityLabel}*`;
    }
  }
  
  // Set badge
  const badgeEl = document.getElementById('quickTransactionTypeBadge');
  if (badgeEl) {
    badgeEl.textContent = title;
    badgeEl.className = `badge ${badge} mb-2`;
  }
  
  // Show/hide fields based on transaction type
  const fromLocationGroup = document.getElementById('quickFromLocationGroup');
  const toLocationGroup = document.getElementById('quickToLocationGroup');
  const sessionFieldsGroup = document.getElementById('quickSessionGroup');
  const rentalFieldsGroup = document.getElementById('quickRentalGroup');
  const maintenanceFieldsGroup = document.getElementById('quickMaintenanceGroup');
  
  if (fromLocationGroup) {
    fromLocationGroup.style.display = showFromLocation ? 'block' : 'none';
  }
  
  if (toLocationGroup) {
    toLocationGroup.style.display = showToLocation ? 'block' : 'none';
  }
  
  if (sessionFieldsGroup) {
    sessionFieldsGroup.style.display = showSessionFields ? 'block' : 'none';
  }
  
  if (rentalFieldsGroup) {
    rentalFieldsGroup.style.display = showRentalFields ? 'block' : 'none';
  }
  
  if (maintenanceFieldsGroup) {
    maintenanceFieldsGroup.style.display = showMaintenanceFields ? 'block' : 'none';
  }
  
  // Populate location dropdowns
  populateQuickTransactionLocations();
  
  // Open the modal
  try {
    const bsModal = new bootstrap.Modal(quickModal);
    bsModal.show();
    
    // Focus on quantity field
    setTimeout(() => {
      const quantityField = document.getElementById('quickTransactionQuantity');
      if (quantityField) {
        quantityField.focus();
      }
    }, 300);
  } catch (error) {
    console.error('Error showing modal:', error);
    showAlert('Error showing transaction modal. Please try again.', 'danger');
  }
}

/**
 * Modified function to save quick transactions
 */
function saveQuickTransaction() {
  try {
    // Create alert container if it doesn't exist
    let alertsContainer = document.getElementById('quickTransactionAlerts');
    if (!alertsContainer) {
      alertsContainer = document.createElement('div');
      alertsContainer.id = 'quickTransactionAlerts';
      
      const modalBody = document.querySelector('#quickTransactionModal .modal-body');
      if (modalBody) {
        modalBody.insertBefore(alertsContainer, modalBody.firstChild);
      }
    }
    
    // Get form data
    const itemId = document.getElementById('quickTransactionItemId').value;
    const type = document.getElementById('quickTransactionType').value;
    const quantity = document.getElementById('quickTransactionQuantity').value;
    
    // Validate required fields
    if (!itemId || !type || parseInt(quantity) <= 0) {
      showAlert('Please enter a valid quantity', 'danger', 'quickTransactionAlerts');
      return;
    }
    
    // Build transaction data
    const transactionData = {
      type,
      quantity: parseInt(quantity),
      notes: document.getElementById('quickTransactionNotes')?.value || ''
    };
    
    // Gather additional data based on transaction type
    
    // From location
    const fromLocationGroup = document.getElementById('quickFromLocationGroup');
    if (fromLocationGroup && fromLocationGroup.style.display !== 'none') {
      const fromLocation = document.getElementById('quickFromLocation').value;
      if (fromLocation) {
        transactionData.fromLocation = fromLocation;
      }
    }
    
    // To location
    const toLocationGroup = document.getElementById('quickToLocationGroup');
    if (toLocationGroup && toLocationGroup.style.display !== 'none') {
      const toLocation = document.getElementById('quickToLocation').value;
      if (toLocation) {
        transactionData.toLocation = toLocation;
      }
    }
    
    // Session details
    const sessionGroup = document.getElementById('quickSessionGroup');
    if (sessionGroup && sessionGroup.style.display !== 'none') {
      const sessionName = document.getElementById('quickSessionName')?.value;
      const sessionLocation = document.getElementById('quickSessionLocation')?.value;
      
      if (sessionName || sessionLocation) {
        transactionData.session = {
          name: sessionName,
          location: sessionLocation
        };
      }
    }
    
    // Rental details
    const rentalGroup = document.getElementById('quickRentalGroup');
    if (rentalGroup && rentalGroup.style.display !== 'none') {
      const rentedTo = document.getElementById('quickRentedTo')?.value;
      const expectedReturnDate = document.getElementById('quickExpectedReturnDate')?.value;
      
      if (rentedTo) {
        transactionData.rental = {
          rentedTo,
          expectedReturnDate
        };
      } else if (type === 'Rent Out') {
        showAlert('Please specify who the item is rented to', 'warning', 'quickTransactionAlerts');
        return;
      }
    }
    
    // Maintenance details
    const maintenanceGroup = document.getElementById('quickMaintenanceGroup');
    if (maintenanceGroup && maintenanceGroup.style.display !== 'none') {
      const provider = document.getElementById('quickMaintenanceProvider')?.value;
      const expectedEndDate = document.getElementById('quickExpectedEndDate')?.value;
      
      if (provider || expectedEndDate) {
        transactionData.maintenance = {
          provider,
          expectedEndDate
        };
      }
    }
    
    // Show loading state
    const saveBtn = document.getElementById('saveQuickTransactionBtn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';
    saveBtn.disabled = true;
    
    // Send the request
    fetchWithAuth(`${API_URL}/items/${itemId}/enhanced-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    })
      .then(response => {
        // Reset button state
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
        
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || 'Failed to create transaction');
          });
        }
        
        return response.json();
      })
      .then(transaction => {
        // Close modal
        const modalElement = document.getElementById('quickTransactionModal');
        if (modalElement) {
          const modalInstance = bootstrap.Modal.getInstance(modalElement);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
        
        // Play success sound
        playSuccessSound();
        
        // Show success message
        showAlert(`Transaction complete: ${transaction.type}`, 'success');
        
        // Reload item details
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput && barcodeInput.value) {
          searchItem(barcodeInput.value);
        }
        
        // Refocus on barcode input for next scan
        setTimeout(() => {
          if (barcodeInput) {
            barcodeInput.focus();
            barcodeInput.select();
          }
        }, 500);
      })
      .catch(error => {
        console.error('Save quick transaction error:', error);
        showAlert(error.message || 'Failed to create transaction', 'danger', 'quickTransactionAlerts');
        
        // Reset button state
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
      });
  } catch (error) {
    console.error('Transaction error:', error);
    showAlert('An unexpected error occurred', 'danger', 'quickTransactionAlerts');
  }
}




function clearPreviousItemData() {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  
  // Only clear data if we don't have any parameters (id or barcode)
  if (!urlParams.has('id') && !urlParams.has('barcode')) {
    console.log('Clearing previous scanner data');
    
    // Reset item details
    resetItemDetails();
    
    // Clear barcode input
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
      barcodeInput.value = '';
    }
    
    // Reset transactions table
    const transactionsTable = document.getElementById('transactionsTable');
    if (transactionsTable) {
      transactionsTable.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4">Scan an item to view related transactions</td>
        </tr>
      `;
    }
    
    // Reset current item ID
    currentItemId = null;
    
    // Disable transaction buttons
    disableQuickTransactionButtons();
  }
}


// Add this to your document ready function to setup the transaction functionality
document.addEventListener('DOMContentLoaded', function() {
  // Set up quick transaction buttons
  setupQuickTransactionButtons();
  
  // Add click handler for the save button
  const saveQuickTransactionBtn = document.getElementById('saveQuickTransactionBtn');
  if (saveQuickTransactionBtn) {
    saveQuickTransactionBtn.addEventListener('click', saveQuickTransaction);
  }
  
  // Call this function once to update the buttons when the page loads
  // in case an item is already loaded (e.g., from URL parameters)
  if (currentItemId) {
    fetchWithAuth(`${API_URL}/items/${currentItemId}`)
      .then(response => response.json())
      .then(item => {
        updateTransactionButtonsForItem(item);
      })
      .catch(error => {
        console.error('Error fetching item data:', error);
      });
  }


  // Setup event listeners
  setupEventListeners();
  
  // Clear previous item data first
  clearPreviousItemData();
  
  // Process URL parameters after everything is set up
  setTimeout(processUrlParameters, 500);
    setupBulkFunctionality();
});


  // Clean up URL after processing parameters
  function cleanUpUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('id') || urlParams.has('barcode')) {
      // This will remove the parameters but not trigger a page reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }


// Function to process URL parameters for direct item loading
function processUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');
  
  if (itemId) {
    console.log('Loading item from URL parameter:', itemId);
    
    // Fetch the item data
    fetchWithAuth(`${API_URL}/items/${itemId}`)
      .then(response => {
        if (!response || !response.ok) {
          throw new Error('Failed to fetch item');
        }
        return response.json();
      })
      .then(item => {
        // Display the item details
        displayItemDetails(item);
        
        // Load transactions for this item
        loadItemTransactions(item._id);
        
        // If the item has a barcode, put it in the input field
        if (item.barcode) {
          document.getElementById('barcodeInput').value = item.barcode;
        }
        
        // Add a message indicating we've loaded this item
        showAlert(`Item loaded: ${item.name}`, 'success');
        
        // Highlight that this item came from inventory
        addInventoryHighlight();

        // Clean up the URL
        cleanUpUrl();
      })
      .catch(error => {
        console.error('Error loading item from URL parameter:', error);
        showAlert('Error loading item. Please try scanning the barcode manually.', 'warning');
      });
  }


}

// Add a visual highlight to show the item came from inventory
function addInventoryHighlight() {
  const itemDetails = document.getElementById('itemDetails');
  if (itemDetails) {
    // Create notice element
    const notice = document.createElement('div');
    notice.className = 'alert alert-info mt-3 mb-3';
    notice.innerHTML = `
      <div class="d-flex">
        <div class="me-3">
          <i class="fas fa-info-circle fa-2x"></i>
        </div>
        <div>
          <h5 class="alert-heading mb-1">Item from Inventory</h5>
          <p class="mb-0">This item was selected from the inventory page. You can now perform transactions on it using the buttons above.</p>
        </div>
      </div>
    `;
    
    // Add to the beginning of the item details
    if (itemDetails.firstChild) {
      itemDetails.insertBefore(notice, itemDetails.firstChild);
    } else {
      itemDetails.appendChild(notice);
    }
    
    // Add a highlight effect
    itemDetails.classList.add('highlight-success');
  }
}



function setupBulkKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Only process keyboard shortcuts if we're not in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
    // Toggle bulk mode with Alt+B
    if (e.altKey && e.key === 'b') {
      e.preventDefault();
      toggleBulkMode();
    }
    
    // Process all items with Alt+P (if we have items)
    if (e.altKey && e.key === 'p' && bulkItems.length > 0) {
      e.preventDefault();
      processBulkItems();
    }
    
    // Clear all items with Alt+C (if we have items)
    if (e.altKey && e.key === 'c' && bulkItems.length > 0) {
      e.preventDefault();
      clearBulkItems();
    }
  });
}


document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Scanner page initialization starting');
  
  // Check if user is logged in
  const token = getAuthToken();
  const user = getCurrentUser();
  
  if (!token || !user) {
    window.location.href = '../index.html';
    return;
  }
  
  // Setup event listeners ONCE
  setupEventListeners();
  
  // Clear previous item data first
  clearPreviousItemData();
  
  // Process URL parameters after everything is set up
  setTimeout(processUrlParameters, 500);
  
  // Setup bulk functionality
  setupBulkFunctionality();
  
  // Fix all quick buttons
  setTimeout(fixAllQuickButtons, 500);
  
  // Set up quick transaction buttons
  setupQuickTransactionButtons();
  
  // Add click handler for the save button
  const saveQuickTransactionBtn = document.getElementById('saveQuickTransactionBtn');
  if (saveQuickTransactionBtn) {
    saveQuickTransactionBtn.addEventListener('click', saveQuickTransaction);
  }
  
  // Setup keyboard shortcuts
  setupBulkKeyboardShortcuts();
  
  // Show/hide admin links based on user role
  if (isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
  }
  
  // Update user info
  document.getElementById('userName').textContent = user.name;
  document.getElementById('profileName').value = user.name;
  document.getElementById('profileEmail').value = user.email;
  document.getElementById('profileRole').value = user.role;
  
  // Load locations for the form
  loadLocations();
  
  // Auto-focus the barcode input field when the page loads
  document.getElementById('barcodeInput').focus();
  
  // Show welcome message
  showAlert('Ready to scan! Use your barcode scanner or enter a code manually.', 'info');
  
  // Debug functions
  setTimeout(debugQuickButtons, 1000);
  
  // Call this function once to update the buttons when the page loads
  // in case an item is already loaded (e.g., from URL parameters)
  if (currentItemId) {
    fetchWithAuth(`${API_URL}/items/${currentItemId}`)
      .then(response => response.json())
      .then(item => {
        updateTransactionButtonsForItem(item);
      })
      .catch(error => {
        console.error('Error fetching item data:', error);
      });
  }
  
  console.log('Scanner page initialization complete');
});