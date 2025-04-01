// public/js/inventory.js

// Global variables
let currentPage = 1;
let itemsPerPage = 10;
let totalPages = 1;
let currentFilter = {};
let locationHierarchy = [];
let suppliers = [];
// Add these global scanner variables
let activeScanner = null;
let activeScannerElementId = null;
let activeScannerTargetId = null;
let transactionItemData = null;
let generatedBarcode = null;


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
  


document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  const token = getAuthToken();
  const user = getCurrentUser();
  
  if (!token || !user) {
    window.location.href = '../index.html';
    return;
  }

    addModalFixStyles();
    // setupTransactionButtons();
    // fixTransactionModal();
    setupEnhancedTransactions();
  
  // Setup event listeners
  setupEventListeners();

  setupBarcodeEventListeners();

  setupBarcodeChangeListeners();


  // Fix modal accessibility issues
  fixModalAccessibilityIssues();

    
  // Fix transaction modal issues
  // fixTransactionModal();
  
  // Make sure Save Item button has event listener attached
  const saveItemBtn = document.getElementById('saveItemBtn');
  if (saveItemBtn) {
    // Remove any existing event listeners to avoid duplicates
    const newSaveBtn = saveItemBtn.cloneNode(true);
    saveItemBtn.parentNode.replaceChild(newSaveBtn, saveItemBtn);
    
    // Add new event listener
    newSaveBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Save button clicked');
      saveItem();
    });
  }

  
  // Show/hide manager/admin features based on user role
  if (isInventoryManager()) {
    document.querySelectorAll('.manager-only').forEach(el => el.classList.remove('d-none'));
  }
  
  if (isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
  }
  
  // Update user info
  document.getElementById('userName').textContent = user.name;
  document.getElementById('profileName').value = user.name;
  document.getElementById('profileEmail').value = user.email;
  document.getElementById('profileRole').value = user.role;
  
  // Initialize the inventory
  initializeInventory();
  
  // Load locations and suppliers for the form
  loadLocationsAndSuppliers();


  // Auto-focus the barcode lookup field
  const quickBarcodeSearch = document.getElementById('quickBarcodeSearch');
  if (quickBarcodeSearch) {
    setTimeout(() => {
      quickBarcodeSearch.focus();
    }, 500);
  }
  
  // Look for the 'addItem' hash fragment to automatically open Add Item modal
  if (window.location.hash === '#addItem') {
    document.getElementById('addItemBtn').click();
  }



  function fixModalAccessibilityIssues() {
    // When any modal is hidden, properly clean up ARIA attributes
    document.body.addEventListener('hidden.bs.modal', function(event) {
      // Reset focus to body
      document.body.focus();
      
      // Remove aria-hidden from all elements
      document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
        el.removeAttribute('aria-hidden');
      });
      
      // Clear any remaining modal-related classes and styles
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Remove any leftover backdrops
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
      });
    }, true);
  }

});


// Add CSS fix for modal z-index issues
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
  
  // Add this line to the end of your DOMContentLoaded event listener in inventory.js
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











// Modify the setupBarcodeEventListeners function
function setupBarcodeEventListeners() {
    // Quick barcode search at the top of inventory page
    document.getElementById('quickBarcodeSearch').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission
        const barcode = this.value.trim();
        if (barcode) {
          findItemByBarcode(barcode);
          
          // Add visual feedback for scan
          this.classList.add('highlight-scan');
          setTimeout(() => {
            this.classList.remove('highlight-scan');
          }, 300);
          
          // Play a scan sound
          playBeepSound();
        }
      }
    });
    
    // Quick scan button - now we'll use native input activation
    document.getElementById('quickScanBtn').addEventListener('click', function() {
      // Focus the input - the physical scanner will input there
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
   // Focus on the input field - the physical scanner will input there
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
    
  // Add enter key event to the barcode input field in the item modal
  document.getElementById('itemBarcode').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      
      // Visual feedback
      this.classList.add('highlight-scan');
      setTimeout(() => {
        this.classList.remove('highlight-scan');
      }, 300);
      
      // Play a scan sound
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
      
      // Show success message
      showAlert('Barcode scanned successfully!', 'success', 'itemModalAlerts', true);
    }
  });
    
    // Print barcode button
    document.getElementById('printBarcodeBtn').addEventListener('click', function() {
      // Get the item ID
      const itemId = document.getElementById('itemId').value;
      
      // If we have an item ID, fetch the latest data and print
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
        // For new items that haven't been saved yet
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
    
    // Add document-wide keyboard event listener for barcode scanning
    document.addEventListener('keydown', function(e) {
      // If we're in a modal, don't trigger the global scanner
      if (document.querySelector('.modal.show')) {
        return;
      }
      
      // If we're in a text input, textarea, or select, don't trigger the global scanner
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA' || 
          document.activeElement.tagName === 'SELECT') {
        return;
      }
      
      // Start focusing on the barcode input if typing starts
      if (e.key.length === 1 && e.key.match(/[a-z0-9]/i)) {
        const quickBarcodeSearch = document.getElementById('quickBarcodeSearch');
        quickBarcodeSearch.focus();
        // The scanner will continue typing into the now-focused field
      }
    });
  }


