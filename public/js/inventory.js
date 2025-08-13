// public/js/inventory.js

// Global variables
let currentPage = 1;
let itemsPerPage = 10;
let totalPages = 1;
let currentFilter = {};
let locationHierarchy = [];
let suppliers = [];

let activeScanner = null;
let activeScannerElementId = null;
let activeScannerTargetId = null;
let transactionItemData = null;
let generatedBarcode = null;


// updateTransactionFormFields function 

function updateTransactionFormFields(transactionType) {
  // Get all form groups
  const fromLocationGroup = document.getElementById('fromLocationGroup') || 
                           document.getElementById('quickFromLocationGroup') ||
                           document.getElementById('enhancedFromLocationGroup');
  const toLocationGroup = document.getElementById('toLocationGroup') || 
                         document.getElementById('quickToLocationGroup') ||
                         document.getElementById('enhancedToLocationGroup');
  const sessionGroup = document.getElementById('sessionDetailsGroup') || 
                      document.getElementById('quickSessionGroup') ||
                      document.getElementById('enhancedSessionDetailsGroup');
  const rentalGroup = document.getElementById('rentalDetailsGroup') || 
                     document.getElementById('quickRentalGroup') ||
                     document.getElementById('enhancedRentalDetailsGroup');
  const maintenanceGroup = document.getElementById('maintenanceDetailsGroup') || 
                          document.getElementById('quickMaintenanceGroup') ||
                          document.getElementById('enhancedMaintenanceDetailsGroup');
  
  // Hide all groups initially
  [fromLocationGroup, toLocationGroup, sessionGroup, rentalGroup, maintenanceGroup].forEach(group => {
    if (group) group.style.display = 'none';
  });
  
  // Show relevant groups based on transaction type
  switch (transactionType) {
    // STOCK MANAGEMENT
    case 'Stock Addition':
    case 'Add Stock':
      // Show destination location for new stock
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
      
    case 'Stock Consumption':
    case 'Use Items':
      // No special fields needed for consumption
      break;
      
    case 'Stock Removal':
    case 'Remove Stock':
      // Show source location for removal/disposal
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      break;
      
    case 'Stock Adjustment':
      // No location needed for adjustments (corrections)
      break;
      
    // LOCATION MANAGEMENT
    case 'Relocate':
      // Show both from and to locations
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
      
    // SESSION MANAGEMENT
    case 'Check Out for Session':
      // Show session details and optionally destination
      if (sessionGroup) sessionGroup.style.display = 'block';
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
      
    case 'Return from Session':
      // Show session details for identification
      if (sessionGroup) sessionGroup.style.display = 'block';
      break;
      
    // RENTAL MANAGEMENT
    case 'Rent Out':
      // Show rental details
      if (rentalGroup) rentalGroup.style.display = 'block';
      break;
      
    case 'Return from Rental':
      // Show rental details for identification
      if (rentalGroup) rentalGroup.style.display = 'block';
      break;
      
    // MAINTENANCE MANAGEMENT
    case 'Send to Maintenance':
      // Show maintenance details
      if (maintenanceGroup) maintenanceGroup.style.display = 'block';
      break;
      
    case 'Return from Maintenance':
      // Show maintenance details for identification
      if (maintenanceGroup) maintenanceGroup.style.display = 'block';
      break;
      
    // LEGACY TRANSACTION TYPES (for backward compatibility)
    case 'Check-in':
      // Generic check-in - show from location
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      break;
      
    case 'Check-out':
      // Generic check-out - show to location
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
      
    case 'Maintenance':
      // Legacy maintenance - show maintenance fields
      if (maintenanceGroup) maintenanceGroup.style.display = 'block';
      break;
      
    case 'Restock':
      // Legacy restock - show both locations
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
      
    default:
      console.warn(`Unknown transaction type: ${transactionType}`);
      break;
  }
  
  // Update quantity limits based on transaction type
  updateQuantityLimitsForTransaction(transactionType);
}


