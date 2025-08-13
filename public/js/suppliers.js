// public/js/suppliers.js

// Global variables
let suppliers = [];
let filteredSuppliers = [];

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
  
  // Load suppliers
  loadSuppliers();
});

// Load suppliers from API
async function loadSuppliers() {
  try {
    // Show loading indicator
    document.getElementById('suppliersTable').innerHTML = '<tr><td colspan="6" class="text-center">Loading suppliers...</td></tr>';
    
    // Fetch suppliers
    const response = await fetchWithAuth(`${API_URL}/suppliers`);
    
    if (!response) return;
    
    if (response.ok) {
      suppliers = await response.json();
      filteredSuppliers = [...suppliers];
      
      // Check if search filter is applied
      const searchInput = document.getElementById('searchInput');
      if (searchInput.value.trim()) {
        filterSuppliers(searchInput.value.trim());
      } else {
        // Display suppliers
        renderSuppliers();
      }
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to load suppliers', 'danger');
      
      // Show error in table
      document.getElementById('suppliersTable').innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4">
            <i class="fas fa-exclamation-circle text-danger me-2"></i>
            Failed to load suppliers. Please try again.
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Supplier loading error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    
    // Show error in table
    document.getElementById('suppliersTable').innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4">
          <i class="fas fa-exclamation-circle text-danger me-2"></i>
          Failed to load suppliers. Please try again.
        </td>
      </tr>
    `;
  }
}

// Render suppliers table
function renderSuppliers() {
  const tableBody = document.getElementById('suppliersTable');
  
  if (filteredSuppliers.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4">
          <i class="fas fa-info-circle text-info me-2"></i>
          No suppliers found.
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  
  filteredSuppliers.forEach(supplier => {
    const contactInfo = [
      supplier.email ? `<i class="fas fa-envelope me-1"></i> ${supplier.email}` : '',
      supplier.phone ? `<i class="fas fa-phone me-1"></i> ${supplier.phone}` : ''
    ].filter(Boolean).join('<br>');
    
    html += `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <i class="fas fa-building text-primary me-2"></i>
            <div>
              <h6 class="mb-0">${supplier.name}</h6>
            </div>
          </div>
        </td>
        <td>${supplier.contactPerson || '-'}</td>
        <td>${contactInfo || '-'}</td>
        <td>${supplier.address || '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline-info view-items-btn" data-id="${supplier._id}" data-name="${supplier.name}">
            <i class="fas fa-eye me-1"></i> View Items
          </button>
        </td>
        <td>
          <div class="btn-group">
            <button type="button" class="btn btn-sm btn-outline-secondary edit-btn manager-only ${!isInventoryManager() ? 'd-none' : ''}" data-id="${supplier._id}">
              <i class="fas fa-edit"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger delete-btn admin-only ${!isAdmin() ? 'd-none' : ''}" data-id="${supplier._id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
  
 
  document.querySelectorAll('.view-items-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      viewSupplierItems(btn.dataset.id, btn.dataset.name);
    });
  });
  
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editSupplier(btn.dataset.id);
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
        deleteSupplier(btn.dataset.id);
      }
    });
  });
}


function filterSuppliers(searchTerm) {
  if (!searchTerm) {
    filteredSuppliers = [...suppliers];
  } else {
    const term = searchTerm.toLowerCase();
    filteredSuppliers = suppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(term) ||
      (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(term)) ||
      (supplier.email && supplier.email.toLowerCase().includes(term)) ||
      (supplier.phone && supplier.phone.toLowerCase().includes(term)) ||
      (supplier.address && supplier.address.toLowerCase().includes(term))
    );
  }
  
  renderSuppliers();
}

