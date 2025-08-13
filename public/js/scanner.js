// public/js/scanner.js

// Global variables
let currentItemId = null;
let locationHierarchy = [];



let bulkMode = false;
let bulkItems = []; // Will store items for bulk transaction


function openBulkItemTransactionPicker(item) {
  let modal = document.getElementById('bulkItemTransactionModal');
  if (!modal) {
    console.error('Bulk transaction modal not found');
    return;
  }
  
  // Populate modal
  document.getElementById('bulkItemId').value = item._id;
  document.getElementById('bulkItemName').textContent = item.name;
  document.getElementById('bulkItemCategory').textContent = item.category;
  document.getElementById('bulkItemStatus').textContent = item.status;
  document.getElementById('bulkItemStatus').className = `badge ${getStatusBadgeClass(item.status)}`;
  
  populateBulkItemTransactionTypes(item);
  document.getElementById('bulkItemQuantity').value = 1;
  document.getElementById('bulkItemNotes').value = '';
  
  window.currentBulkItem = item;
  
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
  
  // Set up event listeners if not already done
  if (!window.bulkModalListenersSet) {
    setupBulkItemModalListeners();
    window.bulkModalListenersSet = true;
  }
}

function populateBulkItemTransactionTypes(item) {
  const typeSelect = document.getElementById('bulkItemTransactionType');
  typeSelect.innerHTML = '<option value="">Choose transaction type...</option>';
  
  const availableQuantity = item.availableQuantity !== undefined ? item.availableQuantity : item.quantity;
  
  if (item.category === 'Consumable') {
    typeSelect.innerHTML += '<option value="Restock">Add Stock</option>';
    if (availableQuantity > 0) {
      typeSelect.innerHTML += '<option value="Check-out">Use Up</option>';
      typeSelect.innerHTML += '<option value="Check Out for Session">Take for Session</option>';
    }
    const inSession = item.currentState?.inSession || 0;
    if (inSession > 0) {
      typeSelect.innerHTML += '<option value="Check-in">Return Unused</option>';
    }
  } else {
    typeSelect.innerHTML += '<option value="Restock">Add Equipment</option>';
    if (availableQuantity > 0) {
      typeSelect.innerHTML += '<option value="Check Out for Session">Use in Session</option>';
      typeSelect.innerHTML += '<option value="Send to Maintenance">Send for Repair</option>';
    }
    const inMaintenance = item.currentState?.inMaintenance || 0;
    const inSession = item.currentState?.inSession || 0;
    if (inMaintenance > 0) {
      typeSelect.innerHTML += '<option value="Return from Maintenance">Return from Repair</option>';
    }
    if (inSession > 0) {
      typeSelect.innerHTML += '<option value="Return from Session">Return from Session</option>';
    }
  }
}

function setupBulkItemModalListeners() {
  document.getElementById('decreaseQty').addEventListener('click', function() {
    const qtyInput = document.getElementById('bulkItemQuantity');
    const currentValue = parseInt(qtyInput.value) || 1;
    if (currentValue > 1) {
      qtyInput.value = currentValue - 1;
    }
  });
  
  document.getElementById('increaseQty').addEventListener('click', function() {
    const qtyInput = document.getElementById('bulkItemQuantity');
    const currentValue = parseInt(qtyInput.value) || 1;
    qtyInput.value = currentValue + 1;
  });
  
  document.getElementById('addToBulkListBtn').addEventListener('click', addItemToBulkList);
}

function addItemToBulkList() {
  const transactionType = document.getElementById('bulkItemTransactionType').value;
  const quantity = parseInt(document.getElementById('bulkItemQuantity').value);
  const notes = document.getElementById('bulkItemNotes').value;
  const item = window.currentBulkItem;
  
  if (!transactionType) {
    showAlert('Please select a transaction type', 'warning', 'bulkItemAlerts');
    return;
  }
  
  if (!quantity || quantity <= 0) {
    showAlert('Please enter a valid quantity', 'warning', 'bulkItemAlerts');
    return;
  }
  
  const bulkItemData = {
    ...item,
    bulkTransactionType: transactionType,
    bulkQuantity: quantity,
    bulkNotes: notes,
    bulkId: Date.now() + Math.random()
  };
  
  // Check if item already exists and replace it
  const existingIndex = bulkItems.findIndex(bulkItem => bulkItem._id === item._id);
  if (existingIndex >= 0) {
    bulkItems[existingIndex] = bulkItemData;
    showAlert(`Updated ${item.name} in bulk list`, 'info');
  } else {
    bulkItems.push(bulkItemData);
    showAlert(`Added ${item.name} to bulk list`, 'success');
  }
  
  updateBulkItemsDisplay();
  document.getElementById('bulkItemCount').textContent = bulkItems.length;
  document.getElementById('clearBulkItems').classList.remove('d-none');
  document.getElementById('processBulkItems').classList.remove('d-none');
  
  const modal = bootstrap.Modal.getInstance(document.getElementById('bulkItemTransactionModal'));
  modal.hide();
  
  playSuccessSound();
  setTimeout(() => {
    document.getElementById('barcodeInput').focus();
    document.getElementById('barcodeInput').value = '';
  }, 300);
}




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

// Fixed quantity limits function
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
  

  switch (transactionType) {
    case 'Stock Addition':
    case 'Add Stock':
    case 'Stock Adjustment':
  
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
  
      maxQuantity = item.availableQuantity || 0;
      defaultQuantity = Math.min(1, maxQuantity);
      break;
      
    case 'Return from Session':

      maxQuantity = item.currentState?.inSession || 0;
      defaultQuantity = Math.min(1, maxQuantity);
      break;
      
    case 'Return from Rental':
  
      maxQuantity = item.currentState?.rented || 0;
      defaultQuantity = Math.min(1, maxQuantity);
      break;
      
    case 'Return from Maintenance':
    
      maxQuantity = item.currentState?.inMaintenance || 0;
      defaultQuantity = Math.min(1, maxQuantity);
      break;
      
 
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
  

  quantityInput.max = maxQuantity;
  

  const currentValue = parseInt(quantityInput.value) || 0;
  if (currentValue > maxQuantity || currentValue <= 0) {
    quantityInput.value = Math.max(1, Math.min(defaultQuantity, maxQuantity));
  }
  

  const quantityLabel = document.querySelector(`label[for="${quantityInput.id}"]`);
  if (quantityLabel && maxQuantity > 0) {
    const originalText = quantityLabel.textContent.replace(/ \(max: \d+\)/, '');
    quantityLabel.textContent = `${originalText} (max: ${maxQuantity})`;
  }
  

  const isOutboundTransaction = [
    'Stock Consumption', 'Use Items', 'Stock Removal', 'Remove Stock',
    'Check Out for Session', 'Rent Out', 'Send to Maintenance',
    'Return from Session', 'Return from Rental', 'Return from Maintenance'
  ].includes(transactionType);
  
  if (isOutboundTransaction && maxQuantity <= 0) {
    quantityInput.disabled = true;
    quantityInput.value = 0;
    
 
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











function getMaxQuantityForItem(item) {

  if (item.maxForTransaction !== undefined) {
    return item.maxForTransaction;
  }

  return item.availableQuantity || item.quantity || 999;
}


// function toggleBulkMode() {
//   bulkMode = !bulkMode;

//   const bulkModeButton = document.getElementById('bulkModeToggle');
//   const bulkItemsContainer = document.getElementById('bulkItemsContainer');
  
//   if (!bulkModeButton || !bulkItemsContainer) {
//     console.error('Bulk mode elements not found');
//     return;
//   }
  
//   if (bulkMode) {

//     bulkModeButton.classList.replace('btn-outline-primary', 'btn-primary');
//     bulkModeButton.innerHTML = '<i class="fas fa-layer-group me-1"></i> Exit Bulk Mode';
//     bulkItemsContainer.classList.remove('d-none');
    
  
//     if (!document.getElementById('bulkItemsList').children.length) {
//       createBulkItemsDisplay();
//     }
    
//     showAlert('Bulk Mode activated. Scan multiple items, then process them all at once.', 'info');
//   } else {

//     bulkModeButton.classList.replace('btn-primary', 'btn-outline-primary');
//     bulkModeButton.innerHTML = '<i class="fas fa-layer-group me-1"></i> Bulk Mode';
    
   
//     if (bulkItems.length === 0) {
//       bulkItemsContainer.classList.add('d-none');
//     }
    
//     showAlert('Bulk Mode deactivated.', 'info');
//   }
  

//   document.getElementById('barcodeInput').focus();
// }

function toggleBulkMode() {
  bulkMode = !bulkMode;

  const bulkModeButton = document.getElementById('bulkModeToggle');
  const bulkItemsContainer = document.getElementById('bulkItemsContainer');
  const quickButtonsContainer = document.querySelector('.transaction-btn-group');
  
  if (bulkMode) {
    bulkModeButton.classList.replace('btn-outline-primary', 'btn-primary');
    bulkModeButton.innerHTML = '<i class="fas fa-layer-group me-1"></i> Exit Bulk Mode';
    bulkItemsContainer.classList.remove('d-none');
    
    // Hide quick transaction buttons
    if (quickButtonsContainer) {
      quickButtonsContainer.style.display = 'none';
    }
    
    if (!document.getElementById('bulkItemsList').children.length) {
      createBulkItemsDisplay();
    }
    
    showAlert('Bulk Mode activated. Scan items and choose individual transactions.', 'info');
  } else {
    bulkModeButton.classList.replace('btn-primary', 'btn-outline-primary');
    bulkModeButton.innerHTML = '<i class="fas fa-layer-group me-1"></i> Bulk Mode';
    
    // Show quick transaction buttons again
    if (quickButtonsContainer) {
      quickButtonsContainer.style.display = 'grid';
    }
    
    if (bulkItems.length === 0) {
      bulkItemsContainer.classList.add('d-none');
    }
    
    showAlert('Bulk Mode deactivated.', 'info');
  }
  
  document.getElementById('barcodeInput').focus();
}






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



function clearBulkItems() {
  if (bulkItems.length === 0) return;
  

  if (confirm(`Are you sure you want to clear all ${bulkItems.length} items?`)) {
    bulkItems = [];
    
  
    updateBulkItemsDisplay();
    
  
    document.getElementById('bulkItemCount').textContent = '0';
    

    document.getElementById('clearBulkItems').classList.add('d-none');
    document.getElementById('processBulkItems').classList.add('d-none');
    
 
    if (!bulkMode) {
      document.getElementById('bulkItemsContainer').classList.add('d-none');
    }
    
    showAlert('All bulk items cleared', 'info');
  }
}


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


function getMaxQuantityForItem(item) {

  if (item.maxForTransaction !== undefined) {
    return item.maxForTransaction;
  }

  return 999;
}
}



function createBulkItemsDisplay() {
  const container = document.getElementById('bulkItemsList');
  if (container) {
    container.innerHTML = '<div class="text-center py-3 text-muted">No items scanned yet. Start scanning to add items.</div>';
  } else {
    console.error('Bulk items list element not found');
  }
}


// function updateBulkItemsDisplay() {
//   const container = document.getElementById('bulkItemsList');
  
//   if (!container) {
//     console.error('Bulk items list container not found');
//     return;
//   }
  
//   if (bulkItems.length === 0) {
//     container.innerHTML = '<div class="text-center py-3 text-muted">No items scanned yet. Start scanning to add items.</div>';
//     return;
//   }

//   container.innerHTML = '';
  

//   bulkItems.forEach((item, index) => {
//     const itemElement = document.createElement('div');
//     itemElement.id = `bulk-item-${item._id}`;
//     itemElement.className = 'list-group-item';
    
//     const statusClass = getStatusClass(item.status);
//     const maxQuantity = getMaxQuantityForItem(item);
    
//     itemElement.innerHTML = `
//       <div class="d-flex justify-content-between align-items-center">
//         <div class="d-flex align-items-center flex-grow-1">
//           <span class="badge ${statusClass} me-2">${item.status}</span>
//           <div>
//             <div class="fw-semibold">${item.name}</div>
//             <small class="text-muted">${item.category}</small>
//           </div>
//         </div>
//         <div class="d-flex align-items-center">
//           <div class="input-group input-group-sm me-2" style="width: 120px;">
//             <button class="btn btn-outline-secondary decrease-quantity" type="button" data-index="${index}">-</button>
//             <input type="number" class="form-control text-center item-quantity" value="${item.bulkCount || 1}" 
//                    min="1" max="${maxQuantity}" data-index="${index}">
//             <button class="btn btn-outline-secondary increase-quantity" type="button" data-index="${index}">+</button>
//           </div>
//           <button class="btn btn-sm btn-outline-danger remove-bulk-item" data-index="${index}">
//             <i class="fas fa-times"></i>
//           </button>
//         </div>
//       </div>
//     `;
    
//     container.appendChild(itemElement);
//   });
  

//   document.querySelectorAll('.decrease-quantity').forEach(btn => {
//     btn.addEventListener('click', function() {
//       const index = parseInt(this.getAttribute('data-index'));
//       decreaseBulkItemQuantity(index);
//     });
//   });
  
//   document.querySelectorAll('.increase-quantity').forEach(btn => {
//     btn.addEventListener('click', function() {
//       const index = parseInt(this.getAttribute('data-index'));
//       increaseBulkItemQuantity(index);
//     });
//   });
  
//   document.querySelectorAll('.item-quantity').forEach(input => {
//     input.addEventListener('change', function() {
//       const index = parseInt(this.getAttribute('data-index'));
//       updateBulkItemQuantity(index, parseInt(this.value));
//     });
//   });
  

//   document.querySelectorAll('.remove-bulk-item').forEach(btn => {
//     btn.addEventListener('click', function() {
//       const index = parseInt(this.getAttribute('data-index'));
//       removeBulkItemByIndex(index);
//     });
//   });
// }
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

  container.innerHTML = '';
  
  bulkItems.forEach((item, index) => {
    const itemElement = document.createElement('div');
    itemElement.className = 'list-group-item';
    
    const statusClass = getStatusBadgeClass(item.status);
    const transactionIcon = getTransactionIcon(item.bulkTransactionType);
    const transactionLabel = getTransactionLabel(item.bulkTransactionType);
    
    itemElement.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div class="flex-grow-1">
          <div class="d-flex align-items-center mb-1">
            <span class="${statusClass} me-2">${item.status}</span>
            <div>
              <div class="fw-semibold">${item.name}</div>
              <small class="text-muted">${item.category}</small>
            </div>
          </div>
          <div class="d-flex align-items-center">
            <span class="badge bg-primary me-2">${transactionIcon} ${transactionLabel}</span>
            <small class="text-muted">Qty: ${item.bulkQuantity}</small>
          </div>
        </div>
        <div class="d-flex align-items-center">
          <button class="btn btn-sm btn-outline-danger remove-bulk-item" data-index="${index}">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
    
    container.appendChild(itemElement);
  });
  
  // Set up remove buttons
  document.querySelectorAll('.remove-bulk-item').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.dataset.index);
      removeBulkItemByIndex(index);
    });
  });
}