function updateQuantityLimitsForTransaction(transactionType) {
  // Try to find quantity input from different possible forms
  const quantityInput = document.getElementById('transactionQuantity') ||
                       document.getElementById('quickTransactionQuantity') ||
                       document.getElementById('enhancedTransactionQuantity');
  
  if (!quantityInput) {
    console.warn('Quantity input field not found');
    return;
  }
  
  // Get current item data
  const itemId = document.getElementById('transactionItemId')?.value ||
                document.getElementById('quickTransactionItemId')?.value ||
                document.getElementById('enhancedTransactionItemId')?.value ||
                currentItemId;
  
  if (!itemId) {
    console.warn('No item ID found for quantity limit calculation');
    return;
  }
  
  // If we have cached item data, use it; otherwise fetch it
  if (transactionItemData && transactionItemData._id === itemId) {
    setQuantityLimits(transactionItemData, transactionType, quantityInput);
  } else {
    // Fetch current item data
    fetchWithAuth(`${API_URL}/items/${itemId}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch item');
        return response.json();
      })
      .then(item => {
        setQuantityLimits(item, transactionType, quantityInput);
      })
      .catch(error => {
        console.error('Error fetching item for quantity limits:', error);
        // Set a safe default
        quantityInput.max = 1;
        quantityInput.value = Math.min(parseInt(quantityInput.value) || 1, 1);
      });
  }
}

function setQuantityLimits(item, transactionType, quantityInput) {
  let maxQuantity = 1;
  let defaultQuantity = 1;
  
  // Calculate limits based on transaction type and item state
  switch (transactionType) {
    case 'Stock Addition':
    case 'Add Stock':
    case 'Stock Adjustment':
      // No real limit for adding stock
      maxQuantity = 9999;
      defaultQuantity = item.category === 'Consumable' ? 10 : 1;
      break;
      
    case 'Stock Consumption':
    case 'Use Items':
    case 'Stock Removal':
    case 'Remove Stock':
    case 'Relocate':
    case 'Check Out for Session':
    case 'Rent Out':
    case 'Send to Maintenance':
      // Limited by available quantity
      maxQuantity = item.availableQuantity || 0;
      defaultQuantity = Math.min(1, maxQuantity);
      break;
      
    case 'Return from Session':
      // Limited by items currently in session
      maxQuantity = item.currentState?.inSession || 0;
      defaultQuantity = Math.min(1, maxQuantity);
      break;
      
    case 'Return from Rental':
      // Limited by items currently rented
      maxQuantity = item.currentState?.rented || 0;
      defaultQuantity = Math.min(1, maxQuantity);
      break;
      
    case 'Return from Maintenance':
      // Limited by items currently in maintenance
      maxQuantity = item.currentState?.inMaintenance || 0;
      defaultQuantity = Math.min(1, maxQuantity);
      break;
      
    // Legacy transaction types
    case 'Check-in':
    case 'Restock':
      maxQuantity = 9999;
      defaultQuantity = 1;
      break;
      
    case 'Check-out':
    case 'Maintenance':
      maxQuantity = item.availableQuantity || 0;
      defaultQuantity = Math.min(1, maxQuantity);
      break;
      
    default:
      maxQuantity = item.availableQuantity || 1;
      defaultQuantity = Math.min(1, maxQuantity);
      break;
  }
  
  // Update the input field
  quantityInput.max = maxQuantity;
  
  // Set value to default if current value exceeds max or is empty
  const currentValue = parseInt(quantityInput.value) || 0;
  if (currentValue > maxQuantity || currentValue <= 0) {
    quantityInput.value = Math.max(1, Math.min(defaultQuantity, maxQuantity));
  }
  
  
  const quantityLabel = document.querySelector(`label[for="${quantityInput.id}"]`);
  if (quantityLabel && maxQuantity > 0) {
    const originalText = quantityLabel.textContent.replace(/ \(max: \d+\)/, '');
    quantityLabel.textContent = `${originalText} (max: ${maxQuantity})`;
  }
  
  // Disable input if no items available for outbound transactions
  const isOutboundTransaction = [
    'Stock Consumption', 'Use Items', 'Stock Removal', 'Remove Stock',
    'Check Out for Session', 'Rent Out', 'Send to Maintenance',
    'Return from Session', 'Return from Rental', 'Return from Maintenance'
  ].includes(transactionType);
  
  if (isOutboundTransaction && maxQuantity <= 0) {
    quantityInput.disabled = true;
    quantityInput.value = 0;
    
    // Show warning message
    const warningElement = document.getElementById('quantityWarning') || createQuantityWarning();
    warningElement.textContent = getQuantityWarningMessage(transactionType, item);
    warningElement.style.display = 'block';
  } else {
    quantityInput.disabled = false;
    const warningElement = document.getElementById('quantityWarning');
    if (warningElement) {
      warningElement.style.display = 'none';
    }
  }
}

function createQuantityWarning() {
  const warning = document.createElement('div');
  warning.id = 'quantityWarning';
  warning.className = 'alert alert-warning mt-2';
  warning.style.display = 'none';
  
  // Find the quantity input and insert warning after it
  const quantityInput = document.getElementById('transactionQuantity') ||
                       document.getElementById('quickTransactionQuantity') ||
                       document.getElementById('enhancedTransactionQuantity');
  
  if (quantityInput && quantityInput.parentNode) {
    quantityInput.parentNode.insertBefore(warning, quantityInput.nextSibling);
  }
  
  return warning;
}

function getQuantityWarningMessage(transactionType, item) {
  switch (transactionType) {
    case 'Stock Consumption':
    case 'Use Items':
      return `No ${item.name} available to consume.`;
    case 'Check Out for Session':
      return `No ${item.name} available for session use.`;
    case 'Return from Session':
      return `No ${item.name} currently in session to return.`;
    case 'Return from Rental':
      return `No ${item.name} currently rented to return.`;
    case 'Return from Maintenance':
      return `No ${item.name} currently in maintenance to return.`;
    case 'Send to Maintenance':
      return `No ${item.name} available to send to maintenance.`;
    case 'Rent Out':
      return `No ${item.name} available to rent out.`;
    default:
      return `No ${item.name} available for this transaction.`;
  }
}






// Handle view button clicks
document.addEventListener('click', function(e) {
    if (e.target.matches('.view-btn') || e.target.closest('.view-btn')) {
      const button = e.target.matches('.view-btn') ? e.target : e.target.closest('.view-btn');
      const itemId = button.dataset.id;
      
      if (itemId) {
        loadItemDetails(itemId, false);
      }
    }
  });
  
  // Handle edit button clicks
  document.addEventListener('click', function(e) {
    if (e.target.matches('.edit-btn') || e.target.closest('.edit-btn')) {
      const button = e.target.matches('.edit-btn') ? e.target : e.target.closest('.edit-btn');
      const itemId = button.dataset.id;
      
      if (itemId) {
        loadItemDetails(itemId, true);
      }
    }
  });
  






const modalFixStyle = document.createElement('style');
modalFixStyle.textContent = `
  .modal-backdrop {
    z-index: 1040 !important;
  }
  .modal {
    z-index: 1050 !important;
  }
  .modal-dialog {
    z-index: 1060 !important;
  }
`;
document.head.appendChild(modalFixStyle);


async function checkServerConnection() {
    try {
      const response = await fetch(`${API_URL}/health`, { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        showAlert('Warning: Server connection issues detected. Some features may not work properly.', 'warning', 'alertContainer', false);
      }
    } catch (error) {
      console.error('Server connection check failed:', error);
      showAlert('Error: Cannot connect to server. Please check your network connection and server status.', 'danger', 'alertContainer', false);
    }
  }
  

  checkServerConnection();

// Initialize inventory data
async function initializeInventory() {
  // Check URL parameters for filters or item ID
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check if specific item ID is provided
  const itemId = urlParams.get('id');
  if (itemId) {
    await loadItemDetails(itemId);
    return;
  }
  
  // Check for filter parameters
  const filterParam = urlParams.get('filter');
  if (filterParam === 'lowstock') {
    await loadLowStockItems();
    return;
  } else if (filterParam === 'maintenance') {
    document.getElementById('statusFilter').value = 'Under Maintenance';
    await loadInventoryItems();
    return;
  }
  
  // Load all inventory items
  await loadInventoryItems();
}

// Load inventory items with filtering and pagination
async function loadInventoryItems() {
  try {
    // Show loading indicator
    document.getElementById('inventoryTable').innerHTML = '<tr><td colspan="7" class="text-center">Loading inventory...</td></tr>';
    
    // Prepare query parameters
    const searchTerm = document.getElementById('searchInput').value;
    const category = document.getElementById('categoryFilter').value;
    const status = document.getElementById('statusFilter').value;
    const locationId = document.getElementById('locationFilter').value;
    
    // Build query string
    let query = `?page=${currentPage}&limit=${itemsPerPage}`;
    
    if (searchTerm) {
      query += `&search=${encodeURIComponent(searchTerm)}`;
    }
    
    if (category) {
      query += `&category=${encodeURIComponent(category)}`;
    }
    
    if (status) {
      query += `&status=${encodeURIComponent(status)}`;
    }
    
    if (locationId) {
      query += `&location=${encodeURIComponent(locationId)}`;
    }
    
    // Save current filter for pagination
    currentFilter = { searchTerm, category, status, locationId };
    
    // Fetch inventory items
    const response = await fetchWithAuth(`${API_URL}/items${query}`);
    
    if (!response) return;
    
    if (response.ok) {
      const data = await response.json();
      updateInventoryTable(data.items);
      
      // Update pagination
      totalPages = data.pages;
      document.getElementById('itemCount').textContent = data.total;
      updatePagination();
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to load inventory', 'danger');
    }
  } catch (error) {
    console.error('Inventory loading error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
  }
}

// Load low stock items
async function loadLowStockItems() {
  try {
    // Show loading indicator
    document.getElementById('inventoryTable').innerHTML = '<tr><td colspan="7" class="text-center">Loading low stock items...</td></tr>';
    
    // Update filter UI
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('locationFilter').value = '';
    
    // Fetch low stock items
    const response = await fetchWithAuth(`${API_URL}/items/low-stock`);
    
    if (!response) return;
    
    if (response.ok) {
      const items = await response.json();
      updateInventoryTable(items);
      
      // Update item count
      document.getElementById('itemCount').textContent = items.length;
      
      // No pagination for low stock items
      document.getElementById('pagination').innerHTML = '';
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to load low stock items', 'danger');
    }
  } catch (error) {
    console.error('Low stock loading error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
  }
}




















function setupBarcodeEventListeners() {
    
    document.getElementById('quickBarcodeSearch').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission
        const barcode = this.value.trim();
        if (barcode) {
          findItemByBarcode(barcode);
          
         
          this.classList.add('highlight-scan');
          setTimeout(() => {
            this.classList.remove('highlight-scan');
          }, 300);
          
          // Play a scan sound
          playBeepSound();
        }
      }
    });
    
    // Quick scan button 
    document.getElementById('quickScanBtn').addEventListener('click', function() {
      
      document.getElementById('quickBarcodeSearch').focus();
      showAlert('Ready to scan! Use your barcode scanner now.', 'info');
    });
    
    // Quick search button
    document.getElementById('quickSearchBtn').addEventListener('click', function() {
      const barcode = document.getElementById('quickBarcodeSearch').value.trim();
      if (barcode) {
        findItemByBarcode(barcode);
      } else {
        showAlert('Please enter or scan a barcode first', 'warning');
      }
    });
    
    // Barcode type radio buttons in the item modal
    document.querySelectorAll('input[name="barcodeOption"]').forEach(radio => {
      radio.addEventListener('change', function() {
        toggleBarcodeInputMethod();
      });
    });
    
    // Scan button in the item modal
    document.getElementById('scanBarcodeBtn').addEventListener('click', function() {
   
   const itemBarcode = document.getElementById('itemBarcode');
   itemBarcode.focus();
   itemBarcode.select();
   showAlert('Ready to scan! Use your barcode scanner now.', 'info', 'itemModalAlerts', false);
   
   // Visual feedback
   itemBarcode.classList.add('focus-highlight');
   setTimeout(() => {
     itemBarcode.classList.remove('focus-highlight');
   }, 3000);
 });
    
 
  document.getElementById('itemBarcode').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      
      // Visual feedback
      this.classList.add('highlight-scan');
      setTimeout(() => {
        this.classList.remove('highlight-scan');
      }, 300);
      
      // Play a scan sound
      try {
       
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
      
      showAlert('Barcode scanned successfully!', 'success', 'itemModalAlerts', true);
    }
  });
    
    // Print barcode button
    document.getElementById('printBarcodeBtn').addEventListener('click', function() {
      // Get the item ID
      const itemId = document.getElementById('itemId').value;
      

      if (itemId) {
        fetchWithAuth(`${API_URL}/items/${itemId}`)
          .then(response => {
            if (response.ok) {
              return response.json();
            } else {
              throw new Error('Failed to fetch item data');
            }
          })
          .then(item => {
            printBarcode(item);
          })
          .catch(error => {
            console.error('Error fetching item for printing:', error);
            showAlert('Error preparing barcode for printing', 'danger');
          });
      } else {
       
        showAlert('Please save the item first before printing the barcode', 'warning');
      }
    });
    
    // Print item details button
    document.getElementById('printItemDetailsBtn').addEventListener('click', function() {
      const itemId = document.getElementById('itemId').value;
      
      if (itemId) {
        fetchWithAuth(`${API_URL}/items/${itemId}`)
          .then(response => {
            if (response.ok) {
              return response.json();
            } else {
              throw new Error('Failed to fetch item data');
            }
          })
          .then(item => {
            printItemDetails(item);
          })
          .catch(error => {
            console.error('Error fetching item for printing:', error);
            showAlert('Error preparing item details for printing', 'danger');
          });
      } else {
        showAlert('Please save the item first before printing details', 'warning');
      }
    });
    
  
    document.addEventListener('keydown', function(e) {
    
      if (document.querySelector('.modal.show')) {
        return;
      }
      
      
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA' || 
          document.activeElement.tagName === 'SELECT') {
        return;
      }
      

      if (e.key.length === 1 && e.key.match(/[a-z0-9]/i)) {
        const quickBarcodeSearch = document.getElementById('quickBarcodeSearch');
        quickBarcodeSearch.focus();
      
      }
    });
  }



function playBeepSound() {
    try {

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 1000;
      gainNode.gain.value = 0.1; 
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      setTimeout(function() {
        oscillator.stop();
      }, 100); 
    } catch (e) {
      console.log('Beep sound not supported');
    }
  }




function toggleBarcodeInputMethod() {
    const isScanExisting = document.getElementById('scanExisting').checked;
    const scanBarcodeSection = document.getElementById('scanBarcodeSection');
    const generatedBarcodeSection = document.getElementById('generatedBarcodeSection');
    
    if (!scanBarcodeSection || !generatedBarcodeSection) {
      console.error('Barcode sections not found in the DOM');
      return;
    }

    
  document.activeElement.blur();
    
    if (isScanExisting) {
      scanBarcodeSection.classList.remove('d-none');
      generatedBarcodeSection.classList.add('d-none');
     
      const previewSection = document.getElementById('previewGeneratedBarcode');
      if (previewSection) {
        previewSection.classList.add('d-none');
      }
    } else {
      scanBarcodeSection.classList.add('d-none');
      generatedBarcodeSection.classList.remove('d-none');
      
     
      const itemId = document.getElementById('itemId').value;
      const currentBarcodeDisplay = document.getElementById('currentBarcodeDisplay');
      
  
      if (!itemId || (itemId && currentBarcodeDisplay.classList.contains('d-none'))) {
      
        previewGeneratedBarcode();
      } else {
       
        const previewSection = document.getElementById('previewGeneratedBarcode');
        if (previewSection) {
          previewSection.classList.add('d-none');
        }
      }
    }
  }


  function previewGeneratedBarcode() {

    if (!generatedBarcode) {
      const prefix = 'CIME';
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      generatedBarcode = `${prefix}-${timestamp.substring(timestamp.length - 6)}-${random}`;
    }
    

    document.getElementById('previewGeneratedBarcode').classList.remove('d-none');
    document.getElementById('generatedBarcodeValue').textContent = generatedBarcode;
      
    if (typeof JsBarcode !== 'undefined') {
      try {
     
        const canvas = document.createElement('canvas');
        document.getElementById('generatedBarcodeImage').innerHTML = '';
        document.getElementById('generatedBarcodeImage').appendChild(canvas);
        
        JsBarcode(canvas, generatedBarcode, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 50,
          displayValue: false
        });
      } catch (error) {
        console.error('Error generating barcode preview:', error);
        document.getElementById('generatedBarcodeImage').innerHTML = 
          '<div class="alert alert-warning">Error generating preview</div>';
      }
    }
  }




  function startBarcodeScanner(previewElementId, targetInputId) {
    try {
    
      if (activeScanner && activeScannerElementId) {
        try {
          activeScanner.stop();
        } catch (e) {
          console.error('Error stopping previous scanner:', e);
        }
        activeScanner = null;
      }
      
      const scannerPreview = document.getElementById(previewElementId);
      scannerPreview.classList.remove('d-none');
      scannerPreview.innerHTML = '<div class="text-center p-3"><span class="spinner-border spinner-border-sm me-2"></span> Starting camera...</div>';
      

      if (typeof Html5Qrcode === 'undefined') {
        scannerPreview.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Barcode scanner library not loaded. Please refresh the page and try again.
          </div>`;
        return;
      }
      
     
      activeScanner = new Html5Qrcode(previewElementId);
      activeScannerElementId = previewElementId;
      activeScannerTargetId = targetInputId;
      
      const config = { fps: 10, qrbox: { width: 250, height: 150 } };
      
      activeScanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Set the decoded text to the target input
          document.getElementById(targetInputId).value = decodedText;
          
          // Stop the scanner
          stopBarcodeScanner(function() {
            // Show success message
            showAlert(`Barcode scanned successfully: ${decodedText}`, 'success');
          });
        },
        (errorMessage) => {
          console.error(`Barcode scanning error: ${errorMessage}`);
        }
      ).catch((err) => {
        console.error(`Unable to start scanning: ${err}`);
        scannerPreview.innerHTML = `
          <div class="alert alert-danger">
            <p><i class="fas fa-exclamation-triangle me-2"></i> Camera access error</p>
            <p class="mb-0 small">Please ensure you've granted camera permissions and try again.</p>
          </div>`;
      });
    } catch (error) {
      console.error('Error starting scanner:', error);
      document.getElementById(previewElementId).innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Scanner error: ${error.message}
        </div>`;
    }
  }




  
// function startBarcodeScanner(previewElementId, targetInputId) {
//     try {
//       // If there's already an active scanner, stop it first
//       if (activeScanner && activeScannerElementId) {
//         try {
//           activeScanner.stop();
//         } catch (e) {
//           console.error('Error stopping previous scanner:', e);
//         }
//         activeScanner = null;
//       }
      
//       const scannerPreview = document.getElementById(previewElementId);
//       scannerPreview.classList.remove('d-none');
//       scannerPreview.innerHTML = '<div class="text-center p-3"><span class="spinner-border spinner-border-sm me-2"></span> Starting camera...</div>';
      
//       // Check if Html5Qrcode is loaded
//       if (typeof Html5Qrcode === 'undefined') {
//         scannerPreview.innerHTML = `
//           <div class="alert alert-danger">
//             <i class="fas fa-exclamation-triangle me-2"></i>
//             Barcode scanner library not loaded. Please refresh the page and try again.
//           </div>`;
//         return;
//       }
      
//       // Create a new scanner instance
//       activeScanner = new Html5Qrcode(previewElementId);
//       activeScannerElementId = previewElementId;
//       activeScannerTargetId = targetInputId;
      
//       const config = { fps: 10, qrbox: { width: 250, height: 150 } };
      
//       activeScanner.start(
//         { facingMode: "environment" },
//         config,
//         (decodedText) => {
//           // Set the decoded text to the target input
//           document.getElementById(targetInputId).value = decodedText;
          
//           // Stop the scanner
//           stopBarcodeScanner(function() {
//             // Show success message
//             showAlert(`Barcode scanned successfully: ${decodedText}`, 'success');
//           });
//         },
//         (errorMessage) => {
//           console.error(`Barcode scanning error: ${errorMessage}`);
//         }
//       ).catch((err) => {
//         console.error(`Unable to start scanning: ${err}`);
//         scannerPreview.innerHTML = `
//           <div class="alert alert-danger">
//             <p><i class="fas fa-exclamation-triangle me-2"></i> Camera access error</p>
//             <p class="mb-0 small">Please ensure you've granted camera permissions and try again.</p>
//           </div>`;
//       });
//     } catch (error) {
//       console.error('Error starting scanner:', error);
//       document.getElementById(previewElementId).innerHTML = `
//         <div class="alert alert-danger">
//           <i class="fas fa-exclamation-triangle me-2"></i>
//           Scanner error: ${error.message}
//         </div>`;
//     }
//   }





function stopBarcodeScanner(callback) {
    if (!activeScanner) {
      if (callback) callback();
      return;
    }
    
    try {
      activeScanner.stop().then(() => {
        const scannerPreview = document.getElementById(activeScannerElementId);
        if (scannerPreview) {
          scannerPreview.classList.add('d-none');
        }
        
        activeScanner = null;
        activeScannerElementId = null;
        
        if (callback) callback();
      }).catch(err => {
        console.error('Error stopping scanner:', err);
        if (callback) callback();
      });
    } catch (e) {
      console.error('Exception when stopping scanner:', e);
      activeScanner = null;
      activeScannerElementId = null;
      if (callback) callback();
    }
  }



  function showQuickScanModal() {
   
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'quickScanModal';
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="fas fa-barcode me-2"></i>Scan Barcode</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div id="quickScannerPreview" style="width: 100%; min-height: 300px;" class="border rounded">
              <div class="text-center p-5">
                <span class="spinner-border text-primary"></span>
                <p class="mt-3">Starting camera...</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
   
    const modalInstance = new bootstrap.Modal(document.getElementById('quickScanModal'));
    modalInstance.show();
    

    document.getElementById('quickScanModal').addEventListener('shown.bs.modal', () => {
    
      const html5QrCode = new Html5Qrcode("quickScannerPreview");
      
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
       
          try {
            await html5QrCode.stop();
          } catch (e) {
            console.error('Error stopping scanner:', e);
          }
          
        
          modalInstance.hide();
          
         
          findItemByBarcode(decodedText);
        },
        (error) => {
          console.error(error);
        }
      ).catch((err) => {
        console.error(err);
        document.getElementById('quickScannerPreview').innerHTML = `
          <div class="alert alert-danger">
            <p><i class="fas fa-exclamation-triangle me-2"></i> Camera access error</p>
            <p class="mb-0">Please ensure you've granted camera permissions.</p>
          </div>
        `;
      });
    });
    
  
    document.getElementById('quickScanModal').addEventListener('hidden.bs.modal', async () => {
      try {
        const html5QrCode = new Html5Qrcode("quickScannerPreview");
        if (html5QrCode) {
          await html5QrCode.stop();
        }
      } catch (e) {
        console.error(e);
      }
      
      
      try {
        document.body.removeChild(document.getElementById('quickScanModal'));
      } catch (e) {
        console.error('Error removing modal:', e);
      }
    });
  }


