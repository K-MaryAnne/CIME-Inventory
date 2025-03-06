// public/js/scanner.js

// Global variables
let html5QrCode;
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
  
  // Initialize scanner
  initializeScanner();
  
  // Setup event listeners
  setupEventListeners();
  
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
});

// Initialize the scanner
function initializeScanner() {
  html5QrCode = new Html5Qrcode("reader");
}

// Start scanning
function startScanning() {
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');
  
  startButton.disabled = true;
  stopButton.disabled = false;
  
  // Camera options
  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0
  };
  
  // Success callback
  const qrCodeSuccessCallback = (decodedText) => {
    // Stop scanning after successful scan
    stopScanning();
    
    // Search for the item
    searchItem(decodedText);
  };
  
  // Start scanning with rear camera
  html5QrCode.start(
    { facingMode: "environment" },
    config,
    qrCodeSuccessCallback,
    (errorMessage) => {
      // Handle errors
      console.error(`QR Code scanning error: ${errorMessage}`);
    }
  ).catch((err) => {
    console.error(`Unable to start scanning: ${err}`);
    showAlert('Failed to start camera. Please check camera permissions.', 'danger');
    
    // Reset buttons
    startButton.disabled = false;
    stopButton.disabled = true;
  });
}

// Stop scanning
function stopScanning() {
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');
  
  if (html5QrCode && html5QrCode.isScanning) {
    html5QrCode.stop().then(() => {
      console.log('Scanning stopped');
      
      // Reset buttons
      startButton.disabled = false;
      stopButton.disabled = true;
    }).catch((err) => {
      console.error(`Error stopping scanner: ${err}`);
    });
  } else {
    // Reset buttons anyway
    startButton.disabled = false;
    stopButton.disabled = true;
  }
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
    
    // Fetch item by barcode
    const response = await fetchWithAuth(`${API_URL}/items/barcode/${barcode}`);
    
    if (!response) return;
    
    if (response.ok) {
      const item = await response.json();
      
      // Display item details
      displayItemDetails(item);
      
      // Load transactions for this item
      loadItemTransactions(item._id);
    } else {
      // Handle item not found
      document.getElementById('itemDetails').innerHTML = `
        <div class="text-center py-5">
          <i class="fas fa-exclamation-circle fa-3x mb-3 text-warning"></i>
          <p class="mb-0">Item not found with barcode: ${barcode}</p>
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
        const errorData = await response.json();
        showAlert(errorData.message || 'Failed to search for item', 'danger');
      }
    }
  } catch (error) {
    console.error('Search error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    
    // Reset item details
    resetItemDetails();
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
  
  // Determine status color
  let statusClass = '';
  switch (item.status) {
    case 'Available':
      statusClass = 'text-success';
      break;
    case 'Under Maintenance':
      statusClass = 'text-warning';
      break;
    case 'Rented':
      statusClass = 'text-info';
      break;
    case 'Out of Stock':
      statusClass = 'text-danger';
      break;
    default:
      statusClass = 'text-secondary';
  }
  
  // Create HTML for item details
  const detailsHtml = `
    <div class="row">
      <div class="col-md-4 text-center mb-3 mb-md-0">
        ${item.imageUrl ? `
          <div class="mb-2">
            <img src="${item.imageUrl}" alt="Barcode" class="img-fluid" style="max-width: 150px;">
          </div>
        ` : ''}
        <div class="font-monospace small">${item.barcode}</div>
      </div>
      <div class="col-md-8">
        <h5 class="mb-3">${item.name}</h5>
        <div class="mb-3">
          <span class="${getStatusBadgeClass(item.status)}">${item.status}</span>
          <span class="badge bg-secondary ms-2">${item.category}</span>
        </div>
        
        <div class="mb-1">
          <strong>Quantity:</strong> 
          <span class="${item.quantity <= item.reorderLevel ? 'text-danger fw-bold' : ''}">${item.quantity} ${item.unit}</span>
          ${item.quantity <= item.reorderLevel ? '<span class="badge bg-danger ms-2">Low Stock</span>' : ''}
        </div>
        <div class="mb-1"><strong>Location:</strong> ${location}</div>
        <div class="mb-1"><strong>Serial Number:</strong> ${item.serialNumber || 'N/A'}</div>
        <div class="mb-1"><strong>Unit Cost:</strong> ${formatCurrency(item.unitCost)}</div>
        
        ${item.description ? `
          <div class="mt-3">
            <strong>Description:</strong>
            <p class="mb-0 small">${item.description}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Update item details
  document.getElementById('itemDetails').innerHTML = detailsHtml;
  
  // Show action buttons
  document.getElementById('itemActions').classList.remove('d-none');
  
  // Update transaction modal
  document.getElementById('transactionItemId').value = item._id;
  document.getElementById('transactionItem').value = item.name;
}

// Reset item details
function resetItemDetails() {
  document.getElementById('itemDetails').innerHTML = `
    <div class="text-center py-5">
      <i class="fas fa-qrcode fa-3x mb-3 text-muted"></i>
      <p class="mb-0">Scan a barcode to view item details</p>
    </div>
  `;
  
  // Hide action buttons
  document.getElementById('itemActions').classList.add('d-none');
  
  // Reset current item
  currentItemId = null;
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
      
      // Reload item details and transactions
      searchItem(document.getElementById('barcodeInput').value);
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to create transaction', 'danger');
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
  
  // Start scanner button
  document.getElementById('startButton').addEventListener('click', () => {
    startScanning();
  });
  
  // Stop scanner button
  document.getElementById('stopButton').addEventListener('click', () => {
    stopScanning();
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
}