// Add this function for the beep sound
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



// Update this function
function toggleBarcodeInputMethod() {
    const isScanExisting = document.getElementById('scanExisting').checked;
    const scanBarcodeSection = document.getElementById('scanBarcodeSection');
    const generatedBarcodeSection = document.getElementById('generatedBarcodeSection');
    
    if (!scanBarcodeSection || !generatedBarcodeSection) {
      console.error('Barcode sections not found in the DOM');
      return;
    }

      // Immediately blur any focused elements to prevent focus issues when sections are hidden
  document.activeElement.blur();
    
    if (isScanExisting) {
      scanBarcodeSection.classList.remove('d-none');
      generatedBarcodeSection.classList.add('d-none');
      // Hide preview when using existing barcode
      const previewSection = document.getElementById('previewGeneratedBarcode');
      if (previewSection) {
        previewSection.classList.add('d-none');
      }
    } else {
      scanBarcodeSection.classList.add('d-none');
      generatedBarcodeSection.classList.remove('d-none');
      
      // Only show a preview of the generated barcode for new items
      // or if explicitly changing from existing to generated
      const itemId = document.getElementById('itemId').value;
      const currentBarcodeDisplay = document.getElementById('currentBarcodeDisplay');
      
      // Only generate preview for new items or if we're changing barcode type
      if (!itemId || (itemId && currentBarcodeDisplay.classList.contains('d-none'))) {
        // Show a preview of what the generated barcode might look like
        previewGeneratedBarcode();
      } else {
        // For existing items with barcodes, don't show preview
        const previewSection = document.getElementById('previewGeneratedBarcode');
        if (previewSection) {
          previewSection.classList.add('d-none');
        }
      }
    }
  }


  function previewGeneratedBarcode() {
    // Create a stable, cached barcode
    if (!generatedBarcode) {
      const prefix = 'CIME';
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      generatedBarcode = `${prefix}-${timestamp.substring(timestamp.length - 6)}-${random}`;
    }
    
    // Show preview section
    document.getElementById('previewGeneratedBarcode').classList.remove('d-none');
    document.getElementById('generatedBarcodeValue').textContent = generatedBarcode;
      
    // Generate visual preview if JsBarcode is available
    if (typeof JsBarcode !== 'undefined') {
      try {
        // Create a new canvas for the barcode
        const canvas = document.createElement('canvas');
        document.getElementById('generatedBarcodeImage').innerHTML = '';
        document.getElementById('generatedBarcodeImage').appendChild(canvas);
        
        // Generate the barcode - using generatedBarcode instead of sampleBarcode
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
      // If there's already an active scanner, stop it first
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
      
      // Check if Html5Qrcode is loaded
      if (typeof Html5Qrcode === 'undefined') {
        scannerPreview.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Barcode scanner library not loaded. Please refresh the page and try again.
          </div>`;
        return;
      }
      
      // Create a new scanner instance
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
    // Create a modal for the scanner
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
    
    // Show the modal
    const modalInstance = new bootstrap.Modal(document.getElementById('quickScanModal'));
    modalInstance.show();
    
    // Initialize scanner when modal is shown
    document.getElementById('quickScanModal').addEventListener('shown.bs.modal', () => {
      // Create a new Html5Qrcode instance
      const html5QrCode = new Html5Qrcode("quickScannerPreview");
      
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Stop scanning
          try {
            await html5QrCode.stop();
          } catch (e) {
            console.error('Error stopping scanner:', e);
          }
          
          // Close modal
          modalInstance.hide();
          
          // Find the item
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
    
    // Clean up when modal is closed
    document.getElementById('quickScanModal').addEventListener('hidden.bs.modal', async () => {
      try {
        const html5QrCode = new Html5Qrcode("quickScannerPreview");
        if (html5QrCode) {
          await html5QrCode.stop();
        }
      } catch (e) {
        console.error(e);
      }
      
      // Remove the modal from the DOM
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


// Function to find and display item by barcode
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
        
        // Open the item details modal
        openItemModal(item, false);
        
        // Show success message
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



// Update inventory table with items
function updateInventoryTable(items) {
  const tableBody = document.getElementById('inventoryTable');
  
  if (!items || items.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No items found</td></tr>';
    return;
  }
  
  let html = '';
  
  items.forEach(item => {
    const location = getFormattedLocation(item);
    
    // Get available quantity
    const availableQuantity = item.availableQuantity !== undefined ? 
      item.availableQuantity : item.quantity;
    
    // Determine an enhanced status display
    let statusDisplay = item.status;
    let statusClass = getStatusBadgeClass(item.status);
    
    // For partially available items, show how many are available
    if (item.status === 'Partially Available' && item.category !== 'Consumable') {
      statusDisplay = `${availableQuantity}/${item.quantity} Available`;
    }
    
    // For low stock items, add a visual indicator
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
  
  // Add event listeners to action buttons
  setupActionButtons();
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
        // openTransactionModal(itemId, itemName);
        fetchItemForTransaction(itemId); 
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

// Update pagination controls
function updatePagination() {
  const paginationEl = document.getElementById('pagination');
  
  paginationEl.innerHTML = '';
  
  if (totalPages <= 1) return;
  
  const paginationNav = createPagination(currentPage, totalPages, (page) => {
    currentPage = page;
    loadInventoryItems();
    
    // Scroll to top of table
    document.querySelector('.card').scrollIntoView({ behavior: 'smooth' });
  });
  
  paginationEl.appendChild(paginationNav);
}

// Load locations and suppliers for the form
async function loadLocationsAndSuppliers() {
  try {
   // Load locations hierarchy
   fetchWithAuth(`${API_URL}/locations/hierarchy`)
   .then(response => {
     if (response && response.ok) {
       return response.json();
     }
     return [];
   })
   .then(data => {
     locationHierarchy = data;
     
     // Populate location filter dropdown
     const locationFilter = document.getElementById('locationFilter');
     locationFilter.innerHTML = '<option value="">All Locations</option>';
     
     locationHierarchy.forEach(room => {
       locationFilter.innerHTML += `<option value="${room._id}">${room.name}</option>`;
     });
     
     // Populate room dropdown
     const roomSelect = document.getElementById('itemRoom');
     roomSelect.innerHTML = '<option value="">Select Room</option>';
     
     locationHierarchy.forEach(room => {
       roomSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
     });
     
     // Add event listener to room select for populating racks
     roomSelect.addEventListener('change', () => {
       populateRackDropdown(roomSelect.value);
       
       // Clear shelf dropdown when room changes
       document.getElementById('itemShelf').innerHTML = '<option value="">Select Shelf</option>';
       document.getElementById('itemShelf').disabled = true;
     });
   });
    
    // Load suppliers
    const suppliersResponse = await fetchWithAuth(`${API_URL}/suppliers`);
    
    if (suppliersResponse && suppliersResponse.ok) {
      suppliers = await suppliersResponse.json();
      
      // Populate supplier dropdown
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

// Populate location filter and form dropdowns
function populateLocationDropdowns() {
  // Populate location filter
  const locationFilter = document.getElementById('locationFilter');
  locationFilter.innerHTML = '<option value="">All Locations</option>';
  
  locationHierarchy.forEach(room => {
    locationFilter.innerHTML += `<option value="${room._id}">${room.name}</option>`;
  });
  
  // Populate room dropdown
  const roomSelect = document.getElementById('itemRoom');
  roomSelect.innerHTML = '<option value="">Select Room</option>';
  
  locationHierarchy.forEach(room => {
    roomSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
  });
  
  // Populate transaction location dropdowns
  const fromLocationSelect = document.getElementById('transactionFromLocation');
  const toLocationSelect = document.getElementById('transactionToLocation');
  
  fromLocationSelect.innerHTML = '<option value="">Select Location</option>';
  toLocationSelect.innerHTML = '<option value="">Select Location</option>';
  
  locationHierarchy.forEach(room => {
    fromLocationSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
    toLocationSelect.innerHTML += `<option value="${room._id}">${room.name}</option>`;
  });
  
  // Add event listener to room select for populating racks
  roomSelect.addEventListener('change', () => {
    populateRackDropdown(roomSelect.value);
  });
}

// Populate rack dropdown based on selected room
function populateRackDropdown(roomId) {
  const rackSelect = document.getElementById('itemRack');
  rackSelect.innerHTML = '<option value="">Select Rack</option>';
  
  if (!roomId) {
    rackSelect.disabled = true;
    document.getElementById('itemShelf').disabled = true;
    return;
  }
  
  // Find the selected room
  const room = locationHierarchy.find(r => r._id === roomId);
  
  if (room && room.racks && room.racks.length > 0) {
    rackSelect.disabled = false;
    
    room.racks.forEach(rack => {
      // Include room name in the rack option text for clarity
      rackSelect.innerHTML += `<option value="${rack._id}">${rack.name} (in ${room.name})</option>`;
    });
    
    // Add event listener to rack select for populating shelves
    rackSelect.addEventListener('change', () => {
      populateShelfDropdown(roomId, rackSelect.value);
    });
  } else {
    rackSelect.disabled = true;
    document.getElementById('itemShelf').disabled = true;
  }
}

// Populate shelf dropdown based on selected rack
function populateShelfDropdown(roomId, rackId) {
  const shelfSelect = document.getElementById('itemShelf');
  shelfSelect.innerHTML = '<option value="">Select Shelf</option>';
  
  if (!rackId) {
    shelfSelect.disabled = true;
    return;
  }
  
  // Find the selected room
  const room = locationHierarchy.find(r => r._id === roomId);
  
  if (!room) {
    shelfSelect.disabled = true;
    return;
  }
  
  // Find the selected rack
  const rack = room.racks.find(r => r._id === rackId);
  
  if (rack && rack.shelves && rack.shelves.length > 0) {
    shelfSelect.disabled = false;
    
    rack.shelves.forEach(shelf => {
      // Include room and rack names in the shelf option for clarity
      shelfSelect.innerHTML += `<option value="${shelf._id}">${shelf.name} (in ${rack.name}, ${room.name})</option>`;
    });
  } else {
    shelfSelect.disabled = true;
  }
}

// Get formatted location string
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

// Load item details by ID
async function loadItemDetails(itemId, isEdit = false) {
    try {
      // Show loading indicator
      showAlert('Loading item details...', 'info', 'alertContainer', false);
      
      const response = await fetchWithAuth(`${API_URL}/items/${itemId}`);
      
      if (!response) return;
      
      if (response.ok) {
        const item = await response.json();
        
        // Clear any previous alerts
        document.getElementById('alertContainer').innerHTML = '';
        
        // Open the modal with item details
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

// Open item modal with details
// Fixed openItemModal function with null checks
function openItemModal(item, isEdit = false) {
  try {




     // Set category and update form fields accordingly
  document.getElementById('itemCategory').value = item.category || '';
  updateFormFieldsBasedOnCategory(item.category || '');


// Reset barcode editing state whenever the modal opens
const changeBarcode = document.getElementById('changeBarcode');
if (changeBarcode) {
  changeBarcode.checked = false;
}

// Reset the barcode options form visibility
const newBarcodeForm = document.getElementById('newBarcodeForm');
if (newBarcodeForm) {
  newBarcodeForm.classList.add('d-none');
}


    const modal = document.getElementById('itemModal');
    const modalTitle = document.getElementById('itemModalTitle');
    const form = document.getElementById('itemForm');
    const saveBtn = document.getElementById('saveItemBtn');
    
    // Check if elements exist before proceeding
    if (!modal || !modalTitle || !form || !saveBtn) {
      console.error('Required modal elements not found');
      showAlert('Error loading item modal. Please refresh the page and try again.', 'danger');
      return;
    }
    
    // Reset generatedBarcode to ensure a fresh one if needed
    generatedBarcode = null;
    
    // Set modal title
    modalTitle.textContent = isEdit ? 'Edit Item' : 'Item Details';
    
    // Fill form fields
    document.getElementById('itemId').value = item._id || '';
    document.getElementById('itemName').value = item.name || '';
    // document.getElementById('itemCategory').value = item.category || '';

    const categorySelect = document.getElementById('itemCategory');
    const customCategoryGroup = document.getElementById('customCategoryGroup');
    const customCategoryInput = document.getElementById('customCategory');
    
    // Check if the item's category matches any of our predefined options
    const predefinedCategories = ['Task Trainer', 'Manikin', 'Consumable', 'Electronic', 'Other'];
    
    if (predefinedCategories.includes(item.category)) {
      // It's a standard category
      categorySelect.value = item.category;
      if (customCategoryGroup) customCategoryGroup.style.display = 'none';
    } else {
      // It's a custom category
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
        // Call populateRackDropdown but wait for it to finish before setting rack value
        populateRackDropdown(item.location.room._id);
        
        // We need to wait a moment for the rack dropdown to be populated
        setTimeout(() => {
          if (item.location.rack) {
            document.getElementById('itemRack').value = item.location.rack._id || '';
            populateShelfDropdown(item.location.room._id, item.location.rack._id);
            
            // Wait for shelf dropdown to be populated
            setTimeout(() => {
              if (item.location.shelf) {
                document.getElementById('itemShelf').value = item.location.shelf._id || '';
              }
            }, 100);
          }
        }, 100);
      }
    }
    
    // Set dates if available
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
    
    // Handle the barcode section - simplified for better user experience
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
        // View mode - hide all options
        if (barcodeOptionsSection) barcodeOptionsSection.classList.add('d-none');
        if (changeBarcodeSection) changeBarcodeSection.classList.add('d-none');
      }
    } else if (item._id && !item.barcode) {
      // EXISTING ITEM WITHOUT BARCODE (rare case)
      
      // Hide current barcode display
      if (currentBarcodeDisplay) currentBarcodeDisplay.classList.add('d-none');
      
      // In edit mode, show options to add a barcode
      if (isEdit) {
        if (barcodeOptionsSection) barcodeOptionsSection.classList.remove('d-none');
        if (newBarcodeOptionsSection) newBarcodeOptionsSection.classList.remove('d-none');
        if (changeBarcodeSection) changeBarcodeSection.classList.add('d-none');
        
        // Default to scanning an existing barcode
        document.getElementById('scanExisting').checked = true;
        document.getElementById('generateNew').checked = false;
        toggleBarcodeInputMethod();
      } else {
        // View mode - hide all options
        if (barcodeOptionsSection) barcodeOptionsSection.classList.add('d-none');
      }
    } else {
      // NEW ITEM
      
      // Hide current barcode display and change options
      if (currentBarcodeDisplay) currentBarcodeDisplay.classList.add('d-none');
      if (changeBarcodeSection) changeBarcodeSection.classList.add('d-none');
      
      // Show barcode type options
      if (barcodeOptionsSection) barcodeOptionsSection.classList.remove('d-none');
      if (newBarcodeOptionsSection) newBarcodeOptionsSection.classList.remove('d-none');
      
      // Default to generating a new barcode for new items
      document.getElementById('scanExisting').checked = false;
      document.getElementById('generateNew').checked = true;
      toggleBarcodeInputMethod();
    }
    
    // Set form fields readonly or editable based on mode
    const formFields = form.querySelectorAll('input, textarea, select');
    formFields.forEach(field => {
      field.readOnly = !isEdit;
      if (field.tagName === 'SELECT') {
        field.disabled = !isEdit;
      }
    });
    
    // Show/hide save button based on mode
    saveBtn.style.display = isEdit ? 'block' : 'none';
    
    // Open the modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
  } catch (error) {
    console.error('Error in openItemModal:', error);
    showAlert('Error loading item details. Please try again.', 'danger');
  }
}


// Update the category dropdown in the HTML
// Replace your current <select> for category with this:
function updateCategoryOptions() {
  const categorySelect = document.getElementById('itemCategory');
  
  // Clear existing options
  categorySelect.innerHTML = '';
  
  // Add default empty option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select Category';
  categorySelect.appendChild(defaultOption);
  
  // Define main categories
  const categories = [
    { value: 'Task Trainer', label: 'Task Trainer' },
    { value: 'Manikin', label: 'Manikin' },
    { value: 'Consumable', label: 'Consumable' },
    { value: 'Electronic', label: 'Electronic Device' }, // Merged category
    { value: 'Other', label: 'Other (Custom)' }
  ];
  
  // Add options to select
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.value;
    option.textContent = category.label;
    categorySelect.appendChild(option);
  });
}


document.addEventListener('DOMContentLoaded', function() {
  updateCategoryOptions();
  
  // Show/hide custom category field based on selection
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
  
  // Update the toggleBarcodeInputMethod function with null checks
  function toggleBarcodeInputMethod() {
    // Safely get elements
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
      // Hide preview when using existing barcode
      const previewSection = document.getElementById('previewGeneratedBarcode');
      if (previewSection) {
        previewSection.classList.add('d-none');
      }
    } else {
      scanBarcodeSection.classList.add('d-none');
      generatedBarcodeSection.classList.remove('d-none');
      
      // Only show a preview of the generated barcode if appropriate
      try {
        // Show a preview of what the generated barcode might look like
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
        
        // Initialize the radio buttons - default to using existing barcode
        const useExistingBarcode = document.getElementById('useExistingBarcode');
        const generateNewBarcode = document.getElementById('generateNewBarcode');
        
        if (useExistingBarcode && !useExistingBarcode.checked && !generateNewBarcode.checked) {
          useExistingBarcode.checked = true;
        }
        
        // Show/hide the appropriate form sections
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
  
  // listeners for the useExistingBarcode and generateNewBarcode elements
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
 * Fixed function to properly open the transaction modal
 * @param {string} itemId - The ID of the item
 * @param {string} itemName - The name of the item
 */







// function to fix transaction modal
function fixTransactionModal() {
  console.log('Fixing transaction modal...');
  
  // First, check if the modal exists in DOM
  const transactionModal = document.getElementById('transactionModal');
  if (!transactionModal) {
    console.error('Transaction modal element not found in the DOM!');
    return;
  }
  
  // Clean up any existing modal instances to prevent conflicts
  const existingModal = bootstrap.Modal.getInstance(transactionModal);
  if (existingModal) {
    existingModal.dispose();
  }
  
  // Remove any stray backdrop elements
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.remove();
  });
  
  // Remove modal-open class from body if present
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  
  // Make sure the modal is visible in DOM
  transactionModal.style.display = 'block';
  transactionModal.style.visibility = 'visible';
  transactionModal.classList.remove('hide');
  transactionModal.removeAttribute('aria-hidden');
  
  // Add dialog centered class for better positioning
  transactionModal.querySelector('.modal-dialog').classList.add('modal-dialog-centered');
  
  // Reattach transaction buttons event listeners
  document.querySelectorAll('.transaction-btn').forEach(btn => {
    // Clone and replace to remove old event listeners
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Transaction button clicked');
      
      const itemId = newBtn.dataset.id;
      const itemName = newBtn.dataset.name;
      
      if (itemId && itemName) {
        // openTransactionModal(itemId, itemName);
        fetchItemForTransaction(itemId);
      }
    });
  });

  // Create a fresh modal instance explicitly
  try {
    // Create a brand new modal instance
    const modalInstance = new bootstrap.Modal(transactionModal, {
      backdrop: true,
      keyboard: true,
      focus: true
    });
    
    // Store it for future reference
    window.currentTransactionModal = modalInstance;
  } catch (error) {
    console.error('Error creating modal instance:', error);
  }

  fixModals();
}





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





// Call this function at the end of your DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
  // ... other initialization code ...
  
  // // Set up transaction buttons
  // setupTransactionButtons();
  
  // Fix any modals that might have issues
  fixModals();
});

// Function to fix potential modal issues
function fixModals() {
  // Clean up any stray backdrops or broken modals
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.remove();
  });
  
  // Remove modal-open class if no modals are actually shown
  if (!document.querySelector('.modal.show')) {
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
  
  // Fix all modals on the page
  document.querySelectorAll('.modal').forEach(modal => {
    // Make sure hidden modals are actually hidden
    if (!modal.classList.contains('show')) {
      modal.style.display = 'none';
    }
    
    // Add proper event listeners for hiding
    modal.addEventListener('hidden.bs.modal', function() {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Remove any stray backdrops
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
      });
    });
  });
}

// Add this CSS fix to fix z-index issues
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

// Run this fix as soon as possible
addModalCssFix();

// Update transaction form based on type






// Create a utility function to properly close modals
function safeCloseModal(modalElement) {
  if (!modalElement) return;
  
  // First, shift focus away from any elements inside the modal
  document.body.focus();
  
  // Get the modal instance
  const modalInstance = bootstrap.Modal.getInstance(modalElement);
  if (!modalInstance) return;
  
  // Hide the modal
  modalInstance.hide();
  
  // Clean up after the modal is hidden
  setTimeout(() => {
    // Remove aria-hidden attribute
    modalElement.removeAttribute('aria-hidden');
    
    // Remove modal-open class from body
    document.body.classList.remove('modal-open');
    
    // Reset other modal-related styles
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Remove any leftover backdrops
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.remove();
    });
    
    // Make sure display style is set to none
    modalElement.style.display = 'none';
  }, 300); // Allow time for the modal hide animation to complete
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

    // Handle custom category if "Other" is selected
    if (category === 'Other') {
      const customCategory = document.getElementById('customCategory').value;
      if (customCategory && customCategory.trim() !== '') {
        finalCategory = customCategory.trim();
        categoryType = 'Custom';
      }
    } else {
      // For standard categories, use the category value as categoryType
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
    
    // Check if we have the new change barcode UI
    const changeBarcode = document.getElementById('changeBarcode');
    
    if (itemId) {
      // EXISTING ITEM
      console.log('Processing existing item with ID:', itemId);
      
      if (changeBarcode && changeBarcode.checked) {
        // User wants to change the barcode
        console.log('User is changing the barcode');
        const useExistingBarcode = document.getElementById('useExistingBarcode');
        
        if (useExistingBarcode && useExistingBarcode.checked) {
          // Using a new manually entered barcode
          barcode = document.getElementById('newItemBarcode')?.value || '';
          barcodeType = 'existing';
          console.log('Using new manually entered barcode:', barcode);
        } else {
          // Generate a new barcode
          barcodeType = 'generate';
          barcode = '';
          console.log('Will generate a new barcode on server');
        }
      } else {
        // Keep existing barcode
        const currentBarcodeValue = document.getElementById('currentBarcodeValue');
        const currentBarcodeType = document.getElementById('currentBarcodeType');
        
        if (currentBarcodeValue) {
          barcode = currentBarcodeValue.textContent;
          barcodeType = currentBarcodeType && currentBarcodeType.textContent.includes('Manufacturer') ? 
            'existing' : 'generate';
          
          console.log('Keeping existing barcode:', barcode, 'of type:', barcodeType);
        } else {
          // Fallback to original UI
          barcodeType = document.getElementById('scanExisting')?.checked ? 'existing' : 'generate';
          barcode = barcodeType === 'existing' ? document.getElementById('itemBarcode')?.value || '' : '';
          console.log('Using fallback barcode handling:', barcode, 'of type:', barcodeType);
        }
      }
    } else {
      // NEW ITEM
      console.log('Processing new item');
      
      const scanExisting = document.getElementById('scanExisting');
      
      if (scanExisting) {
        barcodeType = scanExisting.checked ? 'existing' : 'generate';
        barcode = barcodeType === 'existing' ? document.getElementById('itemBarcode')?.value || '' : '';
        console.log('New item barcode handling:', barcode, 'of type:', barcodeType);
      } else {
        // Default to generating a barcode
        barcodeType = 'generate';
        barcode = '';
        console.log('Defaulting to generating a barcode');
      }
    }
    
    // Validate barcode if using existing
    if (barcodeType === 'existing' && !barcode) {
      console.warn('Missing barcode for existing barcode type');
      showAlert('Please enter or scan the existing barcode', 'warning');
      return;
    }
    
    // Validate required fields
    if (!name || !category || !quantity || !room) {
      console.warn('Missing required fields');
      showAlert('Please fill in all required fields', 'danger');
      return;
    }
    
    // Prepare item data
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
    
    // Show loading state
    const saveBtn = document.getElementById('saveItemBtn');
    if (!saveBtn) {
      console.error('Save button not found');
      showAlert('Error: Save button not found', 'danger');
      return;
    }
    
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';
    saveBtn.disabled = true;
    
    // Determine if this is a create or update operation
    const apiUrl = itemId ? 
      `${API_URL}/items/${itemId}` : 
      `${API_URL}/items`;
    
    const method = itemId ? 'PUT' : 'POST';
    const messagePrefix = itemId ? 'Item updated' : 'Item created';
    
    console.log(`Making ${method} request to ${apiUrl}`);
    
    // Make API request
    fetchWithAuth(apiUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(itemData)
    })
    .then(response => {
      // Reset button state
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
          
          // Check if a barcode was generated or changed
          const hadNewBarcodeGenerated = 
            (!itemId && item.barcodeType === 'generate') || 
            (itemId && barcodeType === 'generate' && changeBarcode?.checked && 
             item.barcode !== document.getElementById('currentBarcodeValue')?.textContent);
          
          if (hadNewBarcodeGenerated) {
            if (confirm(`A new barcode (${item.barcode}) has been generated. Would you like to print it now?`)) {
              printBarcode(item);
            }
          }
          
          // Reload inventory
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
// Save transaction



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
    
    // Add rows (skip header and select all checkbox column)
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length <= 1) continue; // Skip "no items found" row
      
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
  // Get references to conditional fields
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
        // Consumables have simpler status options
        const outOfStockOption = document.createElement('option');
        outOfStockOption.value = 'Out of Stock';
        outOfStockOption.textContent = 'Out of Stock';
        statusSelect.appendChild(outOfStockOption);
        
        // Hide irrelevant fields for consumables
        if (maintenanceDatesGroup) maintenanceDatesGroup.style.display = 'none';
        break;
        
      case 'Task Trainer':
      case 'Manikin':
      case 'Electronic':
      case 'Device':
        // Equipment has all status options
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
        // Add all options for "Other" category
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
    
    // Show success message
    showAlert(`Item found: ${item.name}`, 'success');
    
    // Now open the modal with our direct method
    showEnhancedModalDirectly(item);
  } catch (error) {
    console.error('Error fetching item for transaction:', error);
    showAlert('Error loading item data', 'danger');
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



// Function to directly show the enhanced transaction modal without Bootstrap
function showEnhancedModalDirectly(item) {
  if (!item) return;
  
  // Get the modal element
  const modal = document.getElementById('enhancedTransactionModal');
  if (!modal) {
    console.error('Enhanced transaction modal not found');
    return;
  }
  
  // Clean up any existing modal state first
  closeEnhancedModalDirectly();
  
  // Manually add the classes and styles Bootstrap would add
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = '15px'; // Compensate for scrollbar
  
  // Create backdrop if it doesn't exist
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop fade show';
  backdrop.id = 'custom-modal-backdrop';
  document.body.appendChild(backdrop);
  
  // Show modal
  modal.classList.add('show');
  modal.style.display = 'block';
  modal.setAttribute('aria-modal', 'true');
  modal.removeAttribute('aria-hidden');
  
  // Set item details
  document.getElementById('enhancedTransactionItemId').value = item._id;
  document.getElementById('enhancedTransactionItem').value = item.name;
  
  // Configure transaction types based on item
  configureTransactionTypes(item);
  
  // Set quantity max
  const quantityInput = document.getElementById('enhancedTransactionQuantity');
  if (quantityInput) {
    const availableQuantity = item.availableQuantity !== undefined ? 
      item.availableQuantity : item.quantity;
    quantityInput.max = availableQuantity;
    quantityInput.value = 1;
  }
  
  console.log('Enhanced modal shown manually');
}

// Function to close the enhanced transaction modal
function closeEnhancedModalDirectly() {
  const modal = document.getElementById('enhancedTransactionModal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
    modal.removeAttribute('aria-modal');
    modal.setAttribute('aria-hidden', 'true');
  }
  
  // Remove backdrop - both with id and by class name to be thorough
  const customBackdrop = document.getElementById('custom-modal-backdrop');
  if (customBackdrop) {
    customBackdrop.remove();
  }
  
  document.querySelectorAll('.modal-backdrop').forEach(el => {
    el.remove();
  });
  
  // Reset body
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
    
// Add new item button
const addItemBtn = document.getElementById('addItemBtn');
if (addItemBtn) {
  addItemBtn.addEventListener('click', () => {
    // Reset form
    const itemForm = document.getElementById('itemForm');
    if (itemForm) itemForm.reset();
    
    // Clear hidden fields
    const itemId = document.getElementById('itemId');
    if (itemId) itemId.value = '';
    
    // IMPORTANT: Completely reset the barcode section to its original state
    // Hide the current barcode display
    const currentBarcodeDisplay = document.getElementById('currentBarcodeDisplay');
    if (currentBarcodeDisplay) currentBarcodeDisplay.classList.add('d-none');
    
    // Hide the change barcode section (this is only for editing)
    const changeBarcodeSection = document.getElementById('changeBarcodeSection');
    if (changeBarcodeSection) changeBarcodeSection.classList.add('d-none');
    
    // Reset the change barcode checkbox if it exists
    const changeBarcode = document.getElementById('changeBarcode');
    if (changeBarcode) changeBarcode.checked = false;
    
    // Hide the new barcode form (part of change barcode)
    const newBarcodeForm = document.getElementById('newBarcodeForm');
    if (newBarcodeForm) newBarcodeForm.classList.add('d-none');
    
    // Show the original barcode options section for new items
    const barcodeOptionsSection = document.getElementById('barcodeOptionsSection');
    if (barcodeOptionsSection) barcodeOptionsSection.classList.remove('d-none');
    
    // Show new barcode options section (radio buttons)
    const newBarcodeOptionsSection = document.getElementById('newBarcodeOptionsSection');
    if (newBarcodeOptionsSection) newBarcodeOptionsSection.classList.remove('d-none');
    
    // Set barcode radio buttons to default (generate)
    if (document.getElementById('generateNew')) {
      document.getElementById('generateNew').checked = true;
    }
    if (document.getElementById('scanExisting')) {
      document.getElementById('scanExisting').checked = false;
    }
    
    // Toggle barcode sections based on selected option
    toggleBarcodeInputMethod();



     // Set default category
     const categorySelect = document.getElementById('itemCategory');
     categorySelect.value = '';



       // Initialize form fields based on empty category
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

    
    // Handle modal hidden event (add this as a separate section)
    const itemModal = document.getElementById('itemModal');
    if (itemModal) {
      itemModal.addEventListener('hidden.bs.modal', function() {
        // Fix ARIA issues - this needs to happen first
        setTimeout(() => {
          // Remove focus from any elements inside the modal to prevent ARIA issues
          document.activeElement.blur();
          
          // Remove aria-hidden attribute and restore normal state
          itemModal.removeAttribute('aria-hidden');
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
          
          // Remove any stray backdrop elements
          const backdrops = document.querySelectorAll('.modal-backdrop');
          backdrops.forEach(backdrop => backdrop.remove());
        }, 10);
      });
    }
    
    // Save item button
    document.getElementById('saveItemBtn').addEventListener('click', saveItem);
  
  // Save transaction button
  // document.getElementById('saveTransactionBtn').addEventListener('click', saveTransaction);
  
  // Export button
  document.getElementById('exportBtn').addEventListener('click', exportToCSV);
  
  // Print button
  document.getElementById('printBtn').addEventListener('click', printInventory);
  
  // Print barcode button
document.getElementById('printBarcodeBtn').addEventListener('click', () => {
  // Get the item ID
  const itemId = document.getElementById('itemId').value;
  
  // If we have an item ID, fetch the latest data and print
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
    // For new items that haven't been saved yet
    showAlert('Please save the item first before printing the barcode', 'warning');
  }
});
  
  // Select all checkbox
  document.getElementById('selectAll').addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = e.target.checked;
    });
  });

// Add a button to the inventory page to test barcodes
const testBarcodesBtn = document.createElement('button');
testBarcodesBtn.className = 'btn btn-sm btn-outline-secondary ms-2';
testBarcodesBtn.innerHTML = '<i class="fas fa-vial me-1"></i> Test Barcodes';
testBarcodesBtn.addEventListener('click', testBarcodeScanning);

// Insert the button in the toolbar
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