//   function findItemByBarcode(barcode) {
//     try {
//       showAlert(`Searching for item with barcode: ${barcode}...`, 'info');
      
//       fetchWithAuth(`${API_URL}/items/barcode/${encodeURIComponent(barcode)}`)
//         .then(response => {
//           if (!response) {
//             showAlert('Failed to connect to server', 'danger');
//             return;
//           }
          
//           if (response.ok) {
//             response.json().then(item => {
//               // Open the item details modal
//               openItemModal(item, false);
              
//               // Show success message
//               showAlert(`Item found: ${item.name}`, 'success');
//             });
//           } else if (response.status === 404) {
//             showAlert('No item found with this barcode', 'warning');
//           } else {
//             response.json().then(errorData => {
//               showAlert(errorData.message || 'Error searching for item', 'danger');
//             }).catch(() => {
//               showAlert('Error searching for item', 'danger');
//             });
//           }
//         })
//         .catch(error => {
//           console.error('Barcode lookup error:', error);
//           showAlert('Failed to connect to server', 'danger');
//         });
//     } catch (error) {
//       console.error('Barcode lookup error:', error);
//       showAlert('Failed to connect to server', 'danger');
//     }
//   }



async function findItemByBarcode(barcode) {
    try {
      showAlert(`Searching for item with barcode: ${barcode}...`, 'info');
      
      const response = await fetchWithAuth(`${API_URL}/items/barcode/${encodeURIComponent(barcode)}`);
      
      if (!response) {
        showAlert('Failed to connect to server', 'danger');
        return;
      }
      
      if (response.ok) {
        const item = await response.json();
        
   
        openItemModal(item, false);
        
     
        showAlert(`Item found: ${item.name}`, 'success');
      } else if (response.status === 404) {
        showAlert('No item found with this barcode', 'warning');
      } else {
        const errorData = await response.json();
        showAlert(errorData.message || 'Error searching for item', 'danger');
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      showAlert('Failed to connect to server', 'danger');
    }
  }
  

  function printBarcode(item) {
    if (!item || !item.barcode) {
      showAlert('No barcode available to print', 'warning');
      return;
    }
    
    const barcode = item.barcode;
    const itemName = item.name;
    const category = item.category || '';
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showAlert('Please allow pop-ups to print barcodes', 'warning');
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - ${itemName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 15mm;
            margin: 0;
          }
          .barcode-container {
            border: 1px solid #ddd;
            display: inline-block;
            padding: 10mm;
            width: 80mm;
            background: white;
          }
          .item-name {
            font-weight: bold;
            font-size: 14pt;
            margin-bottom: 5mm;
          }
          .item-category {
            font-size: 10pt;
            color: #666;
            margin-bottom: 8mm;
          }
          .barcode-image {
            margin: 10mm 0;
            padding: 5mm;
            background: white;
          }
          .barcode-value {
            font-family: monospace;
            font-size: 14pt;
            font-weight: bold;
            letter-spacing: 1pt;
            margin-top: 5mm;
          }
          @media print {
            body {
              padding: 0;
            }
            .barcode-container {
              border: none;
              width: 100%;
              padding: 5mm;
            }
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="barcode-container">
          <div class="item-name">${itemName}</div>
          <div class="item-category">${category}</div>
          <div class="barcode-image">
            <canvas id="barcodeCanvas"></canvas>
          </div>
          <div class="barcode-value">${barcode}</div>
        </div>
        <script>
          window.onload = function() {
            try {
              // Use CODE128 format with specific settings for physical scanners
              JsBarcode("#barcodeCanvas", "${barcode}", {
                format: "CODE128",
                lineColor: "#000000",
                width: 3,           // Much wider lines
                height: 100,        // Much taller barcode
                displayValue: false,
                margin: 20,         // Larger margins
                background: "#FFFFFF" // Ensure white background
              });
              
              // Print after ensuring barcode is rendered
              setTimeout(function() {
                window.print();
                window.setTimeout(function() {
                  window.close();
                }, 1000);
              }, 500);
            } catch (e) {
              document.body.innerHTML = '<div style="color:red; padding:20px;">' + 
                '<h2>Error Generating Barcode</h2>' +
                '<p>' + e.message + '</p>' +
                '<p>Please try again or contact support.</p>' +
                '</div>';
            }
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  }



  function printItemDetails(item) {
    if (!item) {
      showAlert('No item data available to print', 'warning');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showAlert('Please allow pop-ups to print item details', 'warning');
      return;
    }
    
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
    
    // Format dates
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString();
    };
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Item Details - ${item.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0 0;
            color: #666;
          }
          .barcode {
            text-align: center;
            margin-bottom: 20px;
          }
          .barcode-value {
            font-family: monospace;
            margin-top: 5px;
          }
          .detail-section {
            margin-bottom: 20px;
          }
          .detail-section h2 {
            font-size: 18px;
            margin: 0 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
          }
          .detail-row {
            display: flex;
            margin-bottom: 8px;
          }
          .detail-label {
            font-weight: bold;
            width: 180px;
            flex-shrink: 0;
          }
          .detail-value {
            flex-grow: 1;
          }
          .description {
            margin-top: 15px;
          }
          .description h3 {
            font-size: 16px;
            margin-bottom: 5px;
          }
          .description p {
            margin-top: 0;
            white-space: pre-line;
          }
          
          @media print {
            body {
              padding: 15mm;
            }
            .header {
              margin-bottom: 15mm;
            }
            .detail-section {
              margin-bottom: 10mm;
            }
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="header">
          <h1>${item.name}</h1>
          <p>${item.category}</p>
        </div>
        
        ${item.barcode ? `
        <div class="barcode">
          <canvas id="barcodeCanvas"></canvas>
          <div class="barcode-value">${item.barcode}</div>
        </div>
        ` : ''}
        
        <div class="detail-section">
          <h2>Basic Information</h2>
          <div class="detail-row">
            <div class="detail-label">Status:</div>
            <div class="detail-value">${item.status}</div>
          </div>
         <div class="detail-row">
  <div class="detail-label">AKU No.:</div>
  <div class="detail-value">${item.akuNo || 'N/A'}</div>
</div>
          <div class="detail-row">
            <div class="detail-label">Manufacturer:</div>
            <div class="detail-value">${item.manufacturer || 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Supplier:</div>
            <div class="detail-value">${item.supplier ? item.supplier.name : 'N/A'}</div>
          </div>
        </div>
        
        <div class="detail-section">
          <h2>Inventory Details</h2>
          <div class="detail-row">
            <div class="detail-label">Quantity:</div>
            <div class="detail-value">${item.quantity} ${item.unit}${item.quantity <= item.reorderLevel ? ' (Low Stock)' : ''}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Unit Cost:</div>
            <div class="detail-value">KES ${item.unitCost ? item.unitCost.toLocaleString() : '0'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Total Value:</div>
            <div class="detail-value">KES ${(item.quantity * item.unitCost).toLocaleString()}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Reorder Level:</div>
            <div class="detail-value">${item.reorderLevel} ${item.unit}</div>
          </div>
        </div>
        
        <div class="detail-section">
          <h2>Location</h2>
          <div class="detail-row">
            <div class="detail-label">Storage Location:</div>
            <div class="detail-value">${location}</div>
          </div>
        </div>
        
        <div class="detail-section">
          <h2>Dates</h2>
          <div class="detail-row">
            <div class="detail-label">Purchase Date:</div>
            <div class="detail-value">${formatDate(item.purchaseDate)}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Last Maintenance:</div>
            <div class="detail-value">${formatDate(item.lastMaintenanceDate)}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Next Maintenance:</div>
            <div class="detail-value">${formatDate(item.nextMaintenanceDate)}</div>
          </div>
        </div>
        
        ${item.description ? `
        <div class="detail-section">
          <h2>Description</h2>
          <p>${item.description}</p>
        </div>
        ` : ''}
        
        ${item.notes ? `
        <div class="detail-section">
          <h2>Notes</h2>
          <p>${item.notes}</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; font-size: 12px; margin-top: 40px; color: #999;">
          <p>Printed on ${new Date().toLocaleString()}</p>
        </div>
        
        <script>
          window.onload = function() {
            ${item.barcode ? `
            try {
              // Generate barcode
              JsBarcode("#barcodeCanvas", "${item.barcode}", {
                format: "CODE128",
                lineColor: "#000",
                width: 2,
                height: 50,
                displayValue: false
              });
            } catch (e) {
              console.error('Error generating barcode:', e);
            }` : ''}
            
            // Print after a short delay 
            setTimeout(function() {
              window.print();
              window.setTimeout(function() {
                window.close();
              }, 750);
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  }




function updateInventoryTable(items) {
  const tableBody = document.getElementById('inventoryTable');
  
  if (!items || items.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No items found</td></tr>';
    return;
  }
  
  let html = '';
  
  items.forEach(item => {
    const location = getFormattedLocation(item);
    
   
    const availableQuantity = item.availableQuantity !== undefined ? 
      item.availableQuantity : item.quantity;
    

    let statusDisplay = item.status;
    let statusClass = getStatusBadgeClass(item.status);
    
    
    if (item.status === 'Partially Available' && item.category !== 'Consumable') {
      statusDisplay = `${availableQuantity}/${item.quantity} Available`;
    }
    
    const isLowStock = item.quantity <= item.reorderLevel;
    
    html += `
      <tr data-id="${item._id}">
        <td>
          <div class="form-check">
            <input class="form-check-input item-checkbox" type="checkbox" value="${item._id}">
          </div>
        </td>
        <td>
          <div class="d-flex align-items-center">
            <div>
              <h6 class="mb-0">${item.name}</h6>
              <small class="text-muted">${item.akuNo || 'No S/N'}</small>
            </div>
          </div>
        </td>
        <td>${item.category}</td>
        <td>
          <div>
            <span class="${isLowStock ? 'text-danger fw-bold' : ''}">${item.quantity} ${item.unit}</span>
            ${item.category !== 'Consumable' && availableQuantity !== item.quantity ? 
              `<br><small class="text-muted">(${availableQuantity} available)</small>` : ''}
            ${isLowStock ? '<span class="badge bg-danger ms-1">Low</span>' : ''}
          </div>
        </td>
        <td>
          <span class="${statusClass}">${statusDisplay}</span>
        </td>
        <td>${location}</td>
        <td>
          <div class="btn-group">
            <button type="button" class="btn btn-sm btn-outline-primary view-btn" data-id="${item._id}">
              <i class="fas fa-eye"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-success transaction-btn" data-id="${item._id}" data-name="${item.name}">
              <i class="fas fa-exchange-alt"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary edit-btn manager-only ${!isInventoryManager() ? 'd-none' : ''}" data-id="${item._id}">
              <i class="fas fa-edit"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger delete-btn admin-only ${!isAdmin() ? 'd-none' : ''}" data-id="${item._id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;



    
    
  });
  
  tableBody.innerHTML = html;
  
 
  setupActionButtons();
}

// function setupActionButtons() {
//   document.querySelectorAll('.view-btn').forEach(btn => {
//     btn.addEventListener('click', () => {
//       loadItemDetails(btn.dataset.id);
//     });
//   });
  
//   document.querySelectorAll('.edit-btn').forEach(btn => {
//     btn.addEventListener('click', () => {
//       loadItemDetails(btn.dataset.id, true);
//     });
//   });
  
//   document.querySelectorAll('.transaction-btn').forEach(btn => {
//     btn.addEventListener('click', (e) => {
//       e.preventDefault();
//       e.stopPropagation();
//       const itemId = btn.dataset.id;
//       const itemName = btn.dataset.name;
      
//       if (itemId && itemName) {
       
//         fetchItemForTransaction(itemId); 
//       }
//     });
//   });
  
//   document.querySelectorAll('.delete-btn').forEach(btn => {
//     btn.addEventListener('click', () => {
//       if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
//         deleteItem(btn.dataset.id);
//       }
//     });
//   });
// }


function updatePagination() {
  const paginationEl = document.getElementById('pagination');
  
  paginationEl.innerHTML = '';
  
  if (totalPages <= 1) return;
  
  const paginationNav = createPagination(currentPage, totalPages, (page) => {
    currentPage = page;
    loadInventoryItems();
   
    document.querySelector('.card').scrollIntoView({ behavior: 'smooth' });
  });
  
  paginationEl.appendChild(paginationNav);
}


async function loadLocationsAndSuppliers() {
  try {
  
   fetchWithAuth(`${API_URL}/locations/hierarchy`)
   .then(response => {
     if (response && response.ok) {
       return response.json();
     }
     return [];
   })
   .then(data => {
     locationHierarchy = data;
     
     
     const locationFilter = document.getElementById('locationFilter');
     locationFilter.innerHTML = '<option value="">All Locations</option>';
     
     locationHierarchy.forEach(room => {
       locationFilter.innerHTML += `<option value="${room._id}">${room.name}</option>`;
     });
     
    
     const roomSelect = document.getElementById('itemRoom');
     roomSelect.innerHTML = '<option value="">Select Room</option>';
     
     locationHierarchy.forEach(room => {
       roomSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
     });
     
  
     roomSelect.addEventListener('change', () => {
       populateRackDropdown(roomSelect.value);
       
       
       document.getElementById('itemShelf').innerHTML = '<option value="">Select Shelf</option>';
       document.getElementById('itemShelf').disabled = true;
     });
   });
    

    const suppliersResponse = await fetchWithAuth(`${API_URL}/suppliers`);
    
    if (suppliersResponse && suppliersResponse.ok) {
      suppliers = await suppliersResponse.json();
      
  
      const supplierSelect = document.getElementById('itemSupplier');
      supplierSelect.innerHTML = '<option value="">Select Supplier</option>';
      
      suppliers.forEach(supplier => {
        supplierSelect.innerHTML += `<option value="${supplier._id}">${supplier.name}</option>`;
      });
    }
  } catch (error) {
    console.error('Error loading form data:', error);
  }
}


function populateLocationDropdowns() {

  const locationFilter = document.getElementById('locationFilter');
  locationFilter.innerHTML = '<option value="">All Locations</option>';
  
  locationHierarchy.forEach(room => {
    locationFilter.innerHTML += `<option value="${room._id}">${room.name}</option>`;
  });
  
  const roomSelect = document.getElementById('itemRoom');
  roomSelect.innerHTML = '<option value="">Select Room</option>';
  
  locationHierarchy.forEach(room => {
    roomSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
  });
  
 
  const fromLocationSelect = document.getElementById('transactionFromLocation');
  const toLocationSelect = document.getElementById('transactionToLocation');
  
  fromLocationSelect.innerHTML = '<option value="">Select Location</option>';
  toLocationSelect.innerHTML = '<option value="">Select Location</option>';
  
  locationHierarchy.forEach(room => {
    fromLocationSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
    toLocationSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
  });
  
  
  roomSelect.addEventListener('change', () => {
    populateRackDropdown(roomSelect.value);
  });
}


function populateRackDropdown(roomId) {
  const rackSelect = document.getElementById('itemRack');
  rackSelect.innerHTML = '<option value="">Select Rack</option>';
  
  if (!roomId) {
    rackSelect.disabled = true;
    document.getElementById('itemShelf').disabled = true;
    return;
  }
  
  
  const room = locationHierarchy.find(r => r._id === roomId);
  
  if (room && room.racks && room.racks.length > 0) {
    rackSelect.disabled = false;
    
    room.racks.forEach(rack => {
   
      rackSelect.innerHTML += `<option value="${rack._id}">${rack.name} (in ${room.name})</option>`;
    });
    
    
    rackSelect.addEventListener('change', () => {
      populateShelfDropdown(roomId, rackSelect.value);
    });
  } else {
    rackSelect.disabled = true;
    document.getElementById('itemShelf').disabled = true;
  }
}


function populateShelfDropdown(roomId, rackId) {
  const shelfSelect = document.getElementById('itemShelf');
  shelfSelect.innerHTML = '<option value="">Select Shelf</option>';
  
  if (!rackId) {
    shelfSelect.disabled = true;
    return;
  }
  

  const room = locationHierarchy.find(r => r._id === roomId);
  
  if (!room) {
    shelfSelect.disabled = true;
    return;
  }
  
 
  const rack = room.racks.find(r => r._id === rackId);
  
  if (rack && rack.shelves && rack.shelves.length > 0) {
    shelfSelect.disabled = false;
    
    rack.shelves.forEach(shelf => {
     
      shelfSelect.innerHTML += `<option value="${shelf._id}">${shelf.name} (in ${rack.name}, ${room.name})</option>`;
    });
  } else {
    shelfSelect.disabled = true;
  }
}


function getFormattedLocation(item) {
  if (!item.location) return 'N/A';
  
  let location = '';
  
  if (item.location.room && item.location.room.name) {
    location += item.location.room.name;
  }
  
  if (item.location.rack && item.location.rack.name) {
    location += ` → ${item.location.rack.name}`;
  }
  
  if (item.location.shelf && item.location.shelf.name) {
    location += ` → ${item.location.shelf.name}`;
  }
  
  return location || 'N/A';
}


async function loadItemDetails(itemId, isEdit = false) {
    try {
      
      showAlert('Loading item details...', 'info', 'alertContainer', false);
      
      const response = await fetchWithAuth(`${API_URL}/items/${itemId}`);
      
      if (!response) return;
      
      if (response.ok) {
        const item = await response.json();
        
      
        document.getElementById('alertContainer').innerHTML = '';
        
        
        openItemModal(item, isEdit);
      } else {
        const errorData = await response.json();
        showAlert(errorData.message || 'Failed to load item details', 'danger');
      }
    } catch (error) {
      console.error('Item details loading error:', error);
      showAlert('Failed to connect to server. Please try again.', 'danger');
    }
  }


function openItemModal(item, isEdit = false) {
  try {


  itemImageChanged = false;
  


     
  document.getElementById('itemCategory').value = item.category || '';
  updateFormFieldsBasedOnCategory(item.category || '');



const changeBarcode = document.getElementById('changeBarcode');
if (changeBarcode) {
  changeBarcode.checked = false;
}


const newBarcodeForm = document.getElementById('newBarcodeForm');
if (newBarcodeForm) {
  newBarcodeForm.classList.add('d-none');
}


    const modal = document.getElementById('itemModal');
    const modalTitle = document.getElementById('itemModalTitle');
    const form = document.getElementById('itemForm');
    const saveBtn = document.getElementById('saveItemBtn');
    
   
    if (!modal || !modalTitle || !form || !saveBtn) {
      console.error('Required modal elements not found');
      showAlert('Error loading item modal. Please refresh the page and try again.', 'danger');
      return;
    }
    
   
    generatedBarcode = null;
    
 
    modalTitle.textContent = isEdit ? 'Edit Item' : 'Item Details';
    
    
    document.getElementById('itemId').value = item._id || '';
    document.getElementById('itemName').value = item.name || '';
    // document.getElementById('itemCategory').value = item.category || '';

    const categorySelect = document.getElementById('itemCategory');
    const customCategoryGroup = document.getElementById('customCategoryGroup');
    const customCategoryInput = document.getElementById('customCategory');
    
    // Check if the item's category matches any of our predefined options
    const predefinedCategories = ['Task Trainer', 'Manikin', 'Consumable', 'Electronic', 'Other'];
    
    if (predefinedCategories.includes(item.category)) {
      
      categorySelect.value = item.category;
      if (customCategoryGroup) customCategoryGroup.style.display = 'none';
    } else {
     
      categorySelect.value = 'Other';
      if (customCategoryGroup) customCategoryGroup.style.display = 'block';
      if (customCategoryInput) customCategoryInput.value = item.category;
    }

    document.getElementById('itemStatus').value = item.status || 'Available';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemAkuNo').value = item.akuNo || '';
    document.getElementById('itemManufacturer').value = item.manufacturer || '';
    document.getElementById('itemSupplier').value = item.supplier ? item.supplier._id : '';
    document.getElementById('itemQuantity').value = item.quantity || 1;
    document.getElementById('itemUnit').value = item.unit || 'piece';
    document.getElementById('itemUnitCost').value = item.unitCost || 0;
    document.getElementById('itemReorderLevel').value = item.reorderLevel || 5;
    
    // Set location values and populate dropdowns
    if (item.location) {
      if (item.location.room) {
        document.getElementById('itemRoom').value = item.location.room._id || '';
      
        populateRackDropdown(item.location.room._id);
        
       
        setTimeout(() => {
          if (item.location.rack) {
            document.getElementById('itemRack').value = item.location.rack._id || '';
            populateShelfDropdown(item.location.room._id, item.location.rack._id);
            
           
            setTimeout(() => {
              if (item.location.shelf) {
                document.getElementById('itemShelf').value = item.location.shelf._id || '';
              }
            }, 100);
          }
        }, 100);
      }
    }
    
    
    if (item.purchaseDate) {
      document.getElementById('itemPurchaseDate').value = new Date(item.purchaseDate).toISOString().split('T')[0];
    } else {
      document.getElementById('itemPurchaseDate').value = '';
    }
    
    if (item.lastMaintenanceDate) {
      document.getElementById('itemLastMaintenanceDate').value = new Date(item.lastMaintenanceDate).toISOString().split('T')[0];
    } else {
      document.getElementById('itemLastMaintenanceDate').value = '';
    }
    
    if (item.nextMaintenanceDate) {
      document.getElementById('itemNextMaintenanceDate').value = new Date(item.nextMaintenanceDate).toISOString().split('T')[0];
    } else {
      document.getElementById('itemNextMaintenanceDate').value = '';
    }
    
    document.getElementById('itemNotes').value = item.notes || '';
    
   
    const barcodeRow = document.getElementById('barcodeRow');
    if (barcodeRow) {
      barcodeRow.style.display = 'block';
    }
    
    const currentBarcodeDisplay = document.getElementById('currentBarcodeDisplay');
    const barcodeOptionsSection = document.getElementById('barcodeOptionsSection');
    const changeBarcodeSection = document.getElementById('changeBarcodeSection');
    const newBarcodeOptionsSection = document.getElementById('newBarcodeOptionsSection');
    
    // Default value for barcode input
    document.getElementById('itemBarcode').value = item.barcode || '';
    
    if (item._id && item.barcode) {
      // EXISTING ITEM WITH BARCODE
      
      // 1. Show current barcode
      if (currentBarcodeDisplay) {
        currentBarcodeDisplay.classList.remove('d-none');
        document.getElementById('currentBarcodeValue').textContent = item.barcode;
        
        // Display barcode type
        const barcodeTypeText = item.barcodeType === 'existing' ? 
          'Manufacturer Barcode' : 'Generated System Barcode';
        document.getElementById('currentBarcodeType').textContent = barcodeTypeText;
        
        // Display barcode image
        try {
          const currentBarcodeImage = document.getElementById('currentBarcodeImage');
          currentBarcodeImage.innerHTML = '';
          
          if (typeof JsBarcode !== 'undefined') {
            const canvas = document.createElement('canvas');
            currentBarcodeImage.appendChild(canvas);
            
            JsBarcode(canvas, item.barcode, {
              format: "CODE128",
      lineColor: "#000000",
      width: 2,
      height: 60,
      displayValue: false,
      margin: 10,
      background: "#FFFFFF"
    });
  }
} catch (error) {
          console.error('Error generating barcode display:', error);
        }
      }
      
      // 2. For edit mode, show change barcode option
      if (isEdit) {
        // Hide original barcode options and show change option
        if (barcodeOptionsSection) barcodeOptionsSection.classList.add('d-none');
        if (changeBarcodeSection) changeBarcodeSection.classList.remove('d-none');
      } else {
        // View mode 
        if (barcodeOptionsSection) barcodeOptionsSection.classList.add('d-none');
        if (changeBarcodeSection) changeBarcodeSection.classList.add('d-none');
      }
    } else if (item._id && !item.barcode) {
     
      
   
      if (currentBarcodeDisplay) currentBarcodeDisplay.classList.add('d-none');
      
    
      if (isEdit) {
        if (barcodeOptionsSection) barcodeOptionsSection.classList.remove('d-none');
        if (newBarcodeOptionsSection) newBarcodeOptionsSection.classList.remove('d-none');
        if (changeBarcodeSection) changeBarcodeSection.classList.add('d-none');
        
       
        document.getElementById('scanExisting').checked = true;
        document.getElementById('generateNew').checked = false;
        toggleBarcodeInputMethod();
      } else {
       
        if (barcodeOptionsSection) barcodeOptionsSection.classList.add('d-none');
      }
    } else {
      
      
      if (currentBarcodeDisplay) currentBarcodeDisplay.classList.add('d-none');
      if (changeBarcodeSection) changeBarcodeSection.classList.add('d-none');
      
      if (barcodeOptionsSection) barcodeOptionsSection.classList.remove('d-none');
      if (newBarcodeOptionsSection) newBarcodeOptionsSection.classList.remove('d-none');
      
      
      document.getElementById('scanExisting').checked = false;
      document.getElementById('generateNew').checked = true;
      toggleBarcodeInputMethod();
    }
    

    const formFields = form.querySelectorAll('input, textarea, select');
    formFields.forEach(field => {
      field.readOnly = !isEdit;
      if (field.tagName === 'SELECT') {
        field.disabled = !isEdit;
      }
    });
    
    
    saveBtn.style.display = isEdit ? 'block' : 'none';
    
  
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
  } catch (error) {
    console.error('Error in openItemModal:', error);
    showAlert('Error loading item details. Please try again.', 'danger');
  }
}



function updateCategoryOptions() {
  const categorySelect = document.getElementById('itemCategory');
  

  categorySelect.innerHTML = '';
  
  
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select Category';
  categorySelect.appendChild(defaultOption);
  
  
  const categories = [
    { value: 'Task Trainer', label: 'Task Trainer' },
    { value: 'Manikin', label: 'Manikin' },
    { value: 'Consumable', label: 'Consumable' },
    { value: 'Electronic', label: 'Electronic Device' }, 
    { value: 'Other', label: 'Other (Custom)' }
  ];
  

  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.value;
    option.textContent = category.label;
    categorySelect.appendChild(option);
  });
}


document.addEventListener('DOMContentLoaded', function() {
  updateCategoryOptions();

  setupImprovedTransactionButtons();

   
    setTimeout(replaceTransactionButtons, 500);
  

  const categorySelect = document.getElementById('itemCategory');
  const customCategoryGroup = document.getElementById('customCategoryGroup');
  
  if (categorySelect && customCategoryGroup) {
    categorySelect.addEventListener('change', function() {
      if (this.value === 'Other') {
        customCategoryGroup.style.display = 'block';
        document.getElementById('customCategory').setAttribute('required', 'required');
      } else {
        customCategoryGroup.style.display = 'none';
        document.getElementById('customCategory').removeAttribute('required');
      }
      
      // Update other form fields based on category
      updateFormFieldsBasedOnCategory(this.value);
    });
  }
});
  
  // Helper function to safely set element values
  function setElementValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = value;
      } else if (element.tagName === 'SELECT') {
        element.value = value;
      } else {
        element.textContent = value;
      }
    }
  }
  
 
  function toggleBarcodeInputMethod() {

    const scanExisting = document.getElementById('scanExisting');
    const scanBarcodeSection = document.getElementById('scanBarcodeSection');
    const generatedBarcodeSection = document.getElementById('generatedBarcodeSection');
    
    // Check if necessary elements exist
    if (!scanExisting || !scanBarcodeSection || !generatedBarcodeSection) {
      console.error('Barcode sections not found in the DOM', {
        scanExisting,
        scanBarcodeSection,
        generatedBarcodeSection
      });
      return;
    }
    
    const isScanExisting = scanExisting.checked;
    
    if (isScanExisting) {
      scanBarcodeSection.classList.remove('d-none');
      generatedBarcodeSection.classList.add('d-none');
    
      const previewSection = document.getElementById('previewGeneratedBarcode');
      if (previewSection) {
        previewSection.classList.add('d-none');
      }
    } else {
      scanBarcodeSection.classList.add('d-none');
      generatedBarcodeSection.classList.remove('d-none');
      

      try {
     
        previewGeneratedBarcode();
      } catch (e) {
        console.error('Error generating barcode preview:', e);
      }
    }
  }




  function toggleChangeBarcode() {
    const changeBarcode = document.getElementById('changeBarcode');
    const newBarcodeForm = document.getElementById('newBarcodeForm');
    
    if (changeBarcode && newBarcodeForm) {
      if (changeBarcode.checked) {
        newBarcodeForm.classList.remove('d-none');
        
     
        const useExistingBarcode = document.getElementById('useExistingBarcode');
        const generateNewBarcode = document.getElementById('generateNewBarcode');
        
        if (useExistingBarcode && !useExistingBarcode.checked && !generateNewBarcode.checked) {
          useExistingBarcode.checked = true;
        }
        
      
        updateBarcodeFormVisibility();
      } else {
        newBarcodeForm.classList.add('d-none');
      }
    }
  }



