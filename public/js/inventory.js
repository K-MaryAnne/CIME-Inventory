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
  
  // Handle transaction button clicks
  document.addEventListener('click', function(e) {
    if (e.target.matches('.transaction-btn') || e.target.closest('.transaction-btn')) {
      const button = e.target.matches('.transaction-btn') ? e.target : e.target.closest('.transaction-btn');
      const itemId = button.dataset.id;
      const itemName = button.dataset.name;
      
      if (itemId && itemName) {
        openTransactionModal(itemId, itemName);
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
  
  // Setup event listeners
  setupEventListeners();

  setupBarcodeEventListeners();
  
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
});


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






function setupBarcodeEventListeners() {
    // Quick barcode search (at the top of inventory page)
    document.getElementById('quickBarcodeSearch').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        const barcode = this.value.trim();
        if (barcode) {
          findItemByBarcode(barcode);
        }
      }
    });
// Quick scan button
document.getElementById('quickScanBtn').addEventListener('click', function() {
    showQuickScanModal();
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
    startBarcodeScanner('scannerPreview', 'itemBarcode');
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
}



function toggleBarcodeInputMethod() {
    const isScanExisting = document.getElementById('scanExisting').checked;
    const scanBarcodeSection = document.getElementById('scanBarcodeSection');
    const generatedBarcodeSection = document.getElementById('generatedBarcodeSection');
    
    if (!scanBarcodeSection || !generatedBarcodeSection) {
      console.error('Barcode sections not found in the DOM');
      return;
    }
    
    if (isScanExisting) {
      scanBarcodeSection.classList.remove('d-none');
      generatedBarcodeSection.classList.add('d-none');
    } else {
      scanBarcodeSection.classList.add('d-none');
      generatedBarcodeSection.classList.remove('d-none');
      
      // Show a preview of what the generated barcode might look like
      previewGeneratedBarcode();
    }
  }



  function previewGeneratedBarcode() {
    const prefix = 'CIME';
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const sampleBarcode = `${prefix}-${timestamp.substring(timestamp.length - 6)}-${random}`;
    
    // Show preview section
    document.getElementById('previewGeneratedBarcode').classList.remove('d-none');
    document.getElementById('generatedBarcodeValue').textContent = sampleBarcode;
    
    // Generate visual preview if JsBarcode is available
    if (typeof JsBarcode !== 'undefined') {
      try {
        // Create a new canvas for the barcode
        const canvas = document.createElement('canvas');
        document.getElementById('generatedBarcodeImage').innerHTML = '';
        document.getElementById('generatedBarcodeImage').appendChild(canvas);
        
        // Generate the barcode
        JsBarcode(canvas, sampleBarcode, {
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
    const category = item.category;
    
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
            padding: 20px;
          }
          .barcode-container {
            border: 1px solid #ddd;
            display: inline-block;
            padding: 15px;
            margin-bottom: 20px;
            width: 300px;
          }
          .item-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .item-category {
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
          }
          .barcode-value {
            font-family: monospace;
            margin-top: 10px;
            font-size: 12px;
          }
          .barcode-image {
            margin: 10px 0;
          }
          @media print {
            @page {
              size: 65mm 30mm; /* Label size */
              margin: 0;
            }
            body {
              padding: 5mm;
              margin: 0;
            }
            .barcode-container {
              border: none;
              padding: 0;
              width: 55mm;
            }
            .item-name {
              font-size: 10pt;
            }
            .item-category {
              font-size: 8pt;
            }
            .barcode-value {
              font-size: 8pt;
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
              // Generate barcode
              JsBarcode("#barcodeCanvas", "${barcode}", {
                format: "CODE128",
                lineColor: "#000",
                width: 2,
                height: 50,
                displayValue: false
              });
              
              // Print after a short delay to ensure barcode is rendered
              setTimeout(function() {
                window.print();
                window.setTimeout(function() {
                  window.close();
                }, 750);
              }, 200);
            } catch (e) {
              document.body.innerHTML += '<p style="color: red;">Error generating barcode: ' + e.message + '</p>';
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
            <div class="detail-label">Serial Number:</div>
            <div class="detail-value">${item.serialNumber || 'N/A'}</div>
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
              <small class="text-muted">${item.serialNumber || 'No S/N'}</small>
            </div>
          </div>
        </td>
        <td>${item.category}</td>
        <td>
          <span class="${item.quantity <= item.reorderLevel ? 'text-danger fw-bold' : ''}">${item.quantity} ${item.unit}</span>
        </td>
        <td>
          <span class="${getStatusBadgeClass(item.status)}">${item.status}</span>
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
    btn.addEventListener('click', () => {
      openTransactionModal(btn.dataset.id, btn.dataset.name);
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
    const locationsResponse = await fetchWithAuth(`${API_URL}/locations/hierarchy`);
    
    if (locationsResponse && locationsResponse.ok) {
      locationHierarchy = await locationsResponse.json();
      
      // Populate location dropdowns
      populateLocationDropdowns();
    }
    
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
      rackSelect.innerHTML += `<option value="${rack._id}">${rack.name}</option>`;
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
      shelfSelect.innerHTML += `<option value="${shelf._id}">${shelf.name}</option>`;
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
function openItemModal(item, isEdit = false) {
  const modal = document.getElementById('itemModal');
  const modalTitle = document.getElementById('itemModalTitle');
  const form = document.getElementById('itemForm');
  const saveBtn = document.getElementById('saveItemBtn');
  const barcodeRow = document.getElementById('barcodeRow');
  
  // Set modal title
  modalTitle.textContent = isEdit ? 'Edit Item' : 'Item Details';
  
  // Show/hide barcode section
  barcodeRow.style.display = item._id ? 'block' : 'none';
  
  // Fill form fields
  document.getElementById('itemId').value = item._id || '';
  document.getElementById('itemName').value = item.name || '';
  document.getElementById('itemCategory').value = item.category || '';
  document.getElementById('itemStatus').value = item.status || 'Available';
  document.getElementById('itemDescription').value = item.description || '';
  document.getElementById('itemSerialNumber').value = item.serialNumber || '';
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
      
      // Populate rack dropdown
      populateRackDropdown(item.location.room._id);
    }
    
    if (item.location.rack) {
      document.getElementById('itemRack').value = item.location.rack._id || '';
      
      // Populate shelf dropdown
      populateShelfDropdown(item.location.room._id, item.location.rack._id);
    }
    
    if (item.location.shelf) {
      document.getElementById('itemShelf').value = item.location.shelf._id || '';
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
  
   // Handle barcode display and options
   const currentBarcodeDisplay = document.getElementById('currentBarcodeDisplay');
  
   if (item._id && item.barcode) {
     // For existing items with barcodes
     currentBarcodeDisplay.classList.remove('d-none');
     document.getElementById('currentBarcodeValue').textContent = item.barcode;
     
     // Display the barcode type
     const barcodeTypeText = item.barcodeType === 'existing' ? 
       'Manufacturer Barcode' : 'Generated System Barcode';
     document.getElementById('currentBarcodeType').textContent = barcodeTypeText;
     
     // Display barcode image if available
     if (item.barcodeImageUrl) {
       document.getElementById('currentBarcodeImage').innerHTML = 
         `<img src="${item.barcodeImageUrl}" alt="Barcode" class="img-fluid">`;
     } else if (typeof JsBarcode !== 'undefined') {
       // Generate linear barcode for display
       try {
         const canvas = document.createElement('canvas');
         document.getElementById('currentBarcodeImage').innerHTML = '';
         document.getElementById('currentBarcodeImage').appendChild(canvas);
         
         JsBarcode(canvas, item.barcode, {
           format: "CODE128",
           lineColor: "#000",
           width: 2,
           height: 50,
           displayValue: false
         });
       } catch (error) {
         console.error('Error generating barcode display:', error);
         document.getElementById('currentBarcodeImage').innerHTML = 
           '<div class="text-muted">Barcode display unavailable</div>';
       }
     }
   } else {
     // For new items without barcodes yet
     currentBarcodeDisplay.classList.add('d-none');
   }
   
   // Set barcode options based on mode and existing data
   if (isEdit && item.barcodeType) {
     // For editing existing items
     if (item.barcodeType === 'existing') {
       document.getElementById('scanExisting').checked = true;
       document.getElementById('itemBarcode').value = item.barcode || '';
     } else {
       document.getElementById('generateNew').checked = true;
     }
     
     // Update the display of barcode input sections
     toggleBarcodeInputMethod();
   } else if (!isEdit) {
     // For view mode, just set the barcode field
     document.getElementById('itemBarcode').value = item.barcode || '';
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
}

// Open transaction modal
function openTransactionModal(itemId, itemName) {
  const modal = document.getElementById('transactionModal');
  const transactionItemId = document.getElementById('transactionItemId');
  const transactionItem = document.getElementById('transactionItem');
  const transactionType = document.getElementById('transactionType');
  
  // Reset form
  document.getElementById('transactionForm').reset();
  
  // Set item details
  transactionItemId.value = itemId;
  transactionItem.value = itemName;
  
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

// Save item
async function saveItem() {
    try {
      // Get form data
      const itemId = document.getElementById('itemId').value;
      const name = document.getElementById('itemName').value;
      const category = document.getElementById('itemCategory').value;
      const status = document.getElementById('itemStatus').value;
      const description = document.getElementById('itemDescription').value;
      const serialNumber = document.getElementById('itemSerialNumber').value;
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
      
      // Get barcode option and value
      const barcodeType = document.getElementById('scanExisting').checked ? 'existing' : 'generate';
      const barcode = document.getElementById('itemBarcode').value;
      
      // Validate barcode if using existing
      if (barcodeType === 'existing' && !barcode) {
        showAlert('Please enter or scan the existing barcode', 'warning');
        return;
      }
      
      // Validate required fields
      if (!name || !category || !quantity || !unitCost || !room) {
        showAlert('Please fill in all required fields', 'danger');
        return;
      }
      
      // Prepare item data
      const itemData = {
        name,
        category,
        status,
        description,
        serialNumber,
        barcode: barcodeType === 'existing' ? barcode : '',
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
      
      // Show loading state
      const saveBtn = document.getElementById('saveItemBtn');
      saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';
      saveBtn.disabled = true;
      
      let response;
      let messagePrefix;
      
      if (itemId) {
        // Update existing item
        response = await fetchWithAuth(`${API_URL}/items/${itemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(itemData)
        });
        messagePrefix = 'Item updated';
      } else {
        // Create new item
        response = await fetchWithAuth(`${API_URL}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(itemData)
        });
        messagePrefix = 'Item created';
      }
      
      // Reset button state
      saveBtn.innerHTML = 'Save Item';
      saveBtn.disabled = false;
      
      if (!response) {
        showAlert('Failed to connect to server', 'danger');
        return;
      }
      
      if (response.ok) {
        const item = await response.json();
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('itemModal')).hide();
        
        // Show success message
        showAlert(`${messagePrefix} successfully`, 'success');
        
        // If a barcode was generated, ask if they want to print it
        if (!itemId && item.barcodeType === 'generate') {
          if (confirm('A new barcode has been generated. Would you like to print it now?')) {
            printBarcode(item);
          }
        }
        
        // Reload inventory
        loadInventoryItems();
      } else {
        try {
          const errorData = await response.json();
          showAlert(errorData.message || `Failed to ${itemId ? 'update' : 'create'} item`, 'danger');
        } catch (e) {
          showAlert(`Failed to ${itemId ? 'update' : 'create'} item`, 'danger');
        }
      }
    } catch (error) {
      console.error('Save item error:', error);
      showAlert('Failed to connect to server. Please try again.', 'danger');
      
      // Reset button state
      const saveBtn = document.getElementById('saveItemBtn');
      saveBtn.innerHTML = 'Save Item';
      saveBtn.disabled = false;
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
      
      // Reload inventory
      loadInventoryItems();
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
    
    // Reset barcode elements
    document.getElementById('currentBarcodeDisplay').classList.add('d-none');
    
    // Set barcode radio buttons to default (generate)
    if (document.getElementById('generateNew')) {
      document.getElementById('generateNew').checked = true;
    }
    if (document.getElementById('scanExisting')) {
      document.getElementById('scanExisting').checked = false;
    }
    
    // Toggle barcode sections based on selected option
    toggleBarcodeInputMethod();
    
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
  document.getElementById('saveTransactionBtn').addEventListener('click', saveTransaction);
  
  // Export button
  document.getElementById('exportBtn').addEventListener('click', exportToCSV);
  
  // Print button
  document.getElementById('printBtn').addEventListener('click', printInventory);
  
  // Print barcode button
  document.getElementById('printBarcodeBtn').addEventListener('click', () => {
    const barcodeImage = document.getElementById('barcodeImage').innerHTML;
    const barcodeValue = document.getElementById('barcodeValue').textContent;
    const itemName = document.getElementById('itemName').value;
    
    // Create a new window
    const printWindow = window.open('', '_blank');
    
    // Write barcode content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - ${itemName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
          }
          .barcode-container {
            border: 1px solid #ddd;
            display: inline-block;
            padding: 15px;
            margin-bottom: 20px;
          }
          .item-name {
            font-weight: bold;
            margin-bottom: 10px;
          }
          .barcode-value {
            font-family: monospace;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          <div class="item-name">${itemName}</div>
          ${barcodeImage}
          <div class="barcode-value">${barcodeValue}</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.setTimeout(function() {
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  });
  
  // Select all checkbox
  document.getElementById('selectAll').addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = e.target.checked;
    });
  });
}