// View supplier items
async function viewSupplierItems(supplierId, supplierName) {
  try {
    // Update modal title
    document.getElementById('supplierItemsModalTitle').textContent = `Items Supplied by ${supplierName}`;
    
    // Show loading indicator
    document.getElementById('supplierItemsTable').innerHTML = '<tr><td colspan="6" class="text-center">Loading items...</td></tr>';
    
    // Open the modal
    const modal = new bootstrap.Modal(document.getElementById('supplierItemsModal'));
    modal.show();
    
    // Fetch supplier items
    const response = await fetchWithAuth(`${API_URL}/suppliers/${supplierId}/items`);
    
    if (!response) return;
    
    if (response.ok) {
      const items = await response.json();
      
      if (items.length === 0) {
        document.getElementById('supplierItemsTable').innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4">
              <i class="fas fa-info-circle text-info me-2"></i>
              No items found for this supplier.
            </td>
          </tr>
        `;
        return;
      }
      
      // Render items table
      let html = '';
      
      items.forEach(item => {
        html += `
          <tr>
            <td>
              <div class="d-flex align-items-center">
                <i class="fas fa-box text-primary me-2"></i>
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
            <td>${formatCurrency(item.unitCost)}</td>
            <td>
              <a href="inventory.html?id=${item._id}" class="btn btn-sm btn-outline-primary">
                <i class="fas fa-eye"></i> View
              </a>
            </td>
          </tr>
        `;
      });
      
      document.getElementById('supplierItemsTable').innerHTML = html;
    } else {
      const errorData = await response.json();
      document.getElementById('supplierItemsTable').innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4">
            <i class="fas fa-exclamation-circle text-danger me-2"></i>
            Failed to load items. ${errorData.message || 'Please try again.'}
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Supplier items loading error:', error);
    document.getElementById('supplierItemsTable').innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4">
          <i class="fas fa-exclamation-circle text-danger me-2"></i>
          Failed to load items. Please try again.
        </td>
      </tr>
    `;
  }
}


function editSupplier(supplierId) {
  const modal = document.getElementById('supplierModal');
  const modalTitle = document.getElementById('supplierModalTitle');
  const form = document.getElementById('supplierForm');
  
  // Reset form
  form.reset();
  

  const supplier = suppliers.find(s => s._id === supplierId);
  
  if (supplier) {
    // Update modal title
    modalTitle.textContent = 'Edit Supplier';
    
    // Populate form fields
    document.getElementById('supplierId').value = supplier._id;
    document.getElementById('supplierName').value = supplier.name;
    document.getElementById('contactPerson').value = supplier.contactPerson || '';
    document.getElementById('supplierEmail').value = supplier.email || '';
    document.getElementById('supplierPhone').value = supplier.phone || '';
    document.getElementById('supplierAddress').value = supplier.address || '';
    
    // Open the modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
  } else {
    showAlert('Supplier not found', 'danger');
  }
}

// Save supplier
async function saveSupplier() {
  try {
    // Get form data
    const supplierId = document.getElementById('supplierId').value;
    const name = document.getElementById('supplierName').value;
    const contactPerson = document.getElementById('contactPerson').value;
    const email = document.getElementById('supplierEmail').value;
    const phone = document.getElementById('supplierPhone').value;
    const address = document.getElementById('supplierAddress').value;
    
    // Validate name
    if (!name) {
      showAlert('Please enter a supplier name', 'danger');
      return;
    }
    
    // Prepare supplier data
    const supplierData = {
      name,
      contactPerson,
      email,
      phone,
      address
    };
    
    // Show loading state
    const saveBtn = document.getElementById('saveSupplierBtn');
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';
    saveBtn.disabled = true;
    
    let response;
    
    if (supplierId) {
      // Update existing supplier
      response = await fetchWithAuth(`${API_URL}/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(supplierData)
      });
    } else {
      // Create new supplier
      response = await fetchWithAuth(`${API_URL}/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(supplierData)
      });
    }
    
    // Reset button state
    saveBtn.innerHTML = 'Save Supplier';
    saveBtn.disabled = false;
    
    if (!response) return;
    
    if (response.ok) {
      // Close modal
      bootstrap.Modal.getInstance(document.getElementById('supplierModal')).hide();
      
      // Show success message
      showAlert(`Supplier ${supplierId ? 'updated' : 'created'} successfully`, 'success');
      
      // Reload suppliers
      loadSuppliers();
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || `Failed to ${supplierId ? 'update' : 'create'} supplier`, 'danger');
    }
  } catch (error) {
    console.error('Save supplier error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    
    // Reset button state
    const saveBtn = document.getElementById('saveSupplierBtn');
    saveBtn.innerHTML = 'Save Supplier';
    saveBtn.disabled = false;
  }
}

// Delete supplier
async function deleteSupplier(supplierId) {
  try {
    // Send delete request
    const response = await fetchWithAuth(`${API_URL}/suppliers/${supplierId}`, {
      method: 'DELETE'
    });
    
    if (!response) return;
    
    if (response.ok) {
      // Show success message
      showAlert('Supplier deleted successfully', 'success');
      
      // Reload suppliers
      loadSuppliers();
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to delete supplier', 'danger');
    }
  } catch (error) {
    console.error('Delete supplier error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
  }
}

// Export suppliers to CSV
function exportToCSV() {
  try {
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add headers
    const headers = ['Supplier Name', 'Contact Person', 'Email', 'Phone', 'Address'];
    csvContent += headers.join(',') + '\n';
    
    // Add rows
    filteredSuppliers.forEach(supplier => {
      const rowData = [
        `"${supplier.name}"`,
        `"${supplier.contactPerson || ''}"`,
        `"${supplier.email || ''}"`,
        `"${supplier.phone || ''}"`,
        `"${supplier.address || ''}"`
      ];
      
      csvContent += rowData.join(',') + '\n';
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `suppliers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  } catch (error) {
    console.error('Export error:', error);
    showAlert('Failed to export suppliers', 'danger');
  }
}

// Print suppliers
function printSuppliers() {
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
  
  // Search input
  document.getElementById('searchInput').addEventListener('input', (e) => {
    filterSuppliers(e.target.value.trim());
  });
  
  // Add supplier button
  document.getElementById('addSupplierBtn').addEventListener('click', () => {
    // Reset form
    document.getElementById('supplierForm').reset();
    document.getElementById('supplierId').value = '';
    
    // Update modal title
    document.getElementById('supplierModalTitle').textContent = 'Add Supplier';
  });
  
  // Save supplier button
  document.getElementById('saveSupplierBtn').addEventListener('click', saveSupplier);
  
  // Export button
  document.getElementById('exportBtn').addEventListener('click', exportToCSV);
  
  // Print button
  document.getElementById('printBtn').addEventListener('click', printSuppliers);
}