// function to update the visibility of barcode form sections
function updateBarcodeFormVisibility() {
  const useExistingBarcode = document.getElementById('useExistingBarcode');
  const generateNewBarcode = document.getElementById('generateNewBarcode');
  const newBarcodeInput = document.getElementById('newBarcodeInput');
  const barcodeGenerationInfo = document.getElementById('barcodeGenerationInfo');
  
  if (useExistingBarcode && generateNewBarcode) {
    if (useExistingBarcode.checked) {
      if (newBarcodeInput) newBarcodeInput.style.display = 'block';
      if (barcodeGenerationInfo) barcodeGenerationInfo.style.display = 'none';
    } else if (generateNewBarcode.checked) {
      if (newBarcodeInput) newBarcodeInput.style.display = 'none';
      if (barcodeGenerationInfo) barcodeGenerationInfo.style.display = 'block';
    }
  }
}




function setupBarcodeChangeListeners() {
  const changeBarcodeCheckbox = document.getElementById('changeBarcode');
  if (changeBarcodeCheckbox) {
    changeBarcodeCheckbox.addEventListener('change', toggleChangeBarcode);
  }
  
  const changeToBarcodeExisting = document.getElementById('changeToBarcodeExisting');
  const changeToBarcodeGenerate = document.getElementById('changeToBarcodeGenerate');
  
  
  if (changeToBarcodeExisting && changeToBarcodeGenerate) {
    changeToBarcodeExisting.addEventListener('change', function() {
      if (this.checked) {
        document.getElementById('scanBarcodeSection').classList.remove('d-none');
        document.getElementById('generatedBarcodeSection').classList.add('d-none');
      }
    });
    
    changeToBarcodeGenerate.addEventListener('change', function() {
      if (this.checked) {
        document.getElementById('scanBarcodeSection').classList.add('d-none');
        document.getElementById('generatedBarcodeSection').classList.remove('d-none');
        previewGeneratedBarcode();
      }
    });
  }
  

  const useExistingBarcode = document.getElementById('useExistingBarcode');
  const generateNewBarcode = document.getElementById('generateNewBarcode');
  
  if (useExistingBarcode && generateNewBarcode) {
    useExistingBarcode.addEventListener('change', updateBarcodeFormVisibility);
    generateNewBarcode.addEventListener('change', updateBarcodeFormVisibility);
  }
}