function getTransactionIcon(type) {
  const icons = { 
    'Restock': '•', 
    'Check-out': '×', 
    'Check Out for Session': '→', 
    'Check-in': '←', 
    'Send to Maintenance': '⚠', 
    'Return from Maintenance': '✓',
    'Return from Session': '←'
  };
  return icons[type] || '•';
}

function getTransactionLabel(type) {
  const labels = { 
    'Restock': 'Add Stock', 
    'Check-out': 'Use Up', 
    'Check Out for Session': 'Take for Session', 
    'Check-in': 'Return Unused', 
    'Send to Maintenance': 'Send for Repair', 
    'Return from Maintenance': 'Return from Repair',
    'Return from Session': 'Return from Session'
  };
  return labels[type] || type;
}


function decreaseBulkItemQuantity(index) {
  if (index >= 0 && index < bulkItems.length) {
    const currentCount = bulkItems[index].bulkCount || 1;
    if (currentCount > 1) {
      bulkItems[index].bulkCount = currentCount - 1;
      updateBulkItemsDisplay();
    }
  }
}


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


function updateBulkItemQuantity(index, newQuantity) {
  if (index >= 0 && index < bulkItems.length && newQuantity >= 1) {
    const maxCount = getMaxQuantityForItem(bulkItems[index]);
    
  
    bulkItems[index].bulkCount = Math.min(newQuantity, maxCount);
    updateBulkItemsDisplay();
  }
}





function removeBulkItemByIndex(index) {
  if (index >= 0 && index < bulkItems.length) {
    const removedItem = bulkItems[index];
    bulkItems.splice(index, 1);
  
    updateBulkItemsDisplay();
    

    document.getElementById('bulkItemCount').textContent = bulkItems.length;
    
 
    if (bulkItems.length === 0) {
      document.getElementById('clearBulkItems').classList.add('d-none');
      document.getElementById('processBulkItems').classList.add('d-none');
      
  
      if (!bulkMode) {
        document.getElementById('bulkItemsContainer').classList.add('d-none');
      }
    }
    
    showAlert(`Removed ${removedItem.name} from bulk items`, 'info');
  }
}



// function addToBulkItems(item) {
//   try {
//     const now = Date.now();
    
 
//     if (item.lastAddedTime && (now - item.lastAddedTime) < 500) {
//       console.log('Preventing duplicate add for', item.name);
//       return;
//     }
    
//     item.lastAddedTime = now;
    
//     console.log('Adding item to bulk list:', item.name);

//     const existingItemIndex = bulkItems.findIndex(i => i._id === item._id);
    
//     if (existingItemIndex >= 0) {
    
//       bulkItems[existingItemIndex].bulkCount = (bulkItems[existingItemIndex].bulkCount || 1) + 1;
      
     
//       updateBulkItemsDisplay();
      
//       showAlert(`Added another ${item.name} (total: ${bulkItems[existingItemIndex].bulkCount})`, 'success');
//     } else {

//       item.bulkCount = 1;
//       bulkItems.push(item);
      

//       updateBulkItemsDisplay();
      
//       showAlert(`Added ${item.name} to bulk items`, 'success');
//     }
   
//     const countElement = document.getElementById('bulkItemCount');
//     if (countElement) {
//       countElement.textContent = bulkItems.length;
//     }
    

//     const clearBtn = document.getElementById('clearBulkItems');
//     const processBtn = document.getElementById('processBulkItems');
    
//     if (clearBtn) clearBtn.classList.remove('d-none');
//     if (processBtn) processBtn.classList.remove('d-none');
    
  
//     const container = document.getElementById('bulkItemsContainer');
//     if (container) container.classList.remove('d-none');
    

//     if (typeof playSuccessSound === 'function') {
//       playSuccessSound();
//     }
    
//     console.log('Item added to bulk list successfully');
//   } catch (error) {
//     console.error('Error in addToBulkItems:', error);
//     throw error;
//   }
//   console.log('addToBulkItems called from:', new Error().stack);
// }
function addToBulkItems(item) {
  try {
    console.log('Opening transaction picker for:', item.name);
    openBulkItemTransactionPicker(item);
  } catch (error) {
    console.error('Error in addToBulkItems:', error);
    showAlert('Error adding item: ' + error.message, 'danger');
  }
}


function removeBulkItem(itemId) {
  const itemIndex = bulkItems.findIndex(item => item._id === itemId);
  
  if (itemIndex !== -1) {
    const removedItem = bulkItems[itemIndex];
    bulkItems.splice(itemIndex, 1);
    
 
    updateBulkItemsDisplay();
    
   
    document.getElementById('bulkItemCount').textContent = bulkItems.length;
    
    
    if (bulkItems.length === 0) {
      document.getElementById('clearBulkItems').classList.add('d-none');
      document.getElementById('processBulkItems').classList.add('d-none');
      
    
      if (!bulkMode) {
        document.getElementById('bulkItemsContainer').classList.add('d-none');
      }
    }
    
    showAlert(`Removed ${removedItem.name} from bulk items`, 'info');
  }
}


function clearBulkItems() {
  if (bulkItems.length === 0) return;
  

  if (confirm(`Are you sure you want to clear all ${bulkItems.length} items?`)) {
    bulkItems = [];
    
   
    updateBulkItemsDisplay();
    

    document.getElementById('bulkItemCount').textContent = '0';
    
  
    document.getElementById('clearBulkItems').classList.add('d-none');
    document.getElementById('processBulkItems').classList.add('d-none');
    
    
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

function setupEventListeners() {

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
  

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.body.classList.toggle('sidebar-toggled');
  });
  
 
  document.getElementById('searchButton').addEventListener('click', () => {
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput.value.trim()) {
      searchItem(barcodeInput.value.trim());
    } else {
      showAlert('Please enter a barcode', 'warning');
    }
  });
  

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
  

  document.addEventListener('click', (e) => {

    if (!e.target.closest('input, button, select, textarea, .dropdown-menu, .modal')) {
      document.getElementById('barcodeInput').focus();
    }
  });
  

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(() => {
        document.getElementById('barcodeInput').focus();
      }, 100);
    }
  });

  
}


async function searchItem(barcode) {
  try {
 
    document.getElementById('itemDetails').innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary mb-3" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mb-0">Searching for item...</p>
      </div>
    `;
    
 
    document.getElementById('barcodeInput').value = barcode;
    

    document.getElementById('barcodeInput').classList.add('highlight-scan');
    setTimeout(() => {
      document.getElementById('barcodeInput').classList.remove('highlight-scan');
    }, 300);
    
  
    playBeepSound();
    
   
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
      

      if (bulkMode) {
        try {
      
          addToBulkItems(item);
          
   
          resetItemDetails();
          
      
          document.getElementById('barcodeInput').value = '';
          document.getElementById('barcodeInput').focus();
        } catch (error) {
          console.error('Error adding item to bulk list:', error);
          showAlert('Error adding item to bulk list: ' + error.message, 'danger');
        }
      } else {
   
        displayItemDetails(item);
        
    
        loadItemTransactions(item._id);
        
     
        showAlert(`Item found: ${item.name}`, 'success');
        
     
        setTimeout(() => {
          document.getElementById('barcodeInput').select();
        }, 100);
      }
    } else {

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
      

      document.getElementById('transactionsTable').innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4">No transactions found</td>
        </tr>
      `;
      
    
      document.getElementById('itemActions').classList.add('d-none');
      

      if (response.status === 404) {
        showAlert(`Item with barcode "${barcode}" not found.`, 'warning');
      } else {
        showAlert('Failed to search for item', 'danger');
      }
      
    
      setTimeout(() => {
        document.getElementById('barcodeInput').select();
      }, 100);
    }
  } catch (error) {
    console.error('Search error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    

    resetItemDetails();
  }
}

function playBeepSound() {
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
  }






function playSuccessSound() {
    try {
     
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
   
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      oscillator1.type = 'sine';
      oscillator1.frequency.value = 1200;
      gainNode1.gain.value = 0.1;
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      

      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      oscillator2.type = 'sine';
      oscillator2.frequency.value = 1500;
      gainNode2.gain.value = 0.1;
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
     
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



function displayItemDetails(item) {

  currentItemId = item._id;
  
 
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

 
  const availableQuantity = item.availableQuantity !== undefined ? 
    item.availableQuantity : item.quantity;

  const inMaintenanceCount = item.currentState?.inMaintenance || 0;
  const inSessionCount = item.currentState?.inSession || 0;
  const rentedCount = item.currentState?.rented || 0;
  
 
  const totalOut = inMaintenanceCount + inSessionCount + rentedCount;
  

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
        <div class="d-flex justify-content-between align-items-start mb-3">
          <h5 class="item-name mb-0">${item.name}</h5>
          <div class="text-end">
            <span class="${getStatusBadgeClass(item.status)}">${item.status}</span>
            <br>
            <span class="badge bg-secondary mt-1">${item.category}</span>
          </div>
        </div>
        
        <!-- Quantity Information Card -->
        <div class="card mb-3">
          <div class="card-header py-2">
            <h6 class="mb-0"><i class="fas fa-chart-pie me-2"></i>Quantity Overview</h6>
          </div>
          <div class="card-body py-2">
            <div class="row g-2">
              <div class="col-6">
                <div class="text-center p-2 bg-light rounded">
                  <div class="h5 mb-0 text-primary">${item.quantity}</div>
                  <small class="text-muted">Total Owned</small>
                </div>
              </div>
              <div class="col-6">
                <div class="text-center p-2 ${availableQuantity > 0 ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'} rounded">
                  <div class="h5 mb-0 ${availableQuantity > 0 ? 'text-success' : 'text-danger'}">${availableQuantity}</div>
                  <small class="text-muted">Available</small>
                </div>
              </div>
            </div>
            
            ${item.category === 'Consumable' ? `
              <div class="mt-2">
                <div class="progress" style="height: 6px;">
                  <div class="progress-bar ${availableQuantity <= item.reorderLevel ? 'bg-danger' : 'bg-success'}" 
                       style="width: ${Math.max(5, (availableQuantity / Math.max(item.quantity, item.reorderLevel * 2)) * 100)}%"></div>
                </div>
                <div class="d-flex justify-content-between mt-1">
                  <small class="text-muted">0</small>
                  <small class="text-${availableQuantity <= item.reorderLevel ? 'danger' : 'muted'}">
                    Reorder at: ${item.reorderLevel}
                  </small>
                  <small class="text-muted">${Math.max(item.quantity, item.reorderLevel * 2)}</small>
                </div>
              </div>
            ` : ''}
            
            ${item.category !== 'Consumable' && totalOut > 0 ? `
              <div class="mt-2">
                <small class="text-muted d-block mb-1">Items Currently Out:</small>
                <div class="d-flex flex-wrap gap-1">
                  ${inMaintenanceCount > 0 ? `<span class="badge bg-info">${inMaintenanceCount} in maintenance</span>` : ''}
                  ${inSessionCount > 0 ? `<span class="badge bg-warning">${inSessionCount} in use</span>` : ''}
                  ${rentedCount > 0 ? `<span class="badge bg-primary">${rentedCount} rented</span>` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Item Details -->
        <div class="row g-2">
          <div class="col-sm-6">
            <div class="detail-row">
              <div class="detail-label">Location:</div>
              <div class="detail-value">${location}</div>
            </div>
          </div>
          <div class="col-sm-6">
            <div class="detail-row">
              <div class="detail-label">AKU No.:</div>
              <div class="detail-value">${item.akuNo || 'N/A'}</div>
            </div>
          </div>
          <div class="col-sm-6">
            <div class="detail-row">
              <div class="detail-label">Unit Cost:</div>
              <div class="detail-value">${formatCurrency(item.unitCost)}</div>
            </div>
          </div>
          <div class="col-sm-6">
            <div class="detail-row">
              <div class="detail-label">Total Value:</div>
              <div class="detail-value">${formatCurrency((item.quantity || 0) * (item.unitCost || 0))}</div>
            </div>
          </div>
        </div>
        
        ${item.description ? `
          <div class="mt-3">
            <div class="detail-label mb-1">Description:</div>
            <p class="small text-muted mb-0">${item.description}</p>
          </div>
        ` : ''}
        
        ${item.notes ? `
          <div class="mt-2">
            <div class="detail-label mb-1">Notes:</div>
            <p class="small text-muted mb-0">${item.notes}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  

  document.getElementById('itemDetails').innerHTML = detailsHtml;
  
 
  if (typeof JsBarcode !== 'undefined' && item.barcode) {
    const barcodeDisplay = document.getElementById('barcodeDisplay');
    if (barcodeDisplay) {
      try {
        const canvas = document.createElement('canvas');
        barcodeDisplay.appendChild(canvas);
        
        JsBarcode(canvas, item.barcode, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 50,
          displayValue: false,
          margin: 10
        });
      } catch (e) {
        console.error('Error generating barcode display:', e);
        barcodeDisplay.innerHTML = '<div class="text-muted small">Error displaying barcode</div>';
      }
    }
  }
  

  document.getElementById('itemActions').classList.remove('d-none');
  
 
  document.getElementById('transactionItemId').value = item._id;
  document.getElementById('transactionItem').value = item.name;
  

  updateTransactionButtonsForItem(item);
  

  transactionItemData = item;
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
    
    const totalOut = (item.currentState?.inMaintenance || 0) + 
                     (item.currentState?.inSession || 0) + 
                     (item.currentState?.rented || 0);
    
  
    let statusDisplay = item.status;
    let statusClass = getStatusBadgeClass(item.status);
    
   
    if (item.category !== 'Consumable' && totalOut > 0) {
      const breakdown = [];
      if (item.currentState?.inMaintenance > 0) {
        breakdown.push(`${item.currentState.inMaintenance} maintenance`);
      }
      if (item.currentState?.inSession > 0) {
        breakdown.push(`${item.currentState.inSession} in use`);
      }
      if (item.currentState?.rented > 0) {
        breakdown.push(`${item.currentState.rented} rented`);
      }
      
      if (breakdown.length > 0) {
        statusDisplay += ` (${breakdown.join(', ')})`;
      }
    }
    

    const isLowStock = item.category === 'Consumable' && availableQuantity <= item.reorderLevel;
    
    html += `
      <tr data-id="${item._id}" class="${isLowStock ? 'table-warning' : ''}">
        <td>
          <div class="form-check">
            <input class="form-check-input item-checkbox" type="checkbox" value="${item._id}">
          </div>
        </td>
        <td>
          <div class="d-flex align-items-center">
            <div>
              <h6 class="mb-0">${item.name}</h6>
              <small class="text-muted">${item.akuNo || 'No AKU No.'}</small>
              ${item.barcode ? `<br><small class="text-muted font-monospace">${item.barcode}</small>` : ''}
            </div>
          </div>
        </td>
        <td>
          <span class="badge bg-secondary">${item.category}</span>
        </td>
        <td>
          <div>
            <strong class="${isLowStock ? 'text-danger' : ''}">${item.quantity} ${item.unit}</strong>
            ${item.category !== 'Consumable' && availableQuantity !== item.quantity ? 
              `<br><small class="text-success">${availableQuantity} available</small>` : ''}
            ${item.category === 'Consumable' && availableQuantity !== item.quantity ? 
              `<br><small class="text-success">${availableQuantity} in stock</small>` : ''}
            ${isLowStock ? '<br><span class="badge bg-danger">Low Stock</span>' : ''}
          </div>
        </td>
        <td>
          <span class="${statusClass}">${statusDisplay}</span>
        </td>
        <td>${location}</td>
        <td>
          <div class="btn-group">
            <button type="button" class="btn btn-sm btn-outline-primary view-btn" data-id="${item._id}" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-success transaction-btn" data-id="${item._id}" data-name="${item.name}" title="Create Transaction">
              <i class="fas fa-exchange-alt"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary edit-btn manager-only ${!isInventoryManager() ? 'd-none' : ''}" data-id="${item._id}" title="Edit Item">
              <i class="fas fa-edit"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger delete-btn admin-only ${!isAdmin() ? 'd-none' : ''}" data-id="${item._id}" title="Delete Item">
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
  

  function playSuccessSound() {
    try {
    
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
  
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      oscillator1.type = 'sine';
      oscillator1.frequency.value = 1200;
      gainNode1.gain.value = 0.1;
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      
   
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      oscillator2.type = 'sine';
      oscillator2.frequency.value = 1500;
      gainNode2.gain.value = 0.1;
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
  
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


function resetItemDetails() {
  document.getElementById('itemDetails').innerHTML = `
    <div class="text-center py-5">
      <i class="fas fa-barcode fa-3x mb-3 text-muted"></i>
      <p class="mb-0">Scan a barcode or enter it manually to view item details</p>
    </div>
  `;
  
 
  const itemActions = document.getElementById('itemActions');
  if (itemActions) {
    itemActions.classList.add('d-none');
  }

  currentItemId = null;
}






function enableQuickTransactionButtons(itemStatus) {

    document.getElementById('checkInBtn').disabled = false;
    document.getElementById('checkOutBtn').disabled = false;
    document.getElementById('maintenanceBtn').disabled = false;
    document.getElementById('restockBtn').disabled = false;
    

    switch (itemStatus) {
      case 'Out of Stock':
       
        document.getElementById('checkInBtn').disabled = true;
        document.getElementById('checkOutBtn').disabled = true;
        document.getElementById('maintenanceBtn').disabled = true;
        break;
      case 'Under Maintenance':
      
        document.getElementById('checkOutBtn').disabled = true;
        document.getElementById('maintenanceBtn').disabled = true;
        document.getElementById('restockBtn').disabled = true;
        break;
      case 'Rented':
 
        document.getElementById('checkOutBtn').disabled = true;
        document.getElementById('maintenanceBtn').disabled = true;
        document.getElementById('restockBtn').disabled = true;
        break;
      case 'Available':
  
        document.getElementById('checkInBtn').disabled = true;
        break;
    }
  }






function disableQuickTransactionButtons() {
    document.getElementById('checkInBtn').disabled = true;
    document.getElementById('checkOutBtn').disabled = true;
    document.getElementById('maintenanceBtn').disabled = true;
    document.getElementById('restockBtn').disabled = true;
  }





async function loadItemTransactions(itemId) {
  try {
  
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
      
     
      let html = '';
      
      data.transactions.forEach(transaction => {
        const time = formatDate(transaction.timestamp);
        const itemName = transaction.item ? transaction.item.name : 'N/A';
        const type = transaction.type || 'N/A';
        const quantity = transaction.quantity || 0;
        const userName = transaction.performedBy ? transaction.performedBy.name : 'N/A';
        
      
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


async function loadLocations() {
  try {

    const response = await fetchWithAuth(`${API_URL}/locations/hierarchy`);
    
    if (!response) return;
    
    if (response.ok) {
      locationHierarchy = await response.json();
      
    
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


function openTransactionModal() {
  if (!currentItemId) return;
  
  const modal = document.getElementById('transactionModal');
  const transactionType = document.getElementById('transactionType');
  
  // Reset form
  document.getElementById('transactionForm').reset();
  

 
  transactionType.addEventListener('change', () => {
    updateTransactionForm(transactionType.value);
  });
 
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
  
 
  setTimeout(() => {

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
// function processBulkItems() {
//   if (bulkItems.length === 0) {
//     showAlert('No items to process', 'warning');
//     return;
//   }
  
//   // Open the bulk transaction modal
//   openBulkTransactionModal();
// }
function processBulkItems() {
  if (bulkItems.length === 0) {
    showAlert('No items to process', 'warning');
    return;
  }
  
  processBulkItemsDirectly();
}

async function processBulkItemsDirectly() {
  try {
    const processBtn = document.getElementById('processBulkItems');
    const originalText = processBtn.innerHTML;
    processBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';
    processBtn.disabled = true;
    
    let success = 0, failed = 0;
    
    for (let i = 0; i < bulkItems.length; i++) {
      const item = bulkItems[i];
      
      const transactionData = {
        type: item.bulkTransactionType,
        quantity: item.bulkQuantity,
        notes: item.bulkNotes || ''
      };
      
      try {
        const response = await fetchWithAuth(`${API_URL}/items/${item._id}/enhanced-transaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData)
        });
        
        if (response.ok) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }
    
    processBtn.innerHTML = originalText;
    processBtn.disabled = false;
    
    if (failed === 0) {
      showAlert(`Successfully processed ${success} transactions!`, 'success');
      clearBulkItems();
    } else {
      showAlert(`Processed ${success} items, ${failed} failed`, 'warning');
    }
    
  } catch (error) {
    showAlert('Error processing bulk transactions', 'danger');
  }
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
  

  populateBulkTransactionTypes();
  

  populateBulkLocationDropdowns();
  

  const modal = new bootstrap.Modal(document.getElementById('bulkTransactionModal'));
  modal.show();
}

