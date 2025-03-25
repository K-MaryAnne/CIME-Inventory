// public/js/scanner.js

// Global variables
let currentItemId = null;
let locationHierarchy = [];

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  const token = getAuthToken();
  const user = getCurrentUser();
  
  if (!token || !user) {
    window.location.href = '../index.html';
    return;
  }
  
  // Setup event listeners
  setupEventListeners();

  

//   reattachQuickTransactionListeners();
//   fixCheckInButton(); 

setTimeout(fixAllQuickButtons, 500);
  
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

  setTimeout(debugQuickButtons, 1000);

  setupQuickTransactionButtons();


});




function setupQuickTransactionButtons() {
    console.log("Setting up quick transaction buttons");
    
    // Check In button
    const checkInBtn = document.getElementById('checkInBtn');
    if (checkInBtn) {
      checkInBtn.addEventListener('click', function() {
        console.log('Check-in button clicked');
        if (currentItemId) {
          openQuickTransactionModal('Check-in');
        } else {
          showAlert('Please scan an item first', 'warning');
        }
      });
    } else {
      console.error('Check-in button not found in the DOM');
    }
    
    // Check Out button
    const checkOutBtn = document.getElementById('checkOutBtn');
    if (checkOutBtn) {
      checkOutBtn.addEventListener('click', function() {
        console.log('Check-out button clicked');
        if (currentItemId) {
          openQuickTransactionModal('Check-out');
        } else {
          showAlert('Please scan an item first', 'warning');
        }
      });
    }
    
    // Maintenance button
    const maintenanceBtn = document.getElementById('maintenanceBtn');
    if (maintenanceBtn) {
      maintenanceBtn.addEventListener('click', function() {
        console.log('Maintenance button clicked');
        if (currentItemId) {
          openQuickTransactionModal('Maintenance');
        } else {
          showAlert('Please scan an item first', 'warning');
        }
      });
    }
    
    // Restock button
    const restockBtn = document.getElementById('restockBtn');
    if (restockBtn) {
      restockBtn.addEventListener('click', function() {
        console.log('Restock button clicked');
        if (currentItemId) {
          openQuickTransactionModal('Restock');
        } else {
          showAlert('Please scan an item first', 'warning');
        }
      });
    }
    
    // Save Quick Transaction button
    const saveQuickTransactionBtn = document.getElementById('saveQuickTransactionBtn');
    if (saveQuickTransactionBtn) {
      saveQuickTransactionBtn.addEventListener('click', saveQuickTransaction);
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
async function searchItem(barcode) {
  try {
    // Clear previous results
    resetItemDetails();
    
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
      
      // Display item details
      displayItemDetails(item);
      
      // Load transactions for this item
      loadItemTransactions(item._id);
      
      // Show success message
      showAlert(`Item found: ${item.name}`, 'success');
      
      // Clear and refocus the input field for next scan
      setTimeout(() => {
        document.getElementById('barcodeInput').select();
      }, 100);
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
      
      if (response.status === 404) {
        showAlert(`Item with barcode "${barcode}" not found.`, 'warning');
      } else {
        try {
          const errorData = await response.json();
          showAlert(errorData.message || 'Failed to search for item', 'danger');
        } catch (e) {
          showAlert('Failed to search for item', 'danger');
        }
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
            <div class="detail-label">Quantity:</div>
            <div class="detail-value">
              <span class="${item.quantity <= item.reorderLevel ? 'text-danger fw-bold' : ''}">${item.quantity} ${item.unit}</span>
              ${item.quantity <= item.reorderLevel ? '<span class="badge bg-danger ms-2">Low Stock</span>' : ''}
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Location:</div>
            <div class="detail-value">${location}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Serial Number:</div>
            <div class="detail-value">${item.serialNumber || 'N/A'}</div>
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
  document.getElementById('itemActions').classList.add('d-none');
  
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


// Open quick transaction modal for Check-in, Check-out, etc.
function openQuickTransactionModal(type) {
    console.log(`Opening quick transaction modal for ${type}`);
    
    if (!currentItemId) {
      console.error('No current item ID');
      showAlert('Please scan an item first', 'warning');
      return;
    }
    
    const modal = document.getElementById('quickTransactionModal');
    if (!modal) {
      console.error('Quick transaction modal not found in the DOM!');
      showAlert('Quick transaction feature is not properly set up', 'danger');
      return;
    }
    
    const item = document.querySelector('#itemDetails h5') ? 
                 document.querySelector('#itemDetails h5').textContent : 
                 'Unknown Item';
    
    // Reset form and alerts
    const form = document.getElementById('quickTransactionForm');
    if (form) {
      form.reset();
    }
    
    const alertsContainer = document.getElementById('quickTransactionAlerts');
    if (alertsContainer) {
      alertsContainer.innerHTML = '';
    }
    
    // Set modal title
    const title = document.getElementById('quickTransactionTitle');
    if (title) {
      title.textContent = `Quick ${type}`;
    }
    
    // Set form values
    document.getElementById('quickTransactionItemId').value = currentItemId;
    document.getElementById('quickTransactionItem').value = item;
    document.getElementById('quickTransactionType').value = type;
    
    // Set badge color and text
    const badge = document.getElementById('quickTransactionTypeBadge');
    if (badge) {
      badge.textContent = type;
      
      switch (type) {
        case 'Check-in':
          badge.className = 'badge bg-success mb-2';
          break;
        case 'Check-out':
          badge.className = 'badge bg-warning mb-2';
          break;
        case 'Maintenance':
          badge.className = 'badge bg-info mb-2';
          break;
        case 'Restock':
          badge.className = 'badge bg-primary mb-2';
          break;
      }
    }
    
    // Show/hide location groups based on transaction type
    const fromLocationGroup = document.getElementById('quickFromLocationGroup');
    const toLocationGroup = document.getElementById('quickToLocationGroup');
    
    if (fromLocationGroup && toLocationGroup) {
      switch (type) {
        case 'Check-in':
          fromLocationGroup.style.display = 'block';
          toLocationGroup.style.display = 'none';
          break;
        case 'Check-out':
          fromLocationGroup.style.display = 'none';
          toLocationGroup.style.display = 'block';
          break;
        case 'Maintenance':
          fromLocationGroup.style.display = 'none';
          toLocationGroup.style.display = 'none';
          break;
        case 'Restock':
          fromLocationGroup.style.display = 'block';
          toLocationGroup.style.display = 'block';
          break;
      }
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
      const fromLocation = document.getElementById('quickFromLocation') ? 
                           document.getElementById('quickFromLocation').value : '';
      const toLocation = document.getElementById('quickToLocation') ? 
                         document.getElementById('quickToLocation').value : '';
      const notes = document.getElementById('quickTransactionNotes') ? 
                   document.getElementById('quickTransactionNotes').value : '';
      
      // Validate required fields
      if (!type || !quantity) {
        showAlert('Please fill in all required fields', 'danger', 'quickTransactionAlerts', false);
        return;
      }
      
      // Validate location fields based on transaction type
      if (type === 'Check-in' && !fromLocation) {
        showAlert('Please select the location the item is coming from', 'warning', 'quickTransactionAlerts', false);
        return;
      }
      
      if (type === 'Check-out' && !toLocation) {
        showAlert('Please select the location the item is going to', 'warning', 'quickTransactionAlerts', false);
        return;
      }
      
      if (type === 'Restock' && (!fromLocation || !toLocation)) {
        showAlert('Please select both from and to locations for restock', 'warning', 'quickTransactionAlerts', false);
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
      const saveBtn = document.getElementById('saveQuickTransactionBtn');
      if (saveBtn) {
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';
        saveBtn.disabled = true;
      }
      
      // Create transaction
      const response = await fetchWithAuth(`${API_URL}/items/${itemId}/transaction`, {
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
        showAlert(`Quick transaction complete: ${transaction.type} of ${transaction.quantity} units`, 'success');
        
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