function updateBarcodeFormVisibility() {
  const useExistingBarcode = document.getElementById('useExistingBarcode');
  const generateNewBarcode = document.getElementById('generateNewBarcode');
  const newBarcodeInput = document.getElementById('newBarcodeInput');
  const barcodeGenerationInfo = document.getElementById('barcodeGenerationInfo');
  
  if (useExistingBarcode && generateNewBarcode) {
    if (useExistingBarcode.checked) {
      if (newBarcodeInput) newBarcodeInput.style.display = 'block';
      if (barcodeGenerationInfo) barcodeGenerationInfo.style.display = 'none';
    } else if (generateNewBarcode.checked) {
      if (newBarcodeInput) newBarcodeInput.style.display = 'none';
      if (barcodeGenerationInfo) barcodeGenerationInfo.style.display = 'block';
    }
  }
}

// Open transaction modal
/**
 * @param {string} itemId - The ID of the item
 * @param {string} itemName - The name of the item
 */




function addModalFixStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .modal-backdrop {
      z-index: 1040 !important;
    }
    .modal {
      z-index: 1050 !important;
    }
  `;
  document.head.appendChild(style);
}




function addModalCssFix() {
  const style = document.createElement('style');
  style.textContent = `
    .modal-backdrop {
      z-index: 1040 !important;
    }
    .modal {
      z-index: 1050 !important;
    }
    .modal-dialog {
      margin: 1.75rem auto !important;
    }
  `;
  document.head.appendChild(style);
}

addModalCssFix();








function safeCloseModal(modalElement) {
  if (!modalElement) return;
  

  document.body.focus();
  

  const modalInstance = bootstrap.Modal.getInstance(modalElement);
  if (!modalInstance) return;
  

  modalInstance.hide();
  
  
  setTimeout(() => {

    modalElement.removeAttribute('aria-hidden');
    
    
    document.body.classList.remove('modal-open');
    
   
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
 
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.remove();
    });
    

    modalElement.style.display = 'none';
  }, 300); 
}



// Save item
function saveItem() {
  try {
    console.log('Save item function called');
    
    // Get form data
    const itemId = document.getElementById('itemId').value;
    const name = document.getElementById('itemName').value;
    const category = document.getElementById('itemCategory').value;
    let finalCategory = category;
    let categoryType = category;

    
    if (category === 'Other') {
      const customCategory = document.getElementById('customCategory').value;
      if (customCategory && customCategory.trim() !== '') {
        finalCategory = customCategory.trim();
        categoryType = 'Custom';
      }
    } else {
      
      categoryType = category;
    }
    const status = document.getElementById('itemStatus').value;
    const description = document.getElementById('itemDescription').value;
    const akuNo = document.getElementById('itemAkuNo').value;
    const manufacturer = document.getElementById('itemManufacturer').value;
    const supplier = document.getElementById('itemSupplier').value;
    const quantity = document.getElementById('itemQuantity').value;
    const unit = document.getElementById('itemUnit').value;
    const unitCost = document.getElementById('itemUnitCost').value;
    const reorderLevel = document.getElementById('itemReorderLevel').value;
    const room = document.getElementById('itemRoom').value;
    const rack = document.getElementById('itemRack').value;
    const shelf = document.getElementById('itemShelf').value;
    const purchaseDate = document.getElementById('itemPurchaseDate').value;
    const lastMaintenanceDate = document.getElementById('itemLastMaintenanceDate').value;
    const nextMaintenanceDate = document.getElementById('itemNextMaintenanceDate').value;
    const notes = document.getElementById('itemNotes').value;
    
    console.log('Form data collected:', {
      itemId, name, category, status, quantity, unitCost, room
    });
    
    // Handle barcode data
    let barcodeType;
    let barcode;
    
   
    const changeBarcode = document.getElementById('changeBarcode');
    
    if (itemId) {
    
      console.log('Processing existing item with ID:', itemId);
      
      if (changeBarcode && changeBarcode.checked) {

        console.log('User is changing the barcode');
        const useExistingBarcode = document.getElementById('useExistingBarcode');
        
        if (useExistingBarcode && useExistingBarcode.checked) {
     
          barcode = document.getElementById('newItemBarcode')?.value || '';
          barcodeType = 'existing';
          console.log('Using new manually entered barcode:', barcode);
        } else {
      
          barcodeType = 'generate';
          barcode = '';
          console.log('Will generate a new barcode on server');
        }
      } else {
    
        const currentBarcodeValue = document.getElementById('currentBarcodeValue');
        const currentBarcodeType = document.getElementById('currentBarcodeType');
        
        if (currentBarcodeValue) {
          barcode = currentBarcodeValue.textContent;
          barcodeType = currentBarcodeType && currentBarcodeType.textContent.includes('Manufacturer') ? 
            'existing' : 'generate';
          
          console.log('Keeping existing barcode:', barcode, 'of type:', barcodeType);
        } else {
       
          barcodeType = document.getElementById('scanExisting')?.checked ? 'existing' : 'generate';
          barcode = barcodeType === 'existing' ? document.getElementById('itemBarcode')?.value || '' : '';
          console.log('Using fallback barcode handling:', barcode, 'of type:', barcodeType);
        }
      }
    } else {
   
      console.log('Processing new item');
      
      const scanExisting = document.getElementById('scanExisting');
      
      if (scanExisting) {
        barcodeType = scanExisting.checked ? 'existing' : 'generate';
        barcode = barcodeType === 'existing' ? document.getElementById('itemBarcode')?.value || '' : '';
        console.log('New item barcode handling:', barcode, 'of type:', barcodeType);
      } else {
     
        barcodeType = 'generate';
        barcode = '';
        console.log('Defaulting to generating a barcode');
      }
    }
    
 
    if (barcodeType === 'existing' && !barcode) {
      console.warn('Missing barcode for existing barcode type');
      showAlert('Please enter or scan the existing barcode', 'warning');
      return;
    }
    

    if (!name || !category || !quantity || !room) {
      console.warn('Missing required fields');
      showAlert('Please fill in all required fields', 'danger');
      return;
    }
    
   
    const itemData = {
      name,
      category: finalCategory,
      categoryType: categoryType,
      status,
      description,
      akuNo,
      barcode,
      barcodeType,
      manufacturer,
      supplier: supplier || undefined,
      quantity: parseInt(quantity),
      unit,
      unitCost: parseFloat(unitCost),
      reorderLevel: parseInt(reorderLevel),
      location: {
        room,
        rack: rack || undefined,
        shelf: shelf || undefined
      },
      purchaseDate: purchaseDate || undefined,
      lastMaintenanceDate: lastMaintenanceDate || undefined,
      nextMaintenanceDate: nextMaintenanceDate || undefined,
      notes
    };
    
    console.log('Prepared item data:', itemData);
    
    
    const saveBtn = document.getElementById('saveItemBtn');
    if (!saveBtn) {
      console.error('Save button not found');
      showAlert('Error: Save button not found', 'danger');
      return;
    }
    
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';
    saveBtn.disabled = true;
    
   
    const apiUrl = itemId ? 
      `${API_URL}/items/${itemId}` : 
      `${API_URL}/items`;
    
    const method = itemId ? 'PUT' : 'POST';
    const messagePrefix = itemId ? 'Item updated' : 'Item created';
    
    console.log(`Making ${method} request to ${apiUrl}`);
    
   
    fetchWithAuth(apiUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(itemData)
    })
    .then(response => {
     
      saveBtn.innerHTML = 'Save Item';
      saveBtn.disabled = false;
      
      if (!response) {
        console.error('No response from server');
        showAlert('Failed to connect to server', 'danger');
        return;
      }
      
      console.log('API response status:', response.status);
      
      if (response.ok) {
        return response.json().then(item => {
          console.log('Item saved successfully:', item);
          
          // Close modal
          enhancedModalClose(document.getElementById('itemModal'));
          
          // Show success message
          showAlert(`${messagePrefix} successfully`, 'success');
          
         
          const hadNewBarcodeGenerated = 
            (!itemId && item.barcodeType === 'generate') || 
            (itemId && barcodeType === 'generate' && changeBarcode?.checked && 
             item.barcode !== document.getElementById('currentBarcodeValue')?.textContent);
          
          if (hadNewBarcodeGenerated) {
            if (confirm(`A new barcode (${item.barcode}) has been generated. Would you like to print it now?`)) {
              printBarcode(item);
            }
          }
          
         
          loadInventoryItems();
        });
      } else {
        return response.json()
          .then(errorData => {
            console.error('API error:', errorData);
            showAlert(errorData.message || `Failed to ${itemId ? 'update' : 'create'} item`, 'danger');
          })
          .catch(e => {
            console.error('Error parsing API error response:', e);
            showAlert(`Failed to ${itemId ? 'update' : 'create'} item`, 'danger');
          });
      }
    })
    .catch(error => {
      console.error('Save item error:', error);
      showAlert('Failed to connect to server. Please try again.', 'danger');
      
      // Reset button state
      saveBtn.innerHTML = 'Save Item';
      saveBtn.disabled = false;
    });
  } catch (error) {
    console.error('Unexpected error in saveItem function:', error);
    showAlert('An unexpected error occurred. Please try again.', 'danger');
    
    // Reset button state
    const saveBtn = document.getElementById('saveItemBtn');
    if (saveBtn) {
      saveBtn.innerHTML = 'Save Item';
      saveBtn.disabled = false;
    }
  }
}




// Delete item
async function deleteItem(itemId) {
    try {
      // Show loading indicator
      showAlert('Deleting item...', 'info', 'alertContainer', false);
      
      // Send delete request
      const response = await fetchWithAuth(`${API_URL}/items/${itemId}`, {
        method: 'DELETE'
      });
      
      if (!response) return;
      
      if (response.ok) {
        // Show success message
        showAlert('Item deleted successfully', 'success');
        
        // Reload inventory
        loadInventoryItems();
      } else {
        const errorData = await response.json();
        showAlert(errorData.message || 'Failed to delete item', 'danger');
      }
    } catch (error) {
      console.error('Delete item error:', error);
      showAlert('Failed to connect to server. Please try again.', 'danger');
    }
  }
// Export inventory to CSV
function exportToCSV() {
  try {
    // Get table data
    const table = document.querySelector('table');
    const rows = table.querySelectorAll('tr');
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add headers
    const headers = ['Item Name', 'Category', 'Quantity', 'Status', 'Location'];
    csvContent += headers.join(',') + '\n';
    
    // Add rows 
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length <= 1) continue; 
      
      const rowData = [
        `"${cells[1].querySelector('h6').textContent}"`, // Item name
        `"${cells[2].textContent}"`, // Category
        `"${cells[3].textContent.trim()}"`, // Quantity
        `"${cells[4].textContent.trim()}"`, // Status
        `"${cells[5].textContent}"` // Location
      ];
      
      csvContent += rowData.join(',') + '\n';
    }
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  } catch (error) {
    console.error('Export error:', error);
    showAlert('Failed to export inventory', 'danger');
  }
}

// Print inventory
function printInventory() {
  // Open print dialog
  window.print();
}



function updateFormFieldsBasedOnCategory(category) {
  
  const statusGroup = document.querySelector('.form-group-status');
  const maintenanceDatesGroup = document.querySelector('.form-group-maintenance');
  const rentalFieldsGroup = document.querySelector('.form-group-rental');
  const reorderGroup = document.querySelector('.form-group-reorder');
  
  // Default all fields to visible first
  if (statusGroup) statusGroup.style.display = 'block';
  if (maintenanceDatesGroup) maintenanceDatesGroup.style.display = 'block';
  if (rentalFieldsGroup) rentalFieldsGroup.style.display = 'block';
  if (reorderGroup) reorderGroup.style.display = 'block';
  
  // Update status options based on category
  const statusSelect = document.getElementById('itemStatus');
  
  if (statusSelect) {
    // Clear existing options first
    statusSelect.innerHTML = '';
    
    // Add common option
    const availableOption = document.createElement('option');
    availableOption.value = 'Available';
    availableOption.textContent = 'Available';
    statusSelect.appendChild(availableOption);
    
    // Add category-specific options
    switch(category) {
      case 'Consumable':
    
        const outOfStockOption = document.createElement('option');
        outOfStockOption.value = 'Out of Stock';
        outOfStockOption.textContent = 'Out of Stock';
        statusSelect.appendChild(outOfStockOption);
        
      
        if (maintenanceDatesGroup) maintenanceDatesGroup.style.display = 'none';
        break;
        
      case 'Task Trainer':
      case 'Manikin':
      case 'Electronic':
      case 'Device':
       
        const maintenanceOption = document.createElement('option');
        maintenanceOption.value = 'Under Maintenance';
        maintenanceOption.textContent = 'Under Maintenance';
        statusSelect.appendChild(maintenanceOption);
        
        const rentedOption = document.createElement('option');
        rentedOption.value = 'Rented';
        rentedOption.textContent = 'Rented';
        statusSelect.appendChild(rentedOption);
        
        const outOfStockEquipOption = document.createElement('option');
        outOfStockEquipOption.value = 'Out of Stock';
        outOfStockEquipOption.textContent = 'Out of Stock';
        statusSelect.appendChild(outOfStockEquipOption);
        break;
        
      case 'Other':
      default:
     
        const maintenanceDefaultOption = document.createElement('option');
        maintenanceDefaultOption.value = 'Under Maintenance';
        maintenanceDefaultOption.textContent = 'Under Maintenance';
        statusSelect.appendChild(maintenanceDefaultOption);
        
        const rentedDefaultOption = document.createElement('option');
        rentedDefaultOption.value = 'Rented';
        rentedDefaultOption.textContent = 'Rented';
        statusSelect.appendChild(rentedDefaultOption);
        
        const outOfStockDefaultOption = document.createElement('option');
        outOfStockDefaultOption.value = 'Out of Stock';
        outOfStockDefaultOption.textContent = 'Out of Stock';
        statusSelect.appendChild(outOfStockDefaultOption);
        break;
    }
    
    // Set default status based on category
    if (category === 'Consumable') {
      statusSelect.value = 'Available';
    } else {
      statusSelect.value = 'Available';
    }
  }
  
  // Update unit field placeholder based on category
  const unitField = document.getElementById('itemUnit');
  if (unitField) {
    switch(category) {
      case 'Consumable':
        unitField.value = 'piece';
        unitField.placeholder = 'e.g., piece, box, pack, ml';
        break;
      case 'Task Trainer':
      case 'Manikin':
      case 'Electronic':
      case 'Device':
        unitField.value = 'unit';
        unitField.placeholder = 'e.g., unit, set';
        break;
      default:
        unitField.value = 'piece';
        unitField.placeholder = 'e.g., piece, unit';
        break;
    }
  }
  
  // Update default reorder level based on category
  const reorderField = document.getElementById('itemReorderLevel');
  if (reorderField) {
    if (category === 'Consumable') {
      reorderField.value = '10';
    } else {
      reorderField.value = '1';
    }
  }
}



function testBarcodeScanning() {
  // Create a modal for testing different barcode formats
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'barcodeTestModal';
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Barcode Scanner Test</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            Print this page and test which barcode format works best with your scanner.
          </div>
          
          <div class="row">
            <div class="col-md-6 mb-4">
              <div class="card">
                <div class="card-header">CODE128 (Default)</div>
                <div class="card-body text-center">
                  <canvas id="barcode1"></canvas>
                  <div class="mt-2 font-monospace">1000123456789</div>
                </div>
              </div>
            </div>
            
            <div class="col-md-6 mb-4">
              <div class="card">
                <div class="card-header">CODE39</div>
                <div class="card-body text-center">
                  <canvas id="barcode2"></canvas>
                  <div class="mt-2 font-monospace">1000123456789</div>
                </div>
              </div>
            </div>
            
            <div class="col-md-6 mb-4">
              <div class="card">
                <div class="card-header">EAN-13</div>
                <div class="card-body text-center">
                  <canvas id="barcode3"></canvas>
                  <div class="mt-2 font-monospace">6901234567892</div>
                </div>
              </div>
            </div>
            
            <div class="col-md-6 mb-4">
              <div class="card">
                <div class="card-header">CODE128 (No Letters)</div>
                <div class="card-body text-center">
                  <canvas id="barcode4"></canvas>
                  <div class="mt-2 font-monospace">10001234567890</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="mt-3">
            <div class="input-group">
              <input type="text" id="scannedBarcode" class="form-control" placeholder="Scan a barcode...">
              <button class="btn btn-primary" type="button" id="clearScannedBarcode">Clear</button>
            </div>
            <div class="form-text">Scan any barcode to test if it's recognized correctly.</div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="printTestBarcodes">Print Test Sheet</button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Show the modal
  const modalInstance = new bootstrap.Modal(document.getElementById('barcodeTestModal'));
  modalInstance.show();
  
  // Render the test barcodes
  JsBarcode("#barcode1", "1000123456789", { format: "CODE128", displayValue: false });
  JsBarcode("#barcode2", "1000123456789", { format: "CODE39", displayValue: false });
  try {
    JsBarcode("#barcode3", "6901234567892", { format: "EAN13", displayValue: false });
  } catch (e) {
    document.getElementById("barcode3").parentNode.innerHTML = '<div class="alert alert-warning">EAN-13 requires valid check digit</div>';
  }
  JsBarcode("#barcode4", "10001234567890", { format: "CODE128", displayValue: false });
  
  // Set up event listeners
  document.getElementById('clearScannedBarcode').addEventListener('click', function() {
    document.getElementById('scannedBarcode').value = '';
    document.getElementById('scannedBarcode').focus();
  });
  
  document.getElementById('printTestBarcodes').addEventListener('click', function() {
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode Test Sheet</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .barcode-row { margin-bottom: 20px; display: flex; flex-wrap: wrap; }
          .barcode-cell { border: 1px solid #ddd; margin: 10px; padding: 15px; text-align: center; width: 300px; }
          .barcode-title { font-weight: bold; margin-bottom: 10px; }
          .barcode-value { font-family: monospace; margin-top: 10px; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <h1>Barcode Scanner Test Sheet</h1>
        <p>Scan these barcodes to determine which format works best with your scanner.</p>
        
        <div class="barcode-row">
          <div class="barcode-cell">
            <div class="barcode-title">CODE128 (Default)</div>
            <canvas id="print-barcode1"></canvas>
            <div class="barcode-value">1000123456789</div>
          </div>
          
          <div class="barcode-cell">
            <div class="barcode-title">CODE39</div>
            <canvas id="print-barcode2"></canvas>
            <div class="barcode-value">1000123456789</div>
          </div>
        </div>
        
        <div class="barcode-row">
          <div class="barcode-cell">
            <div class="barcode-title">EAN-13</div>
            <canvas id="print-barcode3"></canvas>
            <div class="barcode-value">6901234567892</div>
          </div>
          
          <div class="barcode-cell">
            <div class="barcode-title">CODE128 (Numeric Only)</div>
            <canvas id="print-barcode4"></canvas>
            <div class="barcode-value">10001234567890</div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            JsBarcode("#print-barcode1", "1000123456789", { format: "CODE128" });
            JsBarcode("#print-barcode2", "1000123456789", { format: "CODE39" });
            try {
              JsBarcode("#print-barcode3", "6901234567892", { format: "EAN13" });
            } catch(e) {
              document.getElementById("print-barcode3").parentNode.innerHTML += '<div>Error: Invalid check digit</div>';
            }
            JsBarcode("#print-barcode4", "10001234567890", { format: "CODE128" });
            
            setTimeout(function() { window.print(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  });
  
  // Focus the input field for scanning
  setTimeout(() => {
    document.getElementById('scannedBarcode').focus();
  }, 500);
}

// Function to set up all transaction-related functionality
function setupEnhancedTransactions() {
  console.log("Setting up enhanced transaction functionality");
  
 
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
  

  const transactionTypeSelect = document.getElementById('enhancedTransactionType');
  if (transactionTypeSelect) {
    transactionTypeSelect.addEventListener('change', function() {
      updateEnhancedTransactionForm(this.value);
    });
  }
  

  const saveBtn = document.getElementById('enhancedSaveTransactionBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveEnhancedTransaction);
  }
  

  loadLocationsForTransaction();


const closeButtons = document.querySelectorAll('#enhancedTransactionModal .btn-close, #enhancedTransactionModal .btn-secondary');
closeButtons.forEach(button => {
  button.addEventListener('click', function(e) {
    console.log('Close button clicked');
    e.preventDefault();
    e.stopPropagation();
    closeEnhancedModalDirectly();
  });
});


document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const modal = document.getElementById('enhancedTransactionModal');
    if (modal && modal.classList.contains('show')) {
      closeEnhancedModalDirectly();
    }
  }
});
}





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





// Update form fields based on selected transaction type
function updateEnhancedTransactionForm(type) {
  // Get all form groups
  const fromLocationGroup = document.getElementById('enhancedFromLocationGroup');
  const toLocationGroup = document.getElementById('enhancedToLocationGroup');
  const sessionDetailsGroup = document.getElementById('enhancedSessionDetailsGroup');
  const rentalDetailsGroup = document.getElementById('enhancedRentalDetailsGroup');
  const maintenanceDetailsGroup = document.getElementById('enhancedMaintenanceDetailsGroup');
  

  if (fromLocationGroup) fromLocationGroup.style.display = 'none';
  if (toLocationGroup) toLocationGroup.style.display = 'none';
  if (sessionDetailsGroup) sessionDetailsGroup.style.display = 'none';
  if (rentalDetailsGroup) rentalDetailsGroup.style.display = 'none';
  if (maintenanceDetailsGroup) maintenanceDetailsGroup.style.display = 'none';
  
 
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
  

  updateQuantityLimits(type);
}


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
    
 
    const transactionData = {
      type,
      quantity: parseInt(quantity),
      notes: document.getElementById('enhancedTransactionNotes').value
    };
    
  
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
    
    
    const saveBtn = document.getElementById('enhancedSaveTransactionBtn');
    if (saveBtn) {
      saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';
      saveBtn.disabled = true;
    }
    
  
    const response = await fetchWithAuth(`${API_URL}/items/${itemId}/enhanced-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    });
    
  
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