// Populate transaction type dropdown based on items
// function populateBulkTransactionTypes() {
//   const typeSelect = document.getElementById('bulkTransactionType');
//   typeSelect.innerHTML = '<option value="">Select Transaction Type</option>';
  
//   // Determine common categories
//   const hasConsumables = bulkItems.some(item => item.category === 'Consumable');
//   const hasEquipment = bulkItems.some(item => item.category !== 'Consumable');
  

//   if (hasConsumables && hasEquipment) {
//     typeSelect.innerHTML += `
//       <option value="Stock Addition">Add Stock</option>
//       <option value="Stock Removal">Remove Stock</option>
//     `;
//   } else if (hasConsumables) {
//     // Consumable operations
//     typeSelect.innerHTML += `
//       <option value="Stock Addition">Add Stock</option>
//       <option value="Stock Removal">Remove Stock</option>
//     `;
//   } else {
//     // Equipment operations
//     typeSelect.innerHTML += `
//       <option value="Stock Addition">Add Stock</option>
//       <option value="Stock Removal">Remove Stock</option>
//       <option value="Relocate">Relocate</option>
//       <option value="Check Out for Session">Use in Session</option>
//       <option value="Rent Out">Rent Out</option>
//       <option value="Send to Maintenance">Send to Maintenance</option>
//     `;
    

//     const hasMaintenanceItems = bulkItems.some(item => item.currentState?.inMaintenance > 0);
//     const hasSessionItems = bulkItems.some(item => item.currentState?.inSession > 0);
//     const hasRentedItems = bulkItems.some(item => item.currentState?.rented > 0);
    
//     if (hasMaintenanceItems) {
//       typeSelect.innerHTML += `<option value="Return from Maintenance">Return from Maintenance</option>`;
//     }
    
//     if (hasSessionItems) {
//       typeSelect.innerHTML += `<option value="Return from Session">Return from Session</option>`;
//     }
    
//     if (hasRentedItems) {
//       typeSelect.innerHTML += `<option value="Return from Rental">Return from Rental</option>`;
//     }
//   }

//   typeSelect.addEventListener('change', function() {
//     updateBulkTransactionForm(this.value);
//   });
// }


