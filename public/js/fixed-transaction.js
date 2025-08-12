// fixed-transaction.js - Simple, reliable transaction handling

document.addEventListener('DOMContentLoaded', function() {
    console.log('Loading fixed transaction handler');
    
    // Give the page a moment to fully load
    setTimeout(function() {
      // Replace all transaction buttons with new ones that work reliably
      replaceAllTransactionButtons();
    }, 500);
    
    // Function to replace all transaction buttons with reliable ones
    function replaceAllTransactionButtons() {
      console.log('Replacing all transaction buttons');
      
      document.querySelectorAll('.transaction-btn').forEach(function(btn) {
        // Get the item data from the button
        const itemId = btn.dataset.id;
        const itemName = btn.dataset.name;
        
        if (!itemId) {
          console.warn('Transaction button missing item ID');
          return;
        }
        
        // Create a new button with the same appearance
        const newBtn = btn.cloneNode(true);
        
        // Replace the old button with the new one
        btn.parentNode.replaceChild(newBtn, btn);
        
        // Add a direct click handler
        newBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          console.log('Transaction button clicked for item:', itemId);
          
          // Show loading state
          showAlert('Loading transaction form...', 'info');
          
          // Fetch the item data
          fetchWithAuth(`${API_URL}/items/${itemId}`)
            .then(response => {
              if (!response.ok) throw new Error('Failed to fetch item data');
              return response.json();
            })
            .then(item => {
              // Create and show the modal with direct DOM manipulation
              openSimpleTransactionModal(item);
            })
            .catch(error => {
              console.error('Error loading item:', error);
              showAlert('Error loading item data: ' + error.message, 'danger');
            });
        });
      });
    }
    
    // Function to open a simple transaction modal
    function openSimpleTransactionModal(item) {
      console.log('Opening simple transaction modal for', item.name);
      
      // First, create the modal if it doesn't exist
      if (!document.getElementById('simpleTransactionModal')) {
        // Wait for modal creation to complete before continuing
        return createSimpleTransactionModal().then(() => {
          // Now continue with setting values
          continueWithModalSetup();
        });
      }

      // Modal already exists, proceed directly
continueWithModalSetup();

// This function contains the rest of the original function code
function continueWithModalSetup() {
      
      // Get the modal element
      const modal = document.getElementById('simpleTransactionModal');
      
      // Clean up any existing modals
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Set the item data in the modal
      document.getElementById('simple-item-id').value = item._id;
      document.getElementById('simple-item-name').textContent = item.name;
      document.getElementById('simple-item-category').textContent = item.category;
      document.getElementById('simple-item-quantity').textContent = 
        `Quantity: ${item.quantity} ${item.unit} (${item.availableQuantity || item.quantity} available)`;
      
      // Add appropriate transaction types based on category
      populateTransactionTypes(item);
      
      // Directly manipulate the DOM to show the modal
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '15px';
      
      // Create a backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade show';
      document.body.appendChild(backdrop);
      
      // Show the modal
      modal.classList.add('show');
      modal.style.display = 'block';
      modal.setAttribute('aria-modal', 'true');
      modal.removeAttribute('aria-hidden');
      
      // Focus the first input
      setTimeout(function() {
        const transactionType = document.getElementById('simple-transaction-type');
        if (transactionType) {
          transactionType.focus();
        }
      }, 100);
    }
    }
    
    // Function to create the modal if it doesn't exist
    function createSimpleTransactionModal() {
      console.log('Creating simple transaction modal');
      
      const modalHTML = `
        <div class="modal fade" id="simpleTransactionModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Create Transaction</h5>
                <button type="button" class="btn-close" onclick="closeSimpleModal()"></button>
              </div>
              <div class="modal-body">
                <div id="simple-transaction-alerts"></div>
                
                <div class="card mb-3">
                  <div class="card-body">
                    <h5 id="simple-item-name" class="card-title">Item Name</h5>
                    <div>
                      <span id="simple-item-category" class="badge bg-secondary me-2">Category</span>
                      <span id="simple-item-quantity">Quantity: 0</span>
                    </div>
                    <input type="hidden" id="simple-item-id">
                  </div>
                </div>
                
                <form id="simple-transaction-form">
                  <div class="row mb-3">
                    <div class="col-md-6">
                      <label for="simple-transaction-type" class="form-label">Transaction Type*</label>
                      <select class="form-select" id="simple-transaction-type" required onchange="updateTransactionFields()">
                        <option value="">Select Transaction Type</option>
                      </select>
                    </div>
                    
                    <div class="col-md-6">
                      <label for="simple-transaction-quantity" class="form-label">Quantity*</label>
                      <input type="number" class="form-control" id="simple-transaction-quantity" min="1" value="1" required>
                    </div>
                  </div>
                  
                  <!-- Additional fields that appear based on transaction type -->
                  <div id="location-fields" style="display: none;">
                    <div class="row mb-3">
                      <div class="col-md-6" id="from-location-group" style="display: none;">
                        <label for="from-location" class="form-label">From Location</label>
                        <select class="form-select" id="from-location">
                          <option value="">Select Location</option>
                        </select>
                      </div>
                      
                      <div class="col-md-6" id="to-location-group" style="display: none;">
                        <label for="to-location" class="form-label">To Location</label>
                        <select class="form-select" id="to-location">
                          <option value="">Select Location</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div class="mb-3">
                    <label for="simple-transaction-notes" class="form-label">Notes</label>
                    <textarea class="form-control" id="simple-transaction-notes" rows="3"></textarea>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeSimpleModal()">Close</button>
                <button type="button" class="btn btn-primary" onclick="saveSimpleTransaction()">Save Transaction</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Create container and add to document
      const container = document.createElement('div');
      container.innerHTML = modalHTML;
      document.body.appendChild(container.firstChild);
      
      // Add the close function to window
      window.closeSimpleModal = function() {
        const modal = document.getElementById('simpleTransactionModal');
        if (modal) {
          modal.classList.remove('show');
          modal.style.display = 'none';
          modal.removeAttribute('aria-modal');
          modal.setAttribute('aria-hidden', 'true');
        }
        
        // Remove backdrop
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        
        // Reset body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      };
      
      // Add the update fields function
      window.updateTransactionFields = function() {
        const transactionType = document.getElementById('simple-transaction-type').value;
        const locationFields = document.getElementById('location-fields');
        const fromLocationGroup = document.getElementById('from-location-group');
        const toLocationGroup = document.getElementById('to-location-group');
        
        // Hide all first
        locationFields.style.display = 'none';
        fromLocationGroup.style.display = 'none';
        toLocationGroup.style.display = 'none';
        
        // Show relevant fields based on transaction type
        if (transactionType) {
          switch (transactionType) {
            case 'Stock Addition':
              locationFields.style.display = 'block';
              toLocationGroup.style.display = 'block';
              break;
              
            case 'Stock Removal':
              locationFields.style.display = 'block';
              fromLocationGroup.style.display = 'block';
              break;
              
            case 'Relocate':
              locationFields.style.display = 'block';
              fromLocationGroup.style.display = 'block';
              toLocationGroup.style.display = 'block';
              break;
              
            // Add more cases for other transaction types
          }
        }
      };
      
      // Add save transaction function
      window.saveSimpleTransaction = function() {
        // Get form values
        const itemId = document.getElementById('simple-item-id').value;
        const transactionType = document.getElementById('simple-transaction-type').value;
        const quantity = parseInt(document.getElementById('simple-transaction-quantity').value);
        const notes = document.getElementById('simple-transaction-notes').value;
        
        // Validate basic fields
        if (!itemId || !transactionType || isNaN(quantity) || quantity <= 0) {
          showAlert('Please fill in all required fields', 'danger', 'simple-transaction-alerts');
          return;
        }
        
        // Build transaction data
        const transactionData = {
          type: transactionType,
          quantity: quantity,
          notes: notes
        };
        
        // Add location data if visible
        if (document.getElementById('from-location-group').style.display !== 'none') {
          const fromLocation = document.getElementById('from-location').value;
          if (fromLocation) {
            transactionData.fromLocation = fromLocation;
          }
        }
        
        if (document.getElementById('to-location-group').style.display !== 'none') {
          const toLocation = document.getElementById('to-location').value;
          if (toLocation) {
            transactionData.toLocation = toLocation;
          }
        }
        
        // Show loading state
        const saveBtn = document.querySelector('#simpleTransactionModal .btn-primary');
        const originalText = saveBtn.textContent;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';
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
            if (!response.ok) {
              return response.json().then(data => {
                throw new Error(data.message || 'Failed to create transaction');
              });
            }
            return response.json();
          })
          .then(data => {
            // Success!
            closeSimpleModal();
            showAlert('Transaction created successfully!', 'success');
            
            // Reload inventory to show changes
            if (typeof loadInventoryItems === 'function') {
              loadInventoryItems();
            }
          })
          .catch(error => {
            console.error('Error saving transaction:', error);
            showAlert(error.message || 'Error saving transaction', 'danger', 'simple-transaction-alerts');
          })
          .finally(() => {
            // Reset button
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
          });
      };
      
      // Load locations
      loadLocationsForTransactionModal();

      // Return a promise that resolves when the modal is created and in the DOM
return new Promise(resolve => {
    // Give the browser a moment to update the DOM
    setTimeout(() => {
      resolve();
    }, 50);
  });
    }
    
    // Function to load locations for the transaction modal
    function loadLocationsForTransactionModal() {
      fetchWithAuth(`${API_URL}/locations/hierarchy`)
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch locations');
          return response.json();
        })
        .then(locations => {
          const fromLocation = document.getElementById('from-location');
          const toLocation = document.getElementById('to-location');
          
          if (!fromLocation || !toLocation) return;
          
          // Clear existing options
          fromLocation.innerHTML = '<option value="">Select Location</option>';
          toLocation.innerHTML = '<option value="">Select Location</option>';
          
          // Add options
          locations.forEach(location => {
            fromLocation.innerHTML += `<option value="${location._id}">${location.name}</option>`;
            toLocation.innerHTML += `<option value="${location._id}">${location.name}</option>`;
          });
        })
        .catch(error => {
          console.error('Error loading locations:', error);
        });
    }
    
    // Function to populate transaction types based on item category
    function populateTransactionTypes(item) {
      const transactionType = document.getElementById('simple-transaction-type');
      if (!transactionType) return;
      
      // Clear existing options
      transactionType.innerHTML = '<option value="">Select Transaction Type</option>';
      
      // Add appropriate options based on category
      if (item.category === 'Consumable') {
        // For consumables
        transactionType.innerHTML += `
          <option value="Stock Addition">Add Stock</option>
          <option value="Stock Removal">Remove Stock</option>
        `;
      } else {
        // For equipment
        transactionType.innerHTML += `
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
      }
      
      // Trigger the change event to update fields
      transactionType.dispatchEvent(new Event('change'));
    }
    
    // Helper function to show an alert in a specific container
    function showAlert(message, type, containerId, autoClose = true) {
      const container = containerId ? document.getElementById(containerId) : document.getElementById('alertContainer');
      if (!container) return;
      
      const alertEl = document.createElement('div');
      alertEl.className = `alert alert-${type} alert-dismissible fade show`;
      alertEl.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;
      
      container.innerHTML = '';
      container.appendChild(alertEl);
      
      if (autoClose) {
        setTimeout(() => {
          alertEl.classList.remove('show');
          setTimeout(() => alertEl.remove(), 300);
        }, 5000);
      }
    }
  });