function showEnhancedModalDirectly(item) {
  if (!item) return;
  
  // Get the modal element
  const modal = document.getElementById('enhancedTransactionModal');
  if (!modal) {
    console.error('Enhanced transaction modal not found');
    return;
  }

  closeEnhancedModalDirectly();
  

  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = '15px'; 
  

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop fade show';
  backdrop.id = 'custom-modal-backdrop';
  document.body.appendChild(backdrop);
  

  modal.classList.add('show');
  modal.style.display = 'block';
  modal.setAttribute('aria-modal', 'true');
  modal.removeAttribute('aria-hidden');
  

  document.getElementById('enhancedTransactionItemId').value = item._id;
  document.getElementById('enhancedTransactionItem').value = item.name;
  
 
  configureTransactionTypes(item);
  

  const quantityInput = document.getElementById('enhancedTransactionQuantity');
  if (quantityInput) {
    const availableQuantity = item.availableQuantity !== undefined ? 
      item.availableQuantity : item.quantity;
    quantityInput.max = availableQuantity;
    quantityInput.value = 1;
  }
  
  console.log('Enhanced modal shown manually');
}


function closeEnhancedModalDirectly() {
  const modal = document.getElementById('enhancedTransactionModal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
    modal.removeAttribute('aria-modal');
    modal.setAttribute('aria-hidden', 'true');
  }

  const customBackdrop = document.getElementById('custom-modal-backdrop');
  if (customBackdrop) {
    customBackdrop.remove();
  }
  
  document.querySelectorAll('.modal-backdrop').forEach(el => {
    el.remove();
  });
  

  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
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
    
    // Search and filters
    document.getElementById('searchInput').addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        currentPage = 1;
        loadInventoryItems();
      }
    });
    
    document.getElementById('categoryFilter').addEventListener('change', () => {
      currentPage = 1;
      loadInventoryItems();
    });
    
    document.getElementById('statusFilter').addEventListener('change', () => {
      currentPage = 1;
      loadInventoryItems();
    });
    
    document.getElementById('locationFilter').addEventListener('change', () => {
      currentPage = 1;
      loadInventoryItems();
    });

    document.getElementById('itemCategory').addEventListener('change', function() {
      updateFormFieldsBasedOnCategory(this.value);
    });
    