// Fixed populateBulkTransactionTypes function - scanner.js
function populateBulkTransactionTypes() {
  const typeSelect = document.getElementById('bulkTransactionType');
  typeSelect.innerHTML = '<option value="">Select Transaction Type</option>';
  
  // Determine what types of items we have
  const hasConsumables = bulkItems.some(item => item.category === 'Consumable');
  const hasEquipment = bulkItems.some(item => item.category !== 'Consumable');
  
  console.log('Bulk items analysis:', { hasConsumables, hasEquipment, totalItems: bulkItems.length });
  
  // Add transaction options based on item types
  if (hasConsumables && hasEquipment) {
    // MIXED ITEMS - Only common operations
    typeSelect.innerHTML += `
      <option value="Restock">Add Stock</option>
      <option value="Stock Removal">Remove Stock (Disposal)</option>
    `;
  } else if (hasConsumables) {
    // CONSUMABLES ONLY
    typeSelect.innerHTML += `
      <option value="Restock">Add Stock</option>
      <option value="Check-out">Use Items (Permanent)</option>
      <option value="Check Out for Session">Take for Session (Returnable)</option>
      <option value="Stock Removal">Remove Stock (Disposal)</option>
      <option value="Stock Adjustment">Adjust Stock (Correction)</option>
    `;
    
    // Check if any consumables have items in session
    const hasSessionItems = bulkItems.some(item => 
      item.currentState?.inSession > 0
    );
    
    if (hasSessionItems) {
      typeSelect.innerHTML += `<option value="Check-in">Return Unused from Session</option>`;
    }
    
  } else {
    // EQUIPMENT ONLY
    typeSelect.innerHTML += `
      <option value="Restock">Add Equipment</option>
      <option value="Stock Removal">Remove Equipment (Disposal/Sale)</option>
      <option value="Relocate">Relocate Items</option>
      <option value="Check Out for Session">Use in Session</option>
      <option value="Rent Out">Rent Out</option>
      <option value="Send to Maintenance">Send to Maintenance</option>
    `;
    
    // Check for return options
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

  // Set up change event listener
  typeSelect.addEventListener('change', function() {
    updateBulkTransactionForm(this.value);
  });
}

// Fixed updateBulkTransactionForm function
function updateBulkTransactionForm(type) {
  console.log('Updating bulk form for transaction type:', type);
  
  // Get all form groups
  const fromLocationGroup = document.getElementById('bulkFromLocationGroup');
  const toLocationGroup = document.getElementById('bulkToLocationGroup');
  const sessionGroup = document.getElementById('bulkSessionGroup');
  const rentalGroup = document.getElementById('bulkRentalGroup');
  const maintenanceGroup = document.getElementById('bulkMaintenanceGroup');
  
  // Hide all groups first
  if (fromLocationGroup) fromLocationGroup.style.display = 'none';
  if (toLocationGroup) toLocationGroup.style.display = 'none';
  if (sessionGroup) sessionGroup.style.display = 'none';
  if (rentalGroup) rentalGroup.style.display = 'none';
  if (maintenanceGroup) maintenanceGroup.style.display = 'none';
  
  // Show relevant groups based on transaction type
  switch (type) {
    case 'Restock':
    case 'Stock Addition':
      // Adding stock - show destination
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
      
    case 'Check-out':
    case 'Stock Consumption':
      // Using items - show destination
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
      
    case 'Stock Removal':
    case 'Remove Stock':
      // Removing stock - show source
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      break;
      
    case 'Relocate':
      // Moving items - show both locations
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
      
    case 'Check Out for Session':
      // Session use - show locations and session details
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      if (sessionGroup) sessionGroup.style.display = 'block';
      break;
      
    case 'Return from Session':
    case 'Check-in':
      // Returning from session - show source and session details
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (sessionGroup) sessionGroup.style.display = 'block';
      break;
      
    case 'Rent Out':
      // Renting out - show source and rental details
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (rentalGroup) rentalGroup.style.display = 'block';
      break;
      
    case 'Return from Rental':
      // Returning from rental - show source and rental details
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (rentalGroup) rentalGroup.style.display = 'block';
      break;
      
    case 'Send to Maintenance':
    case 'Maintenance':
      // Sending to maintenance - show source and maintenance details
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (maintenanceGroup) maintenanceGroup.style.display = 'block';
      break;
      
    case 'Return from Maintenance':
      // Returning from maintenance - show source and maintenance details
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (maintenanceGroup) maintenanceGroup.style.display = 'block';
      break;
  }

  // Update quantity limits for all items
  updateBulkQuantityLimits(type);
}





function updateBulkQuantityLimits(type) {
  console.log('Updating bulk quantity limits for type:', type);
  
  let updatedDisplay = false;
  
  // Update max quantities for each item
  bulkItems.forEach((item, index) => {
    const oldMax = getMaxQuantityForItem(item);
    let newMax;
    
    // Calculate new max based on transaction type and item category
    if (item.category === 'Consumable') {
      switch(type) {
        case 'Restock':
        case 'Stock Addition':
          newMax = 9999; // No limit for adding stock
          break;
        case 'Check-out':
        case 'Stock Consumption':
        case 'Stock Removal':
        case 'Remove Stock':
        case 'Check Out for Session':
          newMax = item.availableQuantity || item.quantity;
          break;
        case 'Return from Session':
        case 'Check-in':
          newMax = item.currentState?.inSession || 0;
          break;
        default:
          newMax = item.availableQuantity || item.quantity;
      }
    } else {
      // Equipment logic
      switch(type) {
        case 'Restock':
        case 'Stock Addition':
          newMax = 9999;
          break;
        case 'Stock Removal':
        case 'Remove Stock':
        case 'Relocate':
        case 'Check Out for Session':
        case 'Rent Out':
        case 'Send to Maintenance':
        case 'Maintenance':
          newMax = item.availableQuantity || item.quantity;
          break;
        case 'Return from Session':
          newMax = item.currentState?.inSession || 0;
          break;
        case 'Return from Rental':
          newMax = item.currentState?.rented || 0;
          break;
        case 'Return from Maintenance':
          newMax = item.currentState?.inMaintenance || 0;
          break;
        default:
          newMax = 1;
      }
    }
    
    // Update the item's max quantity
    if (oldMax !== newMax) {
      item.maxForTransaction = newMax;
      
      // Adjust bulk count if it exceeds new max
      if (item.bulkCount > newMax) {
        item.bulkCount = Math.max(1, newMax);
        updatedDisplay = true;
      }
    }
  });
  
  // Update the display if quantities changed
  if (updatedDisplay) {
    updateBulkItemsDisplay();
  }
  
  // Show warning for items that can't be processed
  const zeroMaxItems = bulkItems.filter(item => (item.maxForTransaction || 0) === 0);
  if (zeroMaxItems.length > 0) {
    let warningMsg = `Warning: The following items cannot be processed with "${type}":`;
    zeroMaxItems.forEach(item => {
      warningMsg += `<br>• ${item.name} (${item.category})`;
    });
    
    showAlert(warningMsg, 'warning', 'bulkTransactionAlerts');
  } else {
    // Clear any existing warnings
    const alertsContainer = document.getElementById('bulkTransactionAlerts');
    if (alertsContainer) {
      alertsContainer.innerHTML = '';
    }
  }
}

// Fixed updateBulkQuantityLimits function
// function updateBulkQuantityLimits(type) {
//   console.log('Updating bulk quantity limits for type:', type);
  
//   let updatedDisplay = false;
  
//   // Update max quantities for each item
//   bulkItems.forEach((item, index) => {
//     const oldMax = getMaxQuantityForItem(item);
//     let newMax;
    
//     // Calculate new max based on transaction type and item category
//     if (item.category === 'Consumable') {
//       switch(type) {
//         case 'Restock':
//         case 'Stock Addition':
//           newMax = 9999; // No limit for adding stock
//           break;
//         case 'Check-out':
//         case 'Stock Consumption':
//         case 'Stock Removal':
//         case 'Remove Stock':
//         case 'Check Out for Session':
//           newMax = item.availableQuantity || item.quantity;
//           break;
//         case 'Return from Session':
//         case 'Check-in':
//           newMax = item.currentState?.inSession || 0;
//           break;
//         default:
//           newMax = item.availableQuantity || item.quantity;
//       }
//     } else {
//       // Equipment logic
//       switch(type) {
//         case 'Restock':
//         case 'Stock Addition':
//           newMax = 9999;
//           break;
//         case 'Stock Removal':
//         case 'Remove Stock':
//         case 'Relocate':
//         case 'Check Out for Session':
//         case 'Rent Out':
//         case 'Send to Maintenance':
//         case 'Maintenance':
//           newMax = item.availableQuantity || item.quantity;
//           break;
//         case 'Return from Session':
//           newMax = item.currentState?.inSession || 0;
//           break;
//         case 'Return from Rental':
//           newMax = item.currentState?.rented || 0;
//           break;
//         case 'Return from Maintenance':
//           newMax = item.currentState?.inMaintenance || 0;
//           break;
//         default:
//           newMax = 1;
//       }
//     }
    
//     // Update the item's max quantity
//     if (oldMax !== newMax) {
//       item.maxForTransaction = newMax;
      
//       // Adjust bulk count if it exceeds new max
//       if (item.bulkCount > newMax) {
//         item.bulkCount = Math.max(1, newMax);
//         updatedDisplay = true;
//       }
//     }
//   });
  
//   // Update the display if quantities changed
//   if (updatedDisplay) {
//     updateBulkItemsDisplay();
//   }
  
//   // Show warning for items that can't be processed
//   const zeroMaxItems = bulkItems.filter(item => (item.maxForTransaction || 0) === 0);
//   if (zeroMaxItems.length > 0) {
//     let warningMsg = `Warning: The following items cannot be processed with "${type}":`;
//     zeroMaxItems.forEach(item => {
//       warningMsg += `<br>• ${item.name} (${item.category})`;
//     });
    
//     showAlert(warningMsg, 'warning', 'bulkTransactionAlerts');
//   } else {
//     // Clear any existing warnings
//     const alertsContainer = document.getElementById('bulkTransactionAlerts');
//     if (alertsContainer) {
//       alertsContainer.innerHTML = '';
//     }
//   }
// }








// Fixed saveBulkTransaction function with new transaction types
async function saveBulkTransaction() {
  try {
    console.log('=== BULK TRANSACTION START ===');
    
    // Get form data
    const type = document.getElementById('bulkTransactionType').value;
    const fromLocation = document.getElementById('bulkFromLocation').value;
    const toLocation = document.getElementById('bulkToLocation').value;
    const notes = document.getElementById('bulkTransactionNotes').value;
    
    console.log('Bulk transaction data:', { type, fromLocation, toLocation, notes });
    
    // Validate transaction type
    if (!type) {
      showAlert('Please select a transaction type', 'danger', 'bulkTransactionAlerts');
      return;
    }

    // Build base transaction data
    const baseTransaction = {
      type,
      notes,
      fromLocation: fromLocation || undefined,
      toLocation: toLocation || undefined
    };

    // Add session data if visible
    const sessionGroup = document.getElementById('bulkSessionGroup');
    if (sessionGroup && sessionGroup.style.display !== 'none') {
      const sessionName = document.getElementById('bulkSessionName').value;
      const sessionLocation = document.getElementById('bulkSessionLocation').value;
      
      if (sessionName || sessionLocation) {
        baseTransaction.session = {
          name: sessionName || 'Unnamed Session',
          location: sessionLocation || 'Unknown Location'
        };
      }
    }
    
    // Add rental data if visible
    const rentalGroup = document.getElementById('bulkRentalGroup');
    if (rentalGroup && rentalGroup.style.display !== 'none') {
      const rentedTo = document.getElementById('bulkRentedTo').value;
      const expectedReturnDate = document.getElementById('bulkExpectedReturnDate').value;
      
      if (type === 'Rent Out' && !rentedTo) {
        showAlert('Please specify who the items are rented to', 'danger', 'bulkTransactionAlerts');
        return;
      }
      
      if (rentedTo) {
        baseTransaction.rental = {
          rentedTo,
          expectedReturnDate: expectedReturnDate || null
        };
      }
    }
    
    // Add maintenance data if visible
    const maintenanceGroup = document.getElementById('bulkMaintenanceGroup');
    if (maintenanceGroup && maintenanceGroup.style.display !== 'none') {
      const provider = document.getElementById('bulkMaintenanceProvider').value;
      const expectedEndDate = document.getElementById('bulkExpectedEndDate').value;
      
      if (provider || expectedEndDate) {
        baseTransaction.maintenance = {
          provider: provider || '',
          expectedEndDate: expectedEndDate || null
        };
      }
    }
    
    console.log('Base transaction:', baseTransaction);
    
    // Show loading state
    const saveBtn = document.getElementById('saveBulkTransactionBtn');
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';
    saveBtn.disabled = true;
    
    // Add progress tracking
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
    
    const form = document.getElementById('bulkTransactionForm');
    form.appendChild(progressContainer);
    
    // Process results tracking
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    const totalItems = bulkItems.length;
    
    // Process each item
    for (let i = 0; i < bulkItems.length; i++) {
      const item = bulkItems[i];
      const itemQuantity = item.bulkCount || 1;
      
      // Update progress
      const progressPercent = Math.round((i / totalItems) * 100);
      document.getElementById('bulkProgressBar').style.width = `${progressPercent}%`;
      document.getElementById('bulkProgressBar').setAttribute('aria-valuenow', progressPercent);
      document.getElementById('bulkProgressText').textContent = 
        `Processing item ${i + 1} of ${totalItems}: ${item.name} (quantity: ${itemQuantity})`;
      
      // Skip items that can't be processed
      if ((item.maxForTransaction || 0) === 0) {
        results.skipped++;
        continue;
      }
      
      // Create transaction data for this item
      const transactionData = {
        ...baseTransaction,
        quantity: itemQuantity
      };
      
      console.log(`Processing item ${i + 1}:`, item.name, transactionData);
      
      try {
        // Send transaction to backend
        const response = await fetchWithAuth(`${API_URL}/items/${item._id}/enhanced-transaction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(transactionData)
        });
        
        if (response.ok) {
          results.success++;
          console.log(`Successfully processed: ${item.name}`);
        } else {
          results.failed++;
          const errorData = await response.json();
          results.errors.push({
            item: item.name,
            error: errorData.message || 'Unknown error'
          });
          console.error(`Failed to process ${item.name}:`, errorData.message);
        }
      } catch (error) {
        console.error(`Error processing item ${item.name}:`, error);
        results.failed++;
        results.errors.push({
          item: item.name,
          error: error.message || 'Network error'
        });
      }
    }
    
    // Update progress to complete
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
    
    console.log('=== BULK TRANSACTION COMPLETE ===');
    console.log('Results:', results);
    
    // Auto-close if successful
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
    
  } catch (error) {
    console.error('Bulk transaction error:', error);
    showAlert('An error occurred while processing bulk transactions: ' + error.message, 'danger', 'bulkTransactionAlerts');
    
    // Reset button state
    const saveBtn = document.getElementById('saveBulkTransactionBtn');
    if (saveBtn) {
      saveBtn.innerHTML = 'Process All Items';
      saveBtn.disabled = false;
    }
  }
}

// Fixed saveBulkTransaction function with new transaction types
// async function saveBulkTransaction() {
//   try {
//     console.log('=== BULK TRANSACTION START ===');
    
//     // Get form data
//     const type = document.getElementById('bulkTransactionType').value;
//     const fromLocation = document.getElementById('bulkFromLocation').value;
//     const toLocation = document.getElementById('bulkToLocation').value;
//     const notes = document.getElementById('bulkTransactionNotes').value;
    
//     console.log('Bulk transaction data:', { type, fromLocation, toLocation, notes });
    
//     // Validate transaction type
//     if (!type) {
//       showAlert('Please select a transaction type', 'danger', 'bulkTransactionAlerts');
//       return;
//     }

//     // Build base transaction data
//     const baseTransaction = {
//       type,
//       notes,
//       fromLocation: fromLocation || undefined,
//       toLocation: toLocation || undefined
//     };

//     // Add session data if visible
//     const sessionGroup = document.getElementById('bulkSessionGroup');
//     if (sessionGroup && sessionGroup.style.display !== 'none') {
//       const sessionName = document.getElementById('bulkSessionName').value;
//       const sessionLocation = document.getElementById('bulkSessionLocation').value;
      
//       if (sessionName || sessionLocation) {
//         baseTransaction.session = {
//           name: sessionName || 'Unnamed Session',
//           location: sessionLocation || 'Unknown Location'
//         };
//       }
//     }
    
//     // Add rental data if visible
//     const rentalGroup = document.getElementById('bulkRentalGroup');
//     if (rentalGroup && rentalGroup.style.display !== 'none') {
//       const rentedTo = document.getElementById('bulkRentedTo').value;
//       const expectedReturnDate = document.getElementById('bulkExpectedReturnDate').value;
      
//       if (type === 'Rent Out' && !rentedTo) {
//         showAlert('Please specify who the items are rented to', 'danger', 'bulkTransactionAlerts');
//         return;
//       }
      
//       if (rentedTo) {
//         baseTransaction.rental = {
//           rentedTo,
//           expectedReturnDate: expectedReturnDate || null
//         };
//       }
//     }
    
//     // Add maintenance data if visible
//     const maintenanceGroup = document.getElementById('bulkMaintenanceGroup');
//     if (maintenanceGroup && maintenanceGroup.style.display !== 'none') {
//       const provider = document.getElementById('bulkMaintenanceProvider').value;
//       const expectedEndDate = document.getElementById('bulkExpectedEndDate').value;
      
//       if (provider || expectedEndDate) {
//         baseTransaction.maintenance = {
//           provider: provider || '',
//           expectedEndDate: expectedEndDate || null
//         };
//       }
//     }
    
//     console.log('Base transaction:', baseTransaction);
    
//     // Show loading state
//     const saveBtn = document.getElementById('saveBulkTransactionBtn');
//     saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';
//     saveBtn.disabled = true;
    
//     // Add progress tracking
//     const progressContainer = document.createElement('div');
//     progressContainer.className = 'mt-4';
//     progressContainer.innerHTML = `
//       <h6>Processing Items...</h6>
//       <div class="progress mb-3">
//         <div id="bulkProgressBar" class="progress-bar progress-bar-striped progress-bar-animated" 
//              role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
//       </div>
//       <div id="bulkProgressText" class="small text-muted">Preparing to process items...</div>
//     `;
    
//     const form = document.getElementById('bulkTransactionForm');
//     form.appendChild(progressContainer);
    
//     // Process results tracking
//     const results = {
//       success: 0,
//       failed: 0,
//       skipped: 0,
//       errors: []
//     };
    
//     const totalItems = bulkItems.length;
    
//     // Process each item
//     for (let i = 0; i < bulkItems.length; i++) {
//       const item = bulkItems[i];
//       const itemQuantity = item.bulkCount || 1;
      
//       // Update progress
//       const progressPercent = Math.round((i / totalItems) * 100);
//       document.getElementById('bulkProgressBar').style.width = `${progressPercent}%`;
//       document.getElementById('bulkProgressBar').setAttribute('aria-valuenow', progressPercent);
//       document.getElementById('bulkProgressText').textContent = 
//         `Processing item ${i + 1} of ${totalItems}: ${item.name} (quantity: ${itemQuantity})`;
      
//       // Skip items that can't be processed
//       if ((item.maxForTransaction || 0) === 0) {
//         results.skipped++;
//         continue;
//       }
      
//       // Create transaction data for this item
//       const transactionData = {
//         ...baseTransaction,
//         quantity: itemQuantity
//       };
      
//       console.log(`Processing item ${i + 1}:`, item.name, transactionData);
      
//       try {
//         // Send transaction to backend
//         const response = await fetchWithAuth(`${API_URL}/items/${item._id}/enhanced-transaction`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify(transactionData)
//         });
        
//         if (response.ok) {
//           results.success++;
//           console.log(`Successfully processed: ${item.name}`);
//         } else {
//           results.failed++;
//           const errorData = await response.json();
//           results.errors.push({
//             item: item.name,
//             error: errorData.message || 'Unknown error'
//           });
//           console.error(`Failed to process ${item.name}:`, errorData.message);
//         }
//       } catch (error) {
//         console.error(`Error processing item ${item.name}:`, error);
//         results.failed++;
//         results.errors.push({
//           item: item.name,
//           error: error.message || 'Network error'
//         });
//       }
//     }
    
//     // Update progress to complete
//     document.getElementById('bulkProgressBar').style.width = '100%';
//     document.getElementById('bulkProgressBar').setAttribute('aria-valuenow', 100);
//     document.getElementById('bulkProgressBar').classList.remove('progress-bar-animated');
//     document.getElementById('bulkProgressText').textContent = 'Processing complete!';
    
//     // Reset button state
//     saveBtn.innerHTML = 'Process All Items';
//     saveBtn.disabled = false;
    
//     // Show results
//     const resultsContainer = document.createElement('div');
//     resultsContainer.className = 'mt-4 alert ' + (results.failed > 0 ? 'alert-warning' : 'alert-success');
    
//     let resultsHtml = `
//       <h5><i class="fas ${results.failed > 0 ? 'fa-exclamation-triangle' : 'fa-check-circle'} me-2"></i>Transaction Results</h5>
//       <p>Successfully processed ${results.success} out of ${results.success + results.failed + results.skipped} items.</p>
//     `;
    
//     if (results.skipped > 0) {
//       resultsHtml += `<p>${results.skipped} items were skipped because they couldn't be processed with this transaction type.</p>`;
//     }
    
//     if (results.failed > 0) {
//       resultsHtml += '<div class="mt-3"><strong>Errors:</strong><ul>';
//       results.errors.forEach(error => {
//         resultsHtml += `<li>${error.item}: ${error.error}</li>`;
//       });
//       resultsHtml += '</ul></div>';
//     }
    
//     resultsContainer.innerHTML = resultsHtml;
//     form.appendChild(resultsContainer);
    
//     console.log('=== BULK TRANSACTION COMPLETE ===');
//     console.log('Results:', results);
    
//     // Auto-close if successful
//     if (results.failed === 0) {
//       setTimeout(() => {
//         // Close modal
//         bootstrap.Modal.getInstance(document.getElementById('bulkTransactionModal')).hide();
        
//         // Clear bulk items
//         bulkItems = [];
//         updateBulkItemsDisplay();
//         document.getElementById('bulkItemCount').textContent = '0';
        
//         // Hide buttons
//         document.getElementById('clearBulkItems').classList.add('d-none');
//         document.getElementById('processBulkItems').classList.add('d-none');
        
//         // Hide container if not in bulk mode
//         if (!bulkMode) {
//           document.getElementById('bulkItemsContainer').classList.add('d-none');
//         }
        
//         // Show success message
//         showAlert(`Successfully processed ${results.success} items!`, 'success');
        
//         // Refocus barcode input
//         document.getElementById('barcodeInput').focus();
//       }, 3000);
//     }
    
//   } catch (error) {
//     console.error('Bulk transaction error:', error);
//     showAlert('An error occurred while processing bulk transactions: ' + error.message, 'danger', 'bulkTransactionAlerts');
    
//     // Reset button state
//     const saveBtn = document.getElementById('saveBulkTransactionBtn');
//     if (saveBtn) {
//       saveBtn.innerHTML = 'Process All Items';
//       saveBtn.disabled = false;
//     }
//   }
// }


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



function updateBulkTransactionForm(type) {
  console.log('Updating bulk form for transaction type:', type);
  
  // Get all form groups
  const fromLocationGroup = document.getElementById('bulkFromLocationGroup');
  const toLocationGroup = document.getElementById('bulkToLocationGroup');
  const sessionGroup = document.getElementById('bulkSessionGroup');
  const rentalGroup = document.getElementById('bulkRentalGroup');
  const maintenanceGroup = document.getElementById('bulkMaintenanceGroup');
  
  // Hide all groups first
  if (fromLocationGroup) fromLocationGroup.style.display = 'none';
  if (toLocationGroup) toLocationGroup.style.display = 'none';
  if (sessionGroup) sessionGroup.style.display = 'none';
  if (rentalGroup) rentalGroup.style.display = 'none';
  if (maintenanceGroup) maintenanceGroup.style.display = 'none';
  
  // Show relevant groups based on transaction type
  switch (type) {
    case 'Restock':
    case 'Stock Addition':
      // Adding stock - show destination
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
      
    case 'Check-out':
    case 'Stock Consumption':
      // Using items - show destination
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
      
    case 'Stock Removal':
    case 'Remove Stock':
      // Removing stock - show source
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      break;
      
    case 'Relocate':
      // Moving items - show both locations
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
      
    case 'Check Out for Session':
      // Session use - show locations and session details
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      if (sessionGroup) sessionGroup.style.display = 'block';
      break;
      
    case 'Return from Session':
    case 'Check-in':
      // Returning from session - show source and session details
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (sessionGroup) sessionGroup.style.display = 'block';
      break;
      
    case 'Rent Out':
      // Renting out - show source and rental details
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (rentalGroup) rentalGroup.style.display = 'block';
      break;
      
    case 'Return from Rental':
      // Returning from rental - show source and rental details
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (rentalGroup) rentalGroup.style.display = 'block';
      break;
      
    case 'Send to Maintenance':
    case 'Maintenance':
      // Sending to maintenance - show source and maintenance details
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (maintenanceGroup) maintenanceGroup.style.display = 'block';
      break;
      
    case 'Return from Maintenance':
      // Returning from maintenance - show source and maintenance details
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (maintenanceGroup) maintenanceGroup.style.display = 'block';
      break;
  }

  // Update quantity limits for all items
  updateBulkQuantityLimits(type);
}



// function updateBulkTransactionForm(type) {
//   // Get all form groups
//   const fromLocationGroup = document.getElementById('bulkFromLocationGroup');
//   const toLocationGroup = document.getElementById('bulkToLocationGroup');
//   const sessionGroup = document.getElementById('bulkSessionGroup');
//   const rentalGroup = document.getElementById('bulkRentalGroup');
//   const maintenanceGroup = document.getElementById('bulkMaintenanceGroup');
  
//   // Hide all groups first
//   fromLocationGroup.style.display = 'none';
//   toLocationGroup.style.display = 'none';
//   sessionGroup.style.display = 'none';
//   rentalGroup.style.display = 'none';
//   maintenanceGroup.style.display = 'none';
  
//   // Show relevant groups based on transaction type
//   switch (type) {
//     case 'Stock Addition':
//       toLocationGroup.style.display = 'block';
//       break;
      
//     case 'Stock Removal':
//       fromLocationGroup.style.display = 'block';
//       break;
      
//     case 'Relocate':
//       fromLocationGroup.style.display = 'block';
//       toLocationGroup.style.display = 'block';
//       break;
      
//     case 'Check Out for Session':
//       sessionGroup.style.display = 'block';
//       toLocationGroup.style.display = 'block';
//       break;
      
//     case 'Return from Session':
//       sessionGroup.style.display = 'block';
//       break;
      
//     case 'Rent Out':
//       rentalGroup.style.display = 'block';
//       break;
      
//     case 'Return from Rental':
//       rentalGroup.style.display = 'block';
//       break;
      
//     case 'Send to Maintenance':
//       maintenanceGroup.style.display = 'block';
//       break;
      
//     case 'Return from Maintenance':
//       maintenanceGroup.style.display = 'block';
//       break;
//   }

//   updateMaxQuantitiesForTransactionType(type);
// }




function updateMaxQuantitiesForTransactionType(type) {
  let updatedDisplay = false;
  

  bulkItems.forEach((item, index) => {
    const oldMax = getMaxQuantityForItem(item);
    let newMax;
    
    switch(type) {
      case 'Stock Addition':

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
    

    if (oldMax !== newMax) {

      item.maxForTransaction = newMax;
      
  
      if (item.bulkCount > newMax) {
        item.bulkCount = Math.max(1, newMax);
        updatedDisplay = true;
      }
    }
  });
  

  if (updatedDisplay) {
    updateBulkItemsDisplay();
  }
  

  const zeroMaxItems = bulkItems.filter(item => (item.maxForTransaction || 0) === 0);
  if (zeroMaxItems.length > 0) {
    let warningMsg = `Warning: The following items cannot be processed with this transaction type:`;
    zeroMaxItems.forEach(item => {
      warningMsg += `<br>• ${item.name}`;
    });
    
    showAlert(warningMsg, 'warning', 'bulkTransactionAlerts');
  }
}

async function saveBulkTransaction() {

  const type = document.getElementById('bulkTransactionType').value;
  const fromLocation = document.getElementById('bulkFromLocation').value;
  const toLocation = document.getElementById('bulkToLocation').value;
  const notes = document.getElementById('bulkTransactionNotes').value;
  

  if (!type) {
    showAlert('Please select a transaction type', 'danger', 'bulkTransactionAlerts');
    return;
  }

  let session = null;
  if (document.getElementById('bulkSessionGroup').style.display !== 'none') {
    const sessionName = document.getElementById('bulkSessionName').value;
    const sessionLocation = document.getElementById('bulkSessionLocation').value;
    
    if (sessionName || sessionLocation) {
      session = { name: sessionName, location: sessionLocation };
    }
  }
  

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
  
 
  let maintenance = null;
  if (document.getElementById('bulkMaintenanceGroup').style.display !== 'none') {
    const provider = document.getElementById('bulkMaintenanceProvider').value;
    const expectedEndDate = document.getElementById('bulkExpectedEndDate').value;
    
    if (provider || expectedEndDate) {
      maintenance = { provider, expectedEndDate };
    }
  }
  

  const baseTransaction = {
    type,
    notes,
    fromLocation: fromLocation || undefined,
    toLocation: toLocation || undefined,
    session,
    rental,
    maintenance
  };
  

  const saveBtn = document.getElementById('saveBulkTransactionBtn');
  saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';
  saveBtn.disabled = true;
  

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
  

  const form = document.getElementById('bulkTransactionForm');
  form.appendChild(progressContainer);
  

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  

  const totalItems = bulkItems.reduce((total, item) => total + (item.bulkCount || 1), 0);
  let processedCount = 0;
  
 
  for (let i = 0; i < bulkItems.length; i++) {
    const item = bulkItems[i];
    const itemQuantity = item.bulkCount || 1;
    
  
    if ((item.maxForTransaction || 0) === 0) {
      processedCount++;
      results.skipped++;
      continue;
    }
    
  
    const progressPercent = Math.round((processedCount / totalItems) * 100);
    document.getElementById('bulkProgressBar').style.width = `${progressPercent}%`;
    document.getElementById('bulkProgressBar').setAttribute('aria-valuenow', progressPercent);
    document.getElementById('bulkProgressText').textContent = 
      `Processing item ${i + 1} of ${bulkItems.length}: ${item.name} (quantity: ${itemQuantity})`;
    
 
    const transactionData = {
      ...baseTransaction,
      quantity: itemQuantity
    };
    
    try {
    
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








function openQuickTransactionModal(type) {
  console.log(`Opening quick transaction modal for ${type}`);
  
  if (!currentItemId) {
    console.error('No current item ID');
    showAlert('Please scan an item first', 'warning');
    return;
  }
  
 
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
      

      if (type === 'Return') {
     
        const itemsOut = (
          (item.currentState?.inMaintenance || 0) +
          (item.currentState?.inSession || 0) +
          (item.currentState?.rented || 0)
        );
        
     
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

          transactionType = 'Check-in';
          badge = 'bg-success';
          title = 'Return Item';
          showFromLocation = true;
          maxQuantity = item.quantity - (item.availableQuantity || 0);
        }
        
        quantityLabel = 'Return Quantity';
      } 
      else if (type === 'CheckOut') {
 
        if (item.category === 'Consumable') {
          transactionType = 'Stock Removal';
          badge = 'bg-warning';
          title = 'Remove Stock';
          maxQuantity = item.availableQuantity || item.quantity;
          quantityLabel = 'Remove Quantity';
        } else {

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

        transactionType = 'Send to Maintenance';
        badge = 'bg-info';
        title = 'Send to Maintenance';
        showMaintenanceFields = true;
        maxQuantity = item.availableQuantity || item.quantity;
        quantityLabel = 'Quantity for Maintenance';
      }
      else if (type === 'Restock') {

        transactionType = 'Stock Addition';
        badge = 'bg-success';
        title = 'Add Stock';
        maxQuantity = 9999; // No real limit on adding stock
        defaultQuantity = 10; // Default to adding 10 for restocking
        quantityLabel = 'Add Quantity';
      }
      

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
      

      const transactionData = {
        type,
        quantity: parseInt(quantity)
      };
      

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
        
     
        const transaction = await response.json();
        
    
        playSuccessSound();
        
      
        showAlert(`Transaction complete: ${transaction.type} of ${transaction.quantity} ${transaction.item ? 'units' : 'items'}`, 'success');
        
  
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput && barcodeInput.value) {
          searchItem(barcodeInput.value);
        }
        
      
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


       




function fixAllQuickButtons() {
    console.log("Fixing all quick transaction buttons");
    

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
        
       
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
    
        newBtn.onclick = function() {
          console.log(`${button.type} button clicked`);
          if (currentItemId) {
            console.log(`Opening modal for ${button.type}`);
      
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
  
  // Get item name from details
  const itemName = document.querySelector('#itemDetails h5') ? 
                  document.querySelector('#itemDetails h5').textContent : 
                  'Unknown Item';
  
  // Map the button action to the correct transaction type
  let transactionType = type;
  let modalTitle = type;
  
  // Map button actions to proper transaction types
  switch (type) {
    case 'Check-out':
      transactionType = 'Check-out';
      modalTitle = 'Use Items (Permanent)';
      break;
    case 'Maintenance':
      transactionType = 'Check Out for Session';
      modalTitle = 'Take for Session (Returnable)';
      break;
    case 'Restock':
      transactionType = 'Restock';
      modalTitle = 'Add Stock';
      break;
    case 'Check-in':
      transactionType = 'Check-in';
      modalTitle = 'Return Unused';
      break;
  }
  
  // Set all form values
  document.getElementById('quickTransactionItemId').value = currentItemId;
  document.getElementById('quickTransactionItem').value = itemName;
  document.getElementById('quickTransactionType').value = transactionType;
  
  // Set modal title
  const titleEl = document.getElementById('quickTransactionTitle');
  if (titleEl) {
    titleEl.textContent = modalTitle;
  }
  
  // Set badge
  const badge = document.getElementById('quickTransactionTypeBadge');
  if (badge) {
    badge.textContent = modalTitle;
    
    // Set appropriate badge color
    if (type === 'Check-out') {
      badge.className = 'badge bg-danger mb-2';
    } else if (type === 'Maintenance') {
      badge.className = 'badge bg-info mb-2';
    } else if (type === 'Restock') {
      badge.className = 'badge bg-success mb-2';
    } else if (type === 'Check-in') {
      badge.className = 'badge bg-success mb-2';
    }
  }
  
  // Configure fields based on type
  const fromLocationGroup = document.getElementById('quickFromLocationGroup');
  const toLocationGroup = document.getElementById('quickToLocationGroup');
  const sessionGroup = document.getElementById('quickSessionGroup');
  const rentalGroup = document.getElementById('quickRentalGroup');
  const maintenanceGroup = document.getElementById('quickMaintenanceGroup');
  
  // Hide all groups first
  if (fromLocationGroup) fromLocationGroup.style.display = 'none';
  if (toLocationGroup) toLocationGroup.style.display = 'none';
  if (sessionGroup) sessionGroup.style.display = 'none';
  if (rentalGroup) rentalGroup.style.display = 'none';
  if (maintenanceGroup) maintenanceGroup.style.display = 'none';
  
  // Show relevant fields based on transaction type
  switch (transactionType) {
    case 'Check-out':
      // Permanent consumption - only need destination
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
    case 'Check Out for Session':
      // Session use - need session details and locations
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      if (sessionGroup) sessionGroup.style.display = 'block';
      break;
    case 'Restock':
      // Adding stock - need destination
      if (toLocationGroup) toLocationGroup.style.display = 'block';
      break;
    case 'Check-in':
      // Returning - need source and session details
      if (fromLocationGroup) fromLocationGroup.style.display = 'block';
      if (sessionGroup) sessionGroup.style.display = 'block';
      break;
  }
  
  // Set default quantity
  const quantityField = document.getElementById('quickTransactionQuantity');
  if (quantityField) {
    quantityField.value = 1;
  }
  
  // Clear notes
  const notesField = document.getElementById('quickTransactionNotes');
  if (notesField) {
    notesField.value = '';
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

// SIMPLIFIED saveQuickTransaction function
function saveQuickTransaction() {
  try {
    console.log('=== SAVE TRANSACTION START ===');
    
    // Get form data
    const itemId = document.getElementById('quickTransactionItemId').value;
    const type = document.getElementById('quickTransactionType').value;
    const quantity = document.getElementById('quickTransactionQuantity').value;
    const notes = document.getElementById('quickTransactionNotes').value;
    
    console.log('Form data:', { itemId, type, quantity, notes });
    
    if (!itemId || !type || !quantity || parseInt(quantity) <= 0) {
      showAlert('Please enter a valid quantity', 'danger', 'quickTransactionAlerts');
      return;
    }
    
    // Build transaction data
    const transactionData = {
      type,
      quantity: parseInt(quantity),
      notes: notes || ''
    };
    
    // Add location data if visible
    const fromLocationGroup = document.getElementById('quickFromLocationGroup');
    if (fromLocationGroup && fromLocationGroup.style.display !== 'none') {
      const fromLocation = document.getElementById('quickFromLocation').value;
      if (fromLocation) {
        transactionData.fromLocation = fromLocation;
      }
    }
    
    const toLocationGroup = document.getElementById('quickToLocationGroup');
    if (toLocationGroup && toLocationGroup.style.display !== 'none') {
      const toLocation = document.getElementById('quickToLocation').value;
      if (toLocation) {
        transactionData.toLocation = toLocation;
      }
    }
    
    // Add session data if visible
    const sessionGroup = document.getElementById('quickSessionGroup');
    if (sessionGroup && sessionGroup.style.display !== 'none') {
      const sessionName = document.getElementById('quickSessionName').value;
      const sessionLocation = document.getElementById('quickSessionLocation').value;
      
      if (sessionName || sessionLocation) {
        transactionData.session = {
          name: sessionName || 'Unnamed Session',
          location: sessionLocation || 'Unknown Location'
        };
      }
    }
    
    console.log('Transaction data:', transactionData);
    
    // Show loading state
    const saveBtn = document.getElementById('saveQuickTransactionBtn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';
    saveBtn.disabled = true;
    
    // Send to backend
    fetchWithAuth(`${API_URL}/items/${itemId}/enhanced-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    })
    .then(response => {
      console.log('Response status:', response.status);
      
      // Reset button state
      saveBtn.innerHTML = originalBtnText;
      saveBtn.disabled = false;
      
      if (!response.ok) {
        return response.text().then(text => {
          console.error('Error response:', text);
          throw new Error(text || 'Failed to create transaction');
        });
      }
      
      return response.json();
    })
    .then(transaction => {
      console.log('Transaction created:', transaction);
      
      // Close modal
      const modalElement = document.getElementById('quickTransactionModal');
      if (modalElement) {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
          modalInstance.hide();
        }
      }
      
      // Show success message
      showAlert(`Transaction complete: ${transaction.type}`, 'success');
      
      // Reload item details
      const barcodeInput = document.getElementById('barcodeInput');
      if (barcodeInput && barcodeInput.value) {
        searchItem(barcodeInput.value);
      }
      
      // Refocus barcode input
      setTimeout(() => {
        if (barcodeInput) {
          barcodeInput.focus();
          barcodeInput.select();
        }
      }, 500);
    })
    .catch(error => {
      console.error('Save quick transaction error:', error);
      showAlert('Error: ' + error.message, 'danger', 'quickTransactionAlerts');
      
      // Reset button state
      saveBtn.innerHTML = originalBtnText;
      saveBtn.disabled = false;
    });
  } catch (error) {
    console.error('Transaction error:', error);
    showAlert('An unexpected error occurred: ' + error.message, 'danger', 'quickTransactionAlerts');
  }
}

  // function openQuickTransactionModalDirect(type) {
  //   console.log(`Direct modal open for ${type}`);
  //   if (!currentItemId) {
  //     console.error('No current item ID');
  //     return;
  //   }
    
  //   const modal = document.getElementById('quickTransactionModal');
  //   if (!modal) {
  //     console.error('Modal not found!');
  //     alert('Quick transaction modal not found in the page');
  //     return;
  //   }
    
  //   console.log('Modal found, preparing to open');
    
  //   // Get item name
  //   const itemName = document.querySelector('#itemDetails h5') ? 
  //                   document.querySelector('#itemDetails h5').textContent : 
  //                   'Unknown Item';
    
  //   // Set all form values
  //   document.getElementById('quickTransactionItemId').value = currentItemId;
  //   document.getElementById('quickTransactionItem').value = itemName;
  //   document.getElementById('quickTransactionType').value = type;
    
  //   // Set badge
  //   const badge = document.getElementById('quickTransactionTypeBadge');
  //   badge.textContent = type;
    
  //   // Configure fields based on type
  //   switch (type) {
  //     case 'Check-in':
  //       badge.className = 'badge bg-success mb-2';
  //       document.getElementById('quickFromLocationGroup').style.display = 'block';
  //       document.getElementById('quickToLocationGroup').style.display = 'none';
  //       break;
  //     case 'Check-out':
  //       badge.className = 'badge bg-warning mb-2';
  //       document.getElementById('quickFromLocationGroup').style.display = 'none';
  //       document.getElementById('quickToLocationGroup').style.display = 'block';
  //       break;
  //     case 'Maintenance':
  //       badge.className = 'badge bg-info mb-2';
  //       document.getElementById('quickFromLocationGroup').style.display = 'none';
  //       document.getElementById('quickToLocationGroup').style.display = 'none';
  //       break;
  //     case 'Restock':
  //       badge.className = 'badge bg-primary mb-2';
  //       document.getElementById('quickFromLocationGroup').style.display = 'block';
  //       document.getElementById('quickToLocationGroup').style.display = 'block';
  //       break;
  //   }
    
  //   // Populate locations
  //   populateQuickTransactionLocations();
    
  //   // Open modal
  //   console.log('Showing modal');
  //   try {
  //     const bsModal = new bootstrap.Modal(modal);
  //     bsModal.show();
  //   } catch (err) {
  //     console.error('Error showing modal:', err);
  //     alert('Error showing modal: ' + err.message);
  //   }
  // }



  function fixCheckInButton() {
    const checkInBtn = document.getElementById('checkInBtn');
    if (checkInBtn) {
   
      const newCheckInBtn = checkInBtn.cloneNode(true);
      checkInBtn.parentNode.replaceChild(newCheckInBtn, checkInBtn);
      

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






// Fixed updateTransactionButtonsForItem function - scanner.js
// function updateTransactionButtonsForItem(item) {
//   console.log('Updating transaction buttons for item:', item);
  
//   // Get references to buttons
//   const checkInBtn = document.getElementById('checkInBtn');
//   const checkOutBtn = document.getElementById('checkOutBtn');
//   const maintenanceBtn = document.getElementById('maintenanceBtn');
//   const restockBtn = document.getElementById('restockBtn');
  
//   // Reset all buttons
//   [checkInBtn, checkOutBtn, maintenanceBtn, restockBtn].forEach(btn => {
//     if (btn) {
//       btn.disabled = true;
//       btn.style.display = 'block'; 
//       btn.dataset.action = '';
//     }
//   });
  
//   // Exit if no item
//   if (!item || !item._id) {
//     currentItemId = null;
//     return;
//   }
  
//   // Store the current item ID
//   currentItemId = item._id;

//   const availableQuantity = item.availableQuantity !== undefined ? 
//     item.availableQuantity : item.quantity;
  
//   const inMaintenanceCount = item.currentState?.inMaintenance || 0;
//   const inSessionCount = item.currentState?.inSession || 0;
//   const rentedCount = item.currentState?.rented || 0;
//   const itemsOut = inMaintenanceCount + inSessionCount + rentedCount;
  
//   if (item.category === 'Consumable') {
//     // CONSUMABLE LOGIC - CLEAR NAMING
    
//     // Restock Button - Always available for adding stock
//     if (restockBtn) {
//       restockBtn.disabled = false;
//       restockBtn.innerHTML = '<i class="fas fa-plus"></i><span>Add Stock</span>';
//       restockBtn.dataset.action = 'Restock';
//       restockBtn.title = 'Add new stock to inventory';
//     }
    
//     // Check Out Button - For PERMANENT consumption (gone forever)
//     if (checkOutBtn) {
//       checkOutBtn.disabled = availableQuantity <= 0;
//       checkOutBtn.innerHTML = '<i class="fas fa-times-circle"></i><span>Use Up</span>';
//       checkOutBtn.dataset.action = 'Check-out';
//       checkOutBtn.title = 'Use items permanently (cannot be returned)';
//     }
    
//     // Maintenance Button - For TEMPORARY session use (returnable)
//     if (maintenanceBtn) {
//       maintenanceBtn.disabled = availableQuantity <= 0;
//       maintenanceBtn.innerHTML = '<i class="fas fa-arrow-right"></i><span>Take for Session</span>';
//       maintenanceBtn.dataset.action = 'Check Out for Session';
//       maintenanceBtn.title = 'Take items for session use (can be returned unused)';
//     }
    
//     // Check In Button - Return unused from sessions
//     if (checkInBtn) {
//       checkInBtn.disabled = inSessionCount <= 0;
//       checkInBtn.innerHTML = '<i class="fas fa-arrow-left"></i><span>Return Unused</span>';
//       checkInBtn.dataset.action = 'Check-in';
//       checkInBtn.title = `Return ${inSessionCount} unused items from sessions`;
      
//       // Show how many can be returned
//       if (inSessionCount > 0) {
//         checkInBtn.innerHTML = `<i class="fas fa-arrow-left"></i><span>Return Unused (${inSessionCount})</span>`;
//       }
//     }
    
//   } else {
//     // EQUIPMENT LOGIC - COMPLEX TRACKING
    
//     // Restock Button - Add new equipment
//     if (restockBtn) {
//       restockBtn.disabled = false;
//       restockBtn.innerHTML = '<i class="fas fa-plus"></i><span>Add Equipment</span>';
//       restockBtn.dataset.action = 'Restock';
//       restockBtn.title = 'Add new equipment to inventory';
//     }
    
//     // Check Out Button - For session use (always returnable for equipment)
//     if (checkOutBtn) {
//       checkOutBtn.disabled = availableQuantity <= 0;
//       checkOutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>Use in Session</span>';
//       checkOutBtn.dataset.action = 'Check Out for Session';
//       checkOutBtn.title = 'Take equipment for session use';
//     }
    
//     // Maintenance Button - Send for repairs
//     if (maintenanceBtn) {
//       maintenanceBtn.disabled = availableQuantity <= 0;
//       maintenanceBtn.innerHTML = '<i class="fas fa-tools"></i><span>Send for Repair</span>';
//       maintenanceBtn.dataset.action = 'Send to Maintenance';
//       maintenanceBtn.title = 'Send equipment for maintenance/repair';
//     }
    
//     // Check In Button - Return from various states
//     if (checkInBtn) {
//       checkInBtn.disabled = itemsOut <= 0;
      
//       // Determine what type of return based on current state
//       if (inMaintenanceCount > 0) {
//         checkInBtn.innerHTML = '<i class="fas fa-wrench"></i><span>Return from Repair</span>';
//         checkInBtn.dataset.action = 'Return from Maintenance';
//         checkInBtn.title = `Return ${inMaintenanceCount} items from maintenance`;
//       } else if (inSessionCount > 0) {
//         checkInBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Return from Session</span>';
//         checkInBtn.dataset.action = 'Return from Session';
//         checkInBtn.title = `Return ${inSessionCount} items from sessions`;
//       } else if (rentedCount > 0) {
//         checkInBtn.innerHTML = '<i class="fas fa-handshake"></i><span>Return from Rental</span>';
//         checkInBtn.dataset.action = 'Return from Rental';
//         checkInBtn.title = `Return ${rentedCount} items from rental`;
//       } else {
//         checkInBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Return Items</span>';
//         checkInBtn.dataset.action = 'Check-in';
//         checkInBtn.title = 'Return items to inventory';
//       }
//     }
//   }
  
//   // Apply styling based on button state
//   [checkInBtn, checkOutBtn, maintenanceBtn, restockBtn].forEach(btn => {
//     if (btn) {
//       if (btn.disabled) {
//         btn.classList.add('btn-outline-secondary');
//         btn.classList.remove('btn-outline-success', 'btn-outline-warning', 'btn-outline-info', 'btn-outline-primary', 'btn-outline-danger');
//       } else {
//         btn.classList.remove('btn-outline-secondary');
        
//         // Apply color coding based on action type
//         if (btn === checkInBtn) {
//           btn.classList.add('btn-outline-success'); // Green for returns
//         } else if (btn === checkOutBtn) {
//           if (item.category === 'Consumable') {
//             btn.classList.add('btn-outline-danger'); // Red for permanent use
//           } else {
//             btn.classList.add('btn-outline-warning'); // Orange for temporary use
//           }
//         } else if (btn === maintenanceBtn) {
//           if (item.category === 'Consumable') {
//             btn.classList.add('btn-outline-info'); // Blue for session take
//           } else {
//             btn.classList.add('btn-outline-info'); // Blue for maintenance
//           }
//         } else if (btn === restockBtn) {
//           btn.classList.add('btn-outline-primary'); // Blue for adding stock
//         }
//       }
//     }
//   });
  
//   console.log('Transaction buttons updated:', {
//     category: item.category,
//     available: availableQuantity,
//     inMaintenance: inMaintenanceCount,
//     inSession: inSessionCount,
//     rented: rentedCount,
//     buttonStates: {
//       restock: !restockBtn?.disabled,
//       checkOut: !checkOutBtn?.disabled,
//       maintenance: !maintenanceBtn?.disabled,
//       checkIn: !checkInBtn?.disabled
//     }
//   });
// }
function updateTransactionButtonsForItem(item) {
  console.log('Updating transaction buttons for item:', item);
  
  // Get references to buttons
  const checkInBtn = document.getElementById('checkInBtn');
  const checkOutBtn = document.getElementById('checkOutBtn');
  const maintenanceBtn = document.getElementById('maintenanceBtn');
  const restockBtn = document.getElementById('restockBtn');
  
  // Reset all buttons
  [checkInBtn, checkOutBtn, maintenanceBtn, restockBtn].forEach(btn => {
    if (btn) {
      btn.disabled = true;
      btn.style.display = 'block'; 
      btn.dataset.action = '';
    }
  });
  
  // Exit if no item
  if (!item || !item._id) {
    currentItemId = null;
    return;
  }
  
  // Store the current item ID
  currentItemId = item._id;

  const availableQuantity = item.availableQuantity !== undefined ? 
    item.availableQuantity : item.quantity;
  
  const inMaintenanceCount = item.currentState?.inMaintenance || 0;
  const inSessionCount = item.currentState?.inSession || 0;
  const rentedCount = item.currentState?.rented || 0;
  const itemsOut = inMaintenanceCount + inSessionCount + rentedCount;
  
  if (item.category === 'Consumable') {
    // CONSUMABLE LOGIC - Clear labels
    
    // Restock Button
    if (restockBtn) {
      restockBtn.disabled = false;
      restockBtn.innerHTML = '<i class="fas fa-plus"></i><span>Add Stock</span>';
      restockBtn.dataset.action = 'Restock';
      restockBtn.title = 'Add new stock to inventory';
    }
    
    // Check Out Button - Permanent consumption
    if (checkOutBtn) {
      checkOutBtn.disabled = availableQuantity <= 0;
      checkOutBtn.innerHTML = '<i class="fas fa-times-circle"></i><span>Use Up</span>';
      checkOutBtn.dataset.action = 'Check-out';
      checkOutBtn.title = 'Use items permanently (cannot be returned)';
    }
    
    // Maintenance Button - Take for session (returnable)
    if (maintenanceBtn) {
      maintenanceBtn.disabled = availableQuantity <= 0;
      maintenanceBtn.innerHTML = '<i class="fas fa-arrow-right"></i><span>Take for Session</span>';
      maintenanceBtn.dataset.action = 'Check Out for Session';
      maintenanceBtn.title = 'Take items for session use (can be returned unused)';
    }
    
    // Check In Button - Return unused
    if (checkInBtn) {
      checkInBtn.disabled = inSessionCount <= 0;
      checkInBtn.innerHTML = '<i class="fas fa-arrow-left"></i><span>Return Unused</span>';
      checkInBtn.dataset.action = 'Check-in';
      checkInBtn.title = `Return ${inSessionCount} unused items from sessions`;
      
      if (inSessionCount > 0) {
        checkInBtn.innerHTML = `<i class="fas fa-arrow-left"></i><span>Return Unused (${inSessionCount})</span>`;
      }
    }
    
  } else {
    // EQUIPMENT LOGIC - Proper equipment workflow
    
    // Restock Button - Add new equipment
    if (restockBtn) {
      restockBtn.disabled = false;
      restockBtn.innerHTML = '<i class="fas fa-plus"></i><span>Add Equipment</span>';
      restockBtn.dataset.action = 'Restock';
      restockBtn.title = 'Add new equipment to inventory';
    }
    
    // Check Out Button - Use in session (returnable)
    if (checkOutBtn) {
      checkOutBtn.disabled = availableQuantity <= 0;
      checkOutBtn.innerHTML = '<i class="fas fa-play"></i><span>Use in Session</span>';
      checkOutBtn.dataset.action = 'Check Out for Session';
      checkOutBtn.title = 'Take equipment for session use (will be returned)';
    }
    
    // Maintenance Button - Send for repair
    if (maintenanceBtn) {
      maintenanceBtn.disabled = availableQuantity <= 0;
      maintenanceBtn.innerHTML = '<i class="fas fa-tools"></i><span>Send for Repair</span>';
      maintenanceBtn.dataset.action = 'Send to Maintenance';
      maintenanceBtn.title = 'Send equipment for maintenance/repair';
    }
    
    // Check In Button - Context-aware returns
    if (checkInBtn) {
      checkInBtn.disabled = itemsOut <= 0;
      
      // Determine what type of return based on current state
      if (inMaintenanceCount > 0) {
        checkInBtn.innerHTML = '<i class="fas fa-wrench"></i><span>Return from Repair</span>';
        checkInBtn.dataset.action = 'Return from Maintenance';
        checkInBtn.title = `Return ${inMaintenanceCount} items from maintenance`;
      } else if (inSessionCount > 0) {
        checkInBtn.innerHTML = '<i class="fas fa-undo"></i><span>Return from Session</span>';
        checkInBtn.dataset.action = 'Return from Session';
        checkInBtn.title = `Return ${inSessionCount} items from sessions`;
      } else if (rentedCount > 0) {
        checkInBtn.innerHTML = '<i class="fas fa-handshake"></i><span>Return from Rental</span>';
        checkInBtn.dataset.action = 'Return from Rental';
        checkInBtn.title = `Return ${rentedCount} items from rental`;
      } else {
        checkInBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Return Items</span>';
        checkInBtn.dataset.action = 'Check-in';
        checkInBtn.title = 'Return items to inventory';
      }
    }
  }
  
  // Apply proper styling
  [checkInBtn, checkOutBtn, maintenanceBtn, restockBtn].forEach(btn => {
    if (btn) {
      if (btn.disabled) {
        btn.classList.add('btn-outline-secondary');
        btn.classList.remove('btn-outline-success', 'btn-outline-warning', 'btn-outline-info', 'btn-outline-primary', 'btn-outline-danger');
      } else {
        btn.classList.remove('btn-outline-secondary');
        
        // Apply color coding
        if (btn === checkInBtn) {
          btn.classList.add('btn-outline-success'); // Green for returns
        } else if (btn === checkOutBtn) {
          if (item.category === 'Consumable') {
            btn.classList.add('btn-outline-danger'); // Red for permanent use
          } else {
            btn.classList.add('btn-outline-warning'); // Orange for session use
          }
        } else if (btn === maintenanceBtn) {
          btn.classList.add('btn-outline-info'); // Blue for maintenance/session
        } else if (btn === restockBtn) {
          btn.classList.add('btn-outline-primary'); // Blue for adding stock
        }
      }
    }
  });
  
  console.log('Transaction buttons updated for:', item.category);
}


function populateTransactionTypes(item) {
  const transactionTypeSelect = document.getElementById('transactionType');
  if (!transactionTypeSelect) return;
  
  // Clear existing options
  transactionTypeSelect.innerHTML = '<option value="">Select Transaction Type</option>';
  
  const category = item.category;
  const availableQuantity = item.availableQuantity !== undefined ? 
    item.availableQuantity : item.quantity;
  
  const options = [];
  
  if (category === 'Consumable') {
    
    // Always allow adding stock
    options.push({ value: 'Restock', label: 'Add Stock' });
    
    // Allow using items if there's stock available
    if (availableQuantity > 0) {
      options.push({ value: 'Check-out', label: 'Use/Consume Items' });
      options.push({ value: 'Check Out for Session', label: 'Take for Session (Returnable)' });
    }
    
    // Allow stock removal if there's stock
    if (availableQuantity > 0) {
      options.push({ value: 'Stock Removal', label: 'Remove Stock (Disposal/Loss)' });
    }
    
    // Allow stock adjustment for corrections
    options.push({ value: 'Stock Adjustment', label: 'Adjust Stock (Correction)' });
    
    // Check if any items are out in sessions and can be returned
    const inSessionCount = item.currentState?.inSession || 0;
    if (inSessionCount > 0) {
      options.push({ value: 'Check-in', label: 'Return Unused from Session' });
    }
    
  } else {
    // EQUIPMENT OPTIONS - COMPLEX TRACKING
    
    // Always allow adding stock
    options.push({ value: 'Restock', label: 'Add Stock (New Purchase)' });
    
    // Allow operations if there's available stock
    if (availableQuantity > 0) {
      options.push({ value: 'Stock Removal', label: 'Remove Stock (Disposal/Sale)' });
      options.push({ value: 'Relocate', label: 'Relocate Item' });
      options.push({ value: 'Check Out for Session', label: 'Use in Session' });
      options.push({ value: 'Rent Out', label: 'Rent Out' });
      options.push({ value: 'Send to Maintenance', label: 'Send to Maintenance' });
    }
    
    // Check if any items are out and can be returned
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
  
  // Auto-select appropriate default based on item state
  if (options.length > 0) {
    if (category === 'Consumable') {
      // For consumables, default based on stock level
      if (availableQuantity <= item.reorderLevel) {
        transactionTypeSelect.value = 'Restock';
      } else {
        transactionTypeSelect.value = 'Check-out';
      }
    } else {
      // For equipment, default to session use if available
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



function setupQuickTransactionButtons() {
  console.log("Setting up quick transaction buttons");
  

  function handleQuickTransactionButton(actionType) {
    console.log(`Quick transaction button clicked: ${actionType}`);
    
    if (!currentItemId) {
      showAlert('Please scan an item first', 'warning');
      return;
    }
    

    fetchWithAuth(`${API_URL}/items/${currentItemId}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch item');
        return response.json();
      })
      .then(item => {

        if (actionType === 'Return') {
          const inMaintenanceCount = item.currentState?.inMaintenance || 0;
          const inSessionCount = item.currentState?.inSession || 0;
          const rentedCount = item.currentState?.rented || 0;
          

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
        

        openQuickTransactionModal(item, actionType);
      })
      .catch(error => {
        console.error('Error fetching item:', error);
        showAlert('Error loading item data', 'danger');
      });
  }
  

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





function openQuickTransactionModal(item, actionType) {
  console.log(`Opening quick transaction modal for ${actionType}`);
  
  // Get modal
  let quickModal = document.getElementById('quickTransactionModal');
  
  if (!quickModal) {
    console.error('Quick transaction modal not found in the DOM!');
    showAlert('Quick transaction feature is not properly set up', 'danger');
    return;
  }
  
  // Reset form
  const form = document.getElementById('quickTransactionForm');
  if (form) {
    form.reset();
  }
  
  const alertsContainer = document.getElementById('quickTransactionAlerts');
  if (alertsContainer) {
    alertsContainer.innerHTML = '';
  }
  
  // Determine transaction details based on action type and item category
  let title = '';
  let badge = '';
  let transactionType = '';
  let showFromLocation = false;
  let showToLocation = false;
  let showSessionFields = false;
  let showRentalFields = false;
  let showMaintenanceFields = false;
  let maxQuantity = 0;
  let defaultQuantity = 1;
  let quantityLabel = 'Quantity';
  let helpText = '';
  
  // Configure based on item category and action type
  if (item.category === 'Consumable') {
    // CONSUMABLE TRANSACTIONS
    switch (actionType) {
      case 'Restock':
      case 'Stock Addition':
        title = 'Add Stock';
        badge = 'bg-success';
        transactionType = 'Restock';
        showToLocation = true; // Where are you putting the new stock?
        maxQuantity = 9999;
        quantityLabel = 'Add Quantity';
        helpText = 'Adding new consumable items to inventory';
        break;
        
      case 'Check-out':
      case 'Stock Consumption':
        title = 'Use Items (Permanent)';
        badge = 'bg-danger';
        transactionType = 'Check-out';
        showToLocation = true; // Where are you using them?
        maxQuantity = item.availableQuantity || item.quantity;
        quantityLabel = 'Use Quantity';
        helpText = 'Items will be consumed and cannot be returned';
        break;
        
      case 'Check Out for Session':
        title = 'Take for Session (Returnable)';
        badge = 'bg-info';
        transactionType = 'Check Out for Session';
        showFromLocation = true; // Where are you taking them from?
        showToLocation = true;   // Where are you taking them to?
        showSessionFields = true; // Session details
        maxQuantity = item.availableQuantity || item.quantity;
        quantityLabel = 'Quantity for Session';
        helpText = 'Items can be returned unused after the session';
        break;
        
      case 'Check-in':
      case 'Return from Session':
        title = 'Return Unused Items';
        badge = 'bg-success';
        transactionType = 'Check-in';
        showFromLocation = true; // Where are you returning them from?
        showSessionFields = true; // Which session?
        maxQuantity = item.currentState?.inSession || 0;
        quantityLabel = 'Return Quantity';
        helpText = 'Returning unused items back to inventory';
        break;
    }
  } else {
    // EQUIPMENT TRANSACTIONS
    switch (actionType) {
      case 'Restock':
      case 'Stock Addition':
        title = 'Add Equipment';
        badge = 'bg-success';
        transactionType = 'Restock';
        showToLocation = true;
        maxQuantity = 9999;
        quantityLabel = 'Add Quantity';
        helpText = 'Adding new equipment to inventory';
        break;
        
      case 'Check Out for Session':
        title = 'Use in Session';
        badge = 'bg-warning';
        transactionType = 'Check Out for Session';
        showFromLocation = true; // Where are you taking them from?
        showToLocation = true;   // Where are you taking them to?
        showSessionFields = true;
        maxQuantity = item.availableQuantity || item.quantity;
        quantityLabel = 'Quantity for Session';
        helpText = 'Equipment will be returned after the session';
        break;
        
      case 'Return from Session':
        title = 'Return from Session';
        badge = 'bg-success';
        transactionType = 'Return from Session';
        showFromLocation = true; // Where are you returning them from?
        showSessionFields = true;
        maxQuantity = item.currentState?.inSession || 0;
        quantityLabel = 'Return Quantity';
        helpText = 'Returning equipment from session use';
        break;
        
      case 'Send to Maintenance':
      case 'Maintenance':
        title = 'Send for Repair';
        badge = 'bg-info';
        transactionType = 'Send to Maintenance';
        showFromLocation = true; // Where are you taking them from?
        showMaintenanceFields = true;
        maxQuantity = item.availableQuantity || item.quantity;
        quantityLabel = 'Quantity for Repair';
        helpText = 'Equipment will be returned after maintenance';
        break;
        
      case 'Return from Maintenance':
        title = 'Return from Repair';
        badge = 'bg-success';
        transactionType = 'Return from Maintenance';
        showFromLocation = true; // Where are you returning them from?
        showMaintenanceFields = true;
        maxQuantity = item.currentState?.inMaintenance || 0;
        quantityLabel = 'Return Quantity';
        helpText = 'Returning equipment from maintenance';
        break;
        
      case 'Rent Out':
        title = 'Rent Out';
        badge = 'bg-primary';
        transactionType = 'Rent Out';
        showFromLocation = true;
        showRentalFields = true;
        maxQuantity = item.availableQuantity || item.quantity;
        quantityLabel = 'Quantity to Rent';
        helpText = 'Equipment will be returned after rental period';
        break;
        
      case 'Return from Rental':
        title = 'Return from Rental';
        badge = 'bg-success';
        transactionType = 'Return from Rental';
        showFromLocation = true;
        showRentalFields = true;
        maxQuantity = item.currentState?.rented || 0;
        quantityLabel = 'Return Quantity';
        helpText = 'Returning equipment from rental';
        break;
    }
  }
  
  // Set modal title and help text
  const modalTitle = document.getElementById('quickTransactionTitle');
  if (modalTitle) {
    modalTitle.textContent = title;
  }
  
  // Add help text to modal
  const modalBody = document.querySelector('#quickTransactionModal .modal-body');
  let helpTextEl = document.getElementById('transactionHelpText');
  if (!helpTextEl && modalBody) {
    helpTextEl = document.createElement('div');
    helpTextEl.id = 'transactionHelpText';
    helpTextEl.className = 'alert alert-info mb-3';
    modalBody.insertBefore(helpTextEl, modalBody.firstChild);
  }
  if (helpTextEl) {
    helpTextEl.innerHTML = `<i class="fas fa-info-circle me-2"></i>${helpText}`;
  }
  
  // Set form values
  document.getElementById('quickTransactionItemId').value = item._id;
  document.getElementById('quickTransactionItem').value = item.name;
  document.getElementById('quickTransactionType').value = transactionType;
  
  // Set quantity default and max
  const quantityField = document.getElementById('quickTransactionQuantity');
  if (quantityField) {
    quantityField.value = Math.min(defaultQuantity, maxQuantity);
    quantityField.max = maxQuantity;
    
    // Update the label with max info
    const quantityLabelEl = document.querySelector('label[for="quickTransactionQuantity"]');
    if (quantityLabelEl) {
      quantityLabelEl.textContent = `${quantityLabel}* (max: ${maxQuantity})`;
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
  
  // Update location labels based on context
  if (fromLocationGroup) {
    fromLocationGroup.style.display = showFromLocation ? 'block' : 'none';
    const fromLabel = fromLocationGroup.querySelector('label');
    if (fromLabel && showFromLocation) {
      if (transactionType.includes('Return')) {
        fromLabel.textContent = 'Returning From*';
      } else {
        fromLabel.textContent = 'Taking From*';
      }
    }
  }
  
  if (toLocationGroup) {
    toLocationGroup.style.display = showToLocation ? 'block' : 'none';
    const toLabel = toLocationGroup.querySelector('label');
    if (toLabel && showToLocation) {
      if (transactionType === 'Restock') {
        toLabel.textContent = 'Storing In*';
      } else if (transactionType === 'Check-out') {
        toLabel.textContent = 'Using In*';
      } else {
        toLabel.textContent = 'Taking To*';
      }
    }
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
      if (quantityField && maxQuantity > 0) {
        quantityField.focus();
        quantityField.select();
      }
    }, 300);
  } catch (error) {
    console.error('Error showing modal:', error);
    showAlert('Error showing transaction modal. Please try again.', 'danger');
  }
}

// function openQuickTransactionModal(item, actionType) {
//   console.log(`Opening quick transaction modal for ${actionType}`);
  

//   let quickModal = document.getElementById('quickTransactionModal');
  
//   if (!quickModal) {
//     console.error('Quick transaction modal not found in the DOM!');
//     showAlert('Quick transaction feature is not properly set up', 'danger');
//     return;
//   }
  
 
//   const form = document.getElementById('quickTransactionForm');
//   if (form) {
//     form.reset();
//   }
  
//   const alertsContainer = document.getElementById('quickTransactionAlerts');
//   if (alertsContainer) {
//     alertsContainer.innerHTML = '';
//   }
  

//   let title = '';
//   let badge = '';
//   let showFromLocation = false;
//   let showToLocation = false;
//   let showSessionFields = false;
//   let showRentalFields = false;
//   let showMaintenanceFields = false;
//   let maxQuantity = 0;
//   let defaultQuantity = 1;
//   let quantityLabel = 'Quantity';
  
 
//   switch (actionType) {
//     case 'Stock Addition':
//       title = 'Add Stock';
//       badge = 'bg-success';
//       showToLocation = true;
//       maxQuantity = 9999;
//       quantityLabel = 'Add Quantity';
//       break;
      
//     case 'Stock Removal':
//       title = 'Remove Stock';
//       badge = 'bg-warning';
//       showFromLocation = true;
//       maxQuantity = item.availableQuantity || item.quantity;
//       quantityLabel = 'Remove Quantity';
//       break;
      
//     case 'Check Out for Session':
//       title = 'Use in Session';
//       badge = 'bg-warning';
//       showSessionFields = true;
//       showToLocation = true;
//       maxQuantity = item.availableQuantity || item.quantity;
//       quantityLabel = 'Quantity for Session';
//       break;
      
//     case 'Return from Session':
//       title = 'Return from Session';
//       badge = 'bg-info';
//       showSessionFields = true;
//       maxQuantity = item.currentState?.inSession || 0;
//       quantityLabel = 'Return Quantity';
//       break;
      
//     case 'Rent Out':
//       title = 'Rent Out';
//       badge = 'bg-primary';
//       showRentalFields = true;
//       maxQuantity = item.availableQuantity || item.quantity;
//       quantityLabel = 'Quantity to Rent';
//       break;
      
//     case 'Return from Rental':
//       title = 'Return from Rental';
//       badge = 'bg-primary';
//       showRentalFields = true;
//       maxQuantity = item.currentState?.rented || 0;
//       quantityLabel = 'Return Quantity';
//       break;
      
//     case 'Send to Maintenance':
//       title = 'Send to Maintenance';
//       badge = 'bg-info';
//       showMaintenanceFields = true;
//       maxQuantity = item.availableQuantity || item.quantity;
//       quantityLabel = 'Quantity for Maintenance';
//       break;
      
//     case 'Return from Maintenance':
//       title = 'Return from Maintenance';
//       badge = 'bg-info';
//       showMaintenanceFields = true;
//       maxQuantity = item.currentState?.inMaintenance || 0;
//       quantityLabel = 'Return Quantity';
//       break;
//   }
  

//   const modalTitle = document.getElementById('quickTransactionTitle');
//   if (modalTitle) {
//     modalTitle.textContent = title;
//   }
  

//   document.getElementById('quickTransactionItemId').value = item._id;
//   document.getElementById('quickTransactionItem').value = item.name;
//   document.getElementById('quickTransactionType').value = actionType;
  

//   const quantityField = document.getElementById('quickTransactionQuantity');
//   if (quantityField) {
//     quantityField.value = Math.min(defaultQuantity, maxQuantity);
//     quantityField.max = maxQuantity;
    
  
//     const quantityLabel = document.querySelector('label[for="quickTransactionQuantity"]');
//     if (quantityLabel) {
//       quantityLabel.textContent = `${quantityLabel}*`;
//     }
//   }
  

//   const badgeEl = document.getElementById('quickTransactionTypeBadge');
//   if (badgeEl) {
//     badgeEl.textContent = title;
//     badgeEl.className = `badge ${badge} mb-2`;
//   }
  

//   const fromLocationGroup = document.getElementById('quickFromLocationGroup');
//   const toLocationGroup = document.getElementById('quickToLocationGroup');
//   const sessionFieldsGroup = document.getElementById('quickSessionGroup');
//   const rentalFieldsGroup = document.getElementById('quickRentalGroup');
//   const maintenanceFieldsGroup = document.getElementById('quickMaintenanceGroup');
  
//   if (fromLocationGroup) {
//     fromLocationGroup.style.display = showFromLocation ? 'block' : 'none';
//   }
  
//   if (toLocationGroup) {
//     toLocationGroup.style.display = showToLocation ? 'block' : 'none';
//   }
  
//   if (sessionFieldsGroup) {
//     sessionFieldsGroup.style.display = showSessionFields ? 'block' : 'none';
//   }
  
//   if (rentalFieldsGroup) {
//     rentalFieldsGroup.style.display = showRentalFields ? 'block' : 'none';
//   }
  
//   if (maintenanceFieldsGroup) {
//     maintenanceFieldsGroup.style.display = showMaintenanceFields ? 'block' : 'none';
//   }
  

//   populateQuickTransactionLocations();
  
 
//   try {
//     const bsModal = new bootstrap.Modal(quickModal);
//     bsModal.show();
    
   
//     setTimeout(() => {
//       const quantityField = document.getElementById('quickTransactionQuantity');
//       if (quantityField) {
//         quantityField.focus();
//       }
//     }, 300);
//   } catch (error) {
//     console.error('Error showing modal:', error);
//     showAlert('Error showing transaction modal. Please try again.', 'danger');
//   }
// }


function saveQuickTransaction() {
  try {
  
    let alertsContainer = document.getElementById('quickTransactionAlerts');
    if (!alertsContainer) {
      alertsContainer = document.createElement('div');
      alertsContainer.id = 'quickTransactionAlerts';
      
      const modalBody = document.querySelector('#quickTransactionModal .modal-body');
      if (modalBody) {
        modalBody.insertBefore(alertsContainer, modalBody.firstChild);
      }
    }
    
 
    const itemId = document.getElementById('quickTransactionItemId').value;
    const type = document.getElementById('quickTransactionType').value;
    const quantity = document.getElementById('quickTransactionQuantity').value;
    
  
    if (!itemId || !type || parseInt(quantity) <= 0) {
      showAlert('Please enter a valid quantity', 'danger', 'quickTransactionAlerts');
      return;
    }
    

    const transactionData = {
      type,
      quantity: parseInt(quantity),
      notes: document.getElementById('quickTransactionNotes')?.value || ''
    };
    
 
    
   
    const fromLocationGroup = document.getElementById('quickFromLocationGroup');
    if (fromLocationGroup && fromLocationGroup.style.display !== 'none') {
      const fromLocation = document.getElementById('quickFromLocation').value;
      if (fromLocation) {
        transactionData.fromLocation = fromLocation;
      }
    }
    
   
    const toLocationGroup = document.getElementById('quickToLocationGroup');
    if (toLocationGroup && toLocationGroup.style.display !== 'none') {
      const toLocation = document.getElementById('quickToLocation').value;
      if (toLocation) {
        transactionData.toLocation = toLocation;
      }
    }
    
  
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
    
    
    const saveBtn = document.getElementById('saveQuickTransactionBtn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';
    saveBtn.disabled = true;
    
   
    fetchWithAuth(`${API_URL}/items/${itemId}/enhanced-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    })
      .then(response => {
        
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
  

  if (!urlParams.has('id') && !urlParams.has('barcode')) {
    console.log('Clearing previous scanner data');
    

    resetItemDetails();
    

    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
      barcodeInput.value = '';
    }
    
 
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


document.addEventListener('DOMContentLoaded', function() {

  setupQuickTransactionButtons();
  

  const saveQuickTransactionBtn = document.getElementById('saveQuickTransactionBtn');
  if (saveQuickTransactionBtn) {
    saveQuickTransactionBtn.addEventListener('click', saveQuickTransaction);
  }
  

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



  setupEventListeners();
  

  clearPreviousItemData();
  

  setTimeout(processUrlParameters, 500);
    setupBulkFunctionality();
});



  function cleanUpUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('id') || urlParams.has('barcode')) {

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }



function processUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');
  
  if (itemId) {
    console.log('Loading item from URL parameter:', itemId);
    

    fetchWithAuth(`${API_URL}/items/${itemId}`)
      .then(response => {
        if (!response || !response.ok) {
          throw new Error('Failed to fetch item');
        }
        return response.json();
      })
      .then(item => {

        displayItemDetails(item);
        

        loadItemTransactions(item._id);
        

        if (item.barcode) {
          document.getElementById('barcodeInput').value = item.barcode;
        }
        

        showAlert(`Item loaded: ${item.name}`, 'success');
        
     
        addInventoryHighlight();


        cleanUpUrl();
      })
      .catch(error => {
        console.error('Error loading item from URL parameter:', error);
        showAlert('Error loading item. Please try scanning the barcode manually.', 'warning');
      });
  }


}


function addInventoryHighlight() {
  const itemDetails = document.getElementById('itemDetails');
  if (itemDetails) {
 
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
    

    if (itemDetails.firstChild) {
      itemDetails.insertBefore(notice, itemDetails.firstChild);
    } else {
      itemDetails.appendChild(notice);
    }
    
   
    itemDetails.classList.add('highlight-success');
  }
}



function setupBulkKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
 
    if (e.altKey && e.key === 'b') {
      e.preventDefault();
      toggleBulkMode();
    }
    

    if (e.altKey && e.key === 'p' && bulkItems.length > 0) {
      e.preventDefault();
      processBulkItems();
    }
    
   
    if (e.altKey && e.key === 'c' && bulkItems.length > 0) {
      e.preventDefault();
      clearBulkItems();
    }
  });
}


document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Scanner page initialization starting');
  
 
  const token = getAuthToken();
  const user = getCurrentUser();
  
  if (!token || !user) {
    window.location.href = '../index.html';
    return;
  }
  

  setupEventListeners();

  clearPreviousItemData();
  

  setTimeout(processUrlParameters, 500);

  setupBulkFunctionality();
  

  setTimeout(fixAllQuickButtons, 500);
  

  setupQuickTransactionButtons();
  

  const saveQuickTransactionBtn = document.getElementById('saveQuickTransactionBtn');
  if (saveQuickTransactionBtn) {
    saveQuickTransactionBtn.addEventListener('click', saveQuickTransaction);
  }

  setupBulkKeyboardShortcuts();
  

  if (isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
  }
  

  document.getElementById('userName').textContent = user.name;
  document.getElementById('profileName').value = user.name;
  document.getElementById('profileEmail').value = user.email;
  document.getElementById('profileRole').value = user.role;
  

  loadLocations();
  
 
  document.getElementById('barcodeInput').focus();
  

  showAlert('Ready to scan! Use your barcode scanner or enter a code manually.', 'info');
  

  setTimeout(debugQuickButtons, 1000);
  

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