const addItemBtn = document.getElementById('addItemBtn');
if (addItemBtn) {
  addItemBtn.addEventListener('click', () => {
    // Reset form
    const itemForm = document.getElementById('itemForm');
    if (itemForm) itemForm.reset();
    
    // Clear hidden fields
    const itemId = document.getElementById('itemId');
    if (itemId) itemId.value = '';

    const currentBarcodeDisplay = document.getElementById('currentBarcodeDisplay');
    if (currentBarcodeDisplay) currentBarcodeDisplay.classList.add('d-none');

    const changeBarcodeSection = document.getElementById('changeBarcodeSection');
    if (changeBarcodeSection) changeBarcodeSection.classList.add('d-none');
    
  
    const changeBarcode = document.getElementById('changeBarcode');
    if (changeBarcode) changeBarcode.checked = false;
    

    const newBarcodeForm = document.getElementById('newBarcodeForm');
    if (newBarcodeForm) newBarcodeForm.classList.add('d-none');
    
    
    const barcodeOptionsSection = document.getElementById('barcodeOptionsSection');
    if (barcodeOptionsSection) barcodeOptionsSection.classList.remove('d-none');
    

    const newBarcodeOptionsSection = document.getElementById('newBarcodeOptionsSection');
    if (newBarcodeOptionsSection) newBarcodeOptionsSection.classList.remove('d-none');
    

    if (document.getElementById('generateNew')) {
      document.getElementById('generateNew').checked = true;
    }
    if (document.getElementById('scanExisting')) {
      document.getElementById('scanExisting').checked = false;
    }
    
  
    toggleBarcodeInputMethod();



  
     const categorySelect = document.getElementById('itemCategory');
     categorySelect.value = '';



   
    updateFormFieldsBasedOnCategory('');

    
    // Set default values
    document.getElementById('itemStatus').value = 'Available';
    document.getElementById('itemQuantity').value = '1';
    document.getElementById('itemUnit').value = 'piece';
    document.getElementById('itemReorderLevel').value = '5';
    
    // Set modal title
    document.getElementById('itemModalTitle').textContent = 'Add New Item';
    
    // Enable form fields
    const formFields = document.getElementById('itemForm').querySelectorAll('input, textarea, select');
    formFields.forEach(field => {
      field.readOnly = false;
      if (field.tagName === 'SELECT') {
        field.disabled = false;
      }
    });
    
    // Show save button
    document.getElementById('saveItemBtn').style.display = 'block';
    
    // Show/hide barcode row
    const barcodeRow = document.getElementById('barcodeRow');
    if (barcodeRow) barcodeRow.style.display = 'block';
  });
}

    
   
    const itemModal = document.getElementById('itemModal');
    if (itemModal) {
      itemModal.addEventListener('hidden.bs.modal', function() {
    
        setTimeout(() => {
  
          document.activeElement.blur();
          
       
          itemModal.removeAttribute('aria-hidden');
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
          
    
          const backdrops = document.querySelectorAll('.modal-backdrop');
          backdrops.forEach(backdrop => backdrop.remove());
        }, 10);
      });
    }
    
    // Save item button
    document.getElementById('saveItemBtn').addEventListener('click', saveItem);
  

  
  // Export button
  document.getElementById('exportBtn').addEventListener('click', exportToCSV);
  
  // Print button
  document.getElementById('printBtn').addEventListener('click', printInventory);
  
  // Print barcode button
document.getElementById('printBarcodeBtn').addEventListener('click', () => {
  // Get the item ID
  const itemId = document.getElementById('itemId').value;
  

  if (itemId) {
    fetchWithAuth(`${API_URL}/items/${itemId}`)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('Failed to fetch item data');
        }
      })
      .then(item => {
        printBarcode(item);
      })
      .catch(error => {
        console.error('Error fetching item for printing:', error);
        showAlert('Error preparing barcode for printing', 'danger');
      });
  } else {
 
    showAlert('Please save the item first before printing the barcode', 'warning');
  }
});
  

  document.getElementById('selectAll').addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = e.target.checked;
    });
  });


const testBarcodesBtn = document.createElement('button');
testBarcodesBtn.className = 'btn btn-sm btn-outline-secondary ms-2';
testBarcodesBtn.innerHTML = '<i class="fas fa-vial me-1"></i> Test Barcodes';
testBarcodesBtn.addEventListener('click', testBarcodeScanning);


const btnToolbar = document.querySelector('.btn-toolbar');
if (btnToolbar) {
  btnToolbar.appendChild(testBarcodesBtn);
}

const transactionType = document.getElementById('transactionType');
if (transactionType) {
  transactionType.addEventListener('change', function() {
    updateTransactionForm(this.value);
  });
}



}






function openTransactionDialog(item) {
  console.log('Opening transaction dialog for item:', item);
  
 
  let transactionModal = document.getElementById('simpleTransactionModal');
  
  if (!transactionModal) {
    // Modal doesn't exist, so create it
    const modalHtml = `
      <div class="modal fade" id="simpleTransactionModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="simpleTransactionTitle">Transaction</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div id="simpleTransactionAlerts"></div>
              
              <form id="simpleTransactionForm">
                <input type="hidden" id="transactionItemId">
                
                <div class="mb-3">
                  <div class="d-flex mb-2">
                    <div class="flex-grow-1">
                      <h5 id="transactionItemName" class="mb-0">Item Name</h5>
                      <span id="transactionItemCategory" class="badge bg-secondary me-2">Category</span>
                      <span id="transactionItemStatus" class="badge bg-success">Status</span>
                    </div>
                    <div>
                      <span id="transactionItemQuantity" class="h5">0</span>
                      <small id="transactionItemUnit">units</small>
                    </div>
                  </div>
                </div>
                
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label for="transactionType" class="form-label">Transaction Type*</label>
                    <select class="form-select" id="transactionType" required>
                      <option value="">Select Transaction Type</option>
                      <!-- Transaction types will be populated dynamically -->
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label for="transactionQuantity" class="form-label">Quantity*</label>
                    <input type="number" class="form-control" id="transactionQuantity" min="1" value="1" required>
                  </div>
                </div>

                <!-- Location fields -->
                <div class="mb-3" id="transactionFromLocationGroup" style="display: none;">
                  <label for="transactionFromLocation" class="form-label">From Location</label>
                  <select class="form-select" id="transactionFromLocation">
                    <option value="">Select Location</option>
                    <!-- Will be populated from API -->
                  </select>
                </div>
                
                <div class="mb-3" id="transactionToLocationGroup" style="display: none;">
                  <label for="transactionToLocation" class="form-label">To Location</label>
                  <select class="form-select" id="transactionToLocation">
                    <option value="">Select Location</option>
                    <!-- Will be populated from API -->
                  </select>
                </div>
                
                <!-- Session Details -->
                <div class="mb-3" id="sessionDetailsGroup" style="display: none;">
                  <fieldset class="border rounded p-3">
                    <legend class="w-auto float-none px-2 fs-6">Session Details</legend>
                    <div class="row g-3">
                      <div class="col-md-6">
                        <label for="sessionName" class="form-label">Session Name</label>
                        <input type="text" class="form-control" id="sessionName" placeholder="e.g., Clinical Training 101">
                      </div>
                      <div class="col-md-6">
                        <label for="sessionLocation" class="form-label">Session Location</label>
                        <input type="text" class="form-control" id="sessionLocation" placeholder="e.g., Training Room 2">
                      </div>
                    </div>
                  </fieldset>
                </div>
                
                <!-- Rental Details -->
                <div class="mb-3" id="rentalDetailsGroup" style="display: none;">
                  <fieldset class="border rounded p-3">
                    <legend class="w-auto float-none px-2 fs-6">Rental Details</legend>
                    <div class="row g-3">
                      <div class="col-md-6">
                        <label for="rentedTo" class="form-label">Rented To*</label>
                        <input type="text" class="form-control" id="rentedTo" placeholder="Person or organization name">
                      </div>
                      <div class="col-md-6">
                        <label for="expectedReturnDate" class="form-label">Expected Return Date</label>
                        <input type="date" class="form-control" id="expectedReturnDate">
                      </div>
                    </div>
                  </fieldset>
                </div>
                
                <!-- Maintenance Details -->
                <div class="mb-3" id="maintenanceDetailsGroup" style="display: none;">
                  <fieldset class="border rounded p-3">
                    <legend class="w-auto float-none px-2 fs-6">Maintenance Details</legend>
                    <div class="row g-3">
                      <div class="col-md-6">
                        <label for="maintenanceProvider" class="form-label">Maintenance Provider</label>
                        <input type="text" class="form-control" id="maintenanceProvider" placeholder="Provider or technician name">
                      </div>
                      <div class="col-md-6">
                        <label for="expectedEndDate" class="form-label">Expected Completion Date</label>
                        <input type="date" class="form-control" id="expectedEndDate">
                      </div>
                    </div>
                  </fieldset>
                </div>
                
                <div class="mb-3">
                  <label for="transactionNotes" class="form-label">Notes</label>
                  <textarea class="form-control" id="transactionNotes" rows="3"></textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary" id="saveTransactionBtn">Save Transaction</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
   
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstChild);
    
 
    document.getElementById('transactionType').addEventListener('change', function() {
      updateTransactionFormFields(this.value);
    });
    
    document.getElementById('saveTransactionBtn').addEventListener('click', saveTransaction);
  }
  

  populateTransactionTypes(item);
  

  document.getElementById('transactionItemId').value = item._id;
  document.getElementById('transactionItemName').textContent = item.name;
  document.getElementById('transactionItemCategory').textContent = item.category;
  document.getElementById('transactionItemStatus').textContent = item.status;
  document.getElementById('transactionItemStatus').className = `badge ${getStatusBadgeClass(item.status)}`;
  document.getElementById('transactionItemQuantity').textContent = item.quantity;
  document.getElementById('transactionItemUnit').textContent = item.unit;
  

  const quantityInput = document.getElementById('transactionQuantity');
  const availableQuantity = item.availableQuantity !== undefined ? 
    item.availableQuantity : item.quantity;
  

  quantityInput.max = availableQuantity;
  quantityInput.value = 1; // Default to 1
  
  // Load locations
  loadLocationsForTransactionForm();
  
  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('simpleTransactionModal'));
  modal.show();
}


// function populateTransactionTypes(item) {
//   const transactionTypeSelect = document.getElementById('transactionType');
//   if (!transactionTypeSelect) return;
  
//   // Clear existing options
//   transactionTypeSelect.innerHTML = '<option value="">Select Transaction Type</option>';
  
//   const category = item.category;
//   const status = item.status;
//   const availableQuantity = item.availableQuantity !== undefined ? 
//     item.availableQuantity : item.quantity;
  
//   // Default transaction options
//   const options = [];
  

//   if (category === 'Consumable') {
//     // Consumable options
//     options.push({ value: 'Stock Addition', label: 'Add Stock' });
    
//     // Only allow removal if there's stock available
//     if (availableQuantity > 0) {
//       options.push({ value: 'Stock Removal', label: 'Remove Stock' });
//     }
//   } else {
//     // Non-consumable options (equipment)
    
//     // Always allow adding stock
//     options.push({ value: 'Stock Addition', label: 'Add Stock' });
    
//     // Allow relocating if there's stock available
//     if (availableQuantity > 0) {
//       options.push({ value: 'Relocate', label: 'Relocate Item' });
//       options.push({ value: 'Check Out for Session', label: 'Use in Session' });
//       options.push({ value: 'Rent Out', label: 'Rent Out' });
//       options.push({ value: 'Send to Maintenance', label: 'Send to Maintenance' });
//     }
    
//     // Check if any items are out and can be returned
//     const inMaintenanceCount = item.currentState?.inMaintenance || 0;
//     const inSessionCount = item.currentState?.inSession || 0;
//     const rentedCount = item.currentState?.rented || 0;
    
//     if (inMaintenanceCount > 0) {
//       options.push({ value: 'Return from Maintenance', label: 'Return from Maintenance' });
//     }
    
//     if (inSessionCount > 0) {
//       options.push({ value: 'Return from Session', label: 'Return from Session' });
//     }
    
//     if (rentedCount > 0) {
//       options.push({ value: 'Return from Rental', label: 'Return from Rental' });
//     }
//   }
  
//   // Add options to the select element
//   options.forEach(option => {
//     const optionElement = document.createElement('option');
//     optionElement.value = option.value;
//     optionElement.textContent = option.label;
//     transactionTypeSelect.appendChild(optionElement);
//   });
  
//   // Select the first transaction type by default
//   if (options.length > 0) {
//     transactionTypeSelect.value = options[0].value;
    
//     // Trigger change event to update form fields
//     transactionTypeSelect.dispatchEvent(new Event('change'));
//   }
// }


function populateTransactionTypes(item) {
  const transactionTypeSelect = document.getElementById('transactionType');
  if (!transactionTypeSelect) return;
  
  // Clear existing options
  transactionTypeSelect.innerHTML = '<option value="">Select Transaction Type</option>';
  
  const category = item.category;
  const status = item.status;
  const availableQuantity = item.availableQuantity !== undefined ? 
    item.availableQuantity : item.quantity;
  
  // Default transaction options
  const options = [];
  
  if (category === 'Consumable') {
    // CONSUMABLE TRANSACTION OPTIONS
    
    // Stock management
    options.push({ value: 'Restock', label: 'Add Stock' });
    
    // Only allow usage if there's stock available
    if (availableQuantity > 0) {
      options.push({ value: 'Check-out', label: 'Use/Consume Items' });
      options.push({ value: 'Check Out for Session', label: 'Take for Session (Returnable)' });
      options.push({ value: 'Stock Removal', label: 'Remove Stock (Disposal)' });
    }
    
    // Stock corrections
    options.push({ value: 'Stock Adjustment', label: 'Adjust Stock (Correction)' });
    
    // Return options if items are out
    const inSessionCount = item.currentState?.inSession || 0;
    if (inSessionCount > 0) {
      options.push({ value: 'Check-in', label: 'Return Unused from Session' });
    }
    
  } else {
    // EQUIPMENT TRANSACTION OPTIONS
    
    // Stock management
    options.push({ value: 'Restock', label: 'Add Stock (New Purchase)' });
    
    // Operations requiring available stock
    if (availableQuantity > 0) {
      options.push({ value: 'Stock Removal', label: 'Remove Stock (Disposal/Sale)' });
      options.push({ value: 'Relocate', label: 'Relocate Item' });
      options.push({ value: 'Check Out for Session', label: 'Use in Session' });
      options.push({ value: 'Rent Out', label: 'Rent Out' });
      options.push({ value: 'Send to Maintenance', label: 'Send to Maintenance' });
    }
    
    // Return options based on current state
    const inMaintenanceCount = item.currentState?.inMaintenance || 0;
    const inSessionCount = item.currentState?.inSession || 0;
    const rentedCount = item.currentState?.rented || 0;
    
    if (inMaintenanceCount > 0) {
      options.push({ value: 'Return from Maintenance', label: 'Return from Maintenance' });
    }
    
    if (inSessionCount > 0) {
      options.push({ value: 'Return from Session', label: 'Return from Session' });
    }
    
    if (rentedCount > 0) {
      options.push({ value: 'Return from Rental', label: 'Return from Rental' });
    }
  }
  
  // Add options to the select element
  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    transactionTypeSelect.appendChild(optionElement);
  });
  
  // Select appropriate default transaction type
  if (options.length > 0) {
    if (category === 'Consumable') {
      // For consumables, prioritize restocking if low stock
      if (availableQuantity <= item.reorderLevel) {
        transactionTypeSelect.value = 'Restock';
      } else if (availableQuantity > 0) {
        transactionTypeSelect.value = 'Check-out';
      } else {
        transactionTypeSelect.value = options[0].value;
      }
    } else {
      // For equipment, prioritize session use if available
      if (availableQuantity > 0) {
        transactionTypeSelect.value = 'Check Out for Session';
      } else {
        transactionTypeSelect.value = options[0].value;
      }
    }
    
    // Trigger change event to update form fields
    transactionTypeSelect.dispatchEvent(new Event('change'));
  }
}


function setupActionButtons() {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      loadItemDetails(btn.dataset.id);
    });
  });
  
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      loadItemDetails(btn.dataset.id, true);
    });
  });
  
  document.querySelectorAll('.transaction-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const itemId = btn.dataset.id;
      const itemName = btn.dataset.name;
      
      if (itemId && itemName) {
        // Navigate to scanner page for transactions
        window.location.href = `scanner.html?id=${itemId}`;
      }
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        deleteItem(btn.dataset.id);
      }
    });
  });
}


function updateQuantityLimits(transactionType) {
  const quantityInput = document.getElementById('transactionQuantity');
  if (!quantityInput) return;
  
  const itemId = document.getElementById('transactionItemId').value;
  if (!itemId) return;
  
  fetchWithAuth(`${API_URL}/items/${itemId}`)
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch item');
      return response.json();
    })
    .then(item => {
      let maxQuantity = 1;
      

      switch (transactionType) {
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
      
      // Update the input field
      quantityInput.max = maxQuantity;
      
  
      if (parseInt(quantityInput.value) > maxQuantity) {
        quantityInput.value = maxQuantity;
      }
      
   
      if (parseInt(quantityInput.value) < 1) {
        quantityInput.value = 1;
      }
    })
    .catch(error => {
      console.error('Error updating quantity limits:', error);
    });
}


function loadLocationsForTransactionForm() {
  fetchWithAuth(`${API_URL}/locations/hierarchy`)
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    })
    .then(locations => {
  
      const fromLocationSelect = document.getElementById('transactionFromLocation');
      const toLocationSelect = document.getElementById('transactionToLocation');
      
   
      fromLocationSelect.innerHTML = '<option value="">Select Location</option>';
      toLocationSelect.innerHTML = '<option value="">Select Location</option>';
      

      locations.forEach(room => {
        fromLocationSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
        toLocationSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
        
 
        if (room.racks && room.racks.length > 0) {
          room.racks.forEach(rack => {
            fromLocationSelect.innerHTML += `<option value="${rack._id}">&nbsp;&nbsp;└ ${rack.name}</option>`;
            toLocationSelect.innerHTML += `<option value="${rack._id}">&nbsp;&nbsp;└ ${rack.name}</option>`;
          });
        }
      });
    })
    .catch(error => {
      console.error('Error loading locations:', error);
    });
}




function setupImprovedTransactionButtons() {
  console.log('Setting up improved transaction buttons');
  

  document.addEventListener('click', function(e) {

    const transactionBtn = e.target.closest('.transaction-btn');
    
    if (transactionBtn) {
      e.preventDefault();
      e.stopPropagation();
      
      const itemId = transactionBtn.dataset.id;
      if (!itemId) {
        console.error('Transaction button missing item ID');
        return;
      }
      
 
      fetchWithAuth(`${API_URL}/items/${itemId}`)
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch item');
          return response.json();
        })
        .then(item => {
          openTransactionDialog(item);
        })
        .catch(error => {
          console.error('Error fetching item for transaction:', error);
          showAlert('Error loading item data', 'danger');
        });
    }
  });
}



function replaceTransactionButtons() {
  document.querySelectorAll('.transaction-btn').forEach(btn => {
    const itemId = btn.dataset.id;
    const itemName = btn.dataset.name;
    
 
    const link = document.createElement('a');
    link.href = `transaction.html?id=${itemId}`;
    link.className = btn.className.replace('transaction-btn', 'transaction-link');
    link.innerHTML = '<i class="fas fa-exchange-alt"></i>';
    link.title = `Create Transaction for ${itemName}`;
    

    btn.parentNode.replaceChild(link, btn);
  });
}






function testAuthConnection() {
  fetchWithAuth(`${API_URL}/items`)
    .then(response => {
      if (response && response.ok) {
        console.log('Authentication is working');
      } else {
        console.log('Authentication failed - you may need to log in again');
   
        if (response && response.status === 401) {
          logout();
        }
      }
    })
    .catch(error => {
      console.error('Auth test failed:', error);
    });
}








document.addEventListener('DOMContentLoaded', () => {
 
  const token = getAuthToken();
  const user = getCurrentUser();
  
  if (!token || !user) {
    window.location.href = '../index.html';
    return;
  }

    addModalFixStyles();
   
  setupEventListeners();

  setupBarcodeEventListeners();

  setupBarcodeChangeListeners();



  fixModalAccessibilityIssues();

    


  

  const saveItemBtn = document.getElementById('saveItemBtn');
  if (saveItemBtn) {
 
    const newSaveBtn = saveItemBtn.cloneNode(true);
    saveItemBtn.parentNode.replaceChild(newSaveBtn, saveItemBtn);
    
   
    newSaveBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Save button clicked');
      saveItem();
    });
  }


  if (isInventoryManager()) {
    document.querySelectorAll('.manager-only').forEach(el => el.classList.remove('d-none'));
  }
  
  if (isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
  }
  

  document.getElementById('userName').textContent = user.name;
  document.getElementById('profileName').value = user.name;
  document.getElementById('profileEmail').value = user.email;
  document.getElementById('profileRole').value = user.role;
  

  initializeInventory();
  

  loadLocationsAndSuppliers();


  const quickBarcodeSearch = document.getElementById('quickBarcodeSearch');
  if (quickBarcodeSearch) {
    setTimeout(() => {
      quickBarcodeSearch.focus();
    }, 500);
  }
  

  if (window.location.hash === '#addItem') {
    document.getElementById('addItemBtn').click();
  }



  function fixModalAccessibilityIssues() {
    
    document.body.addEventListener('hidden.bs.modal', function(event) {
  
      document.body.focus();
      

      document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
        el.removeAttribute('aria-hidden');
      });
      
  
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
  
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
      });
    }, true);
  }



   

  
   
  testAuthConnection();

});
