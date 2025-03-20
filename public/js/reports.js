// public/js/reports.js

// Global variables
let inventoryChartInstance = null;
let transactionTypeChartInstance = null;
let transactionTimeChartInstance = null;
let locationChartInstance = null;
let rooms = [];
let currentTransactionPage = 1;
let transactionTotalPages = 1;
let currentTransactionFilters = {};

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
  
  // Show/hide admin links based on user role
  if (isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
  }
  
  // Update user info
  document.getElementById('userName').textContent = user.name;
  document.getElementById('profileName').value = user.name;
  document.getElementById('profileEmail').value = user.email;
  document.getElementById('profileRole').value = user.role;
  
  // Initialize the active tab
  initializeReports();
  
  // Listen for tab changes
  document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tab => {
    tab.addEventListener('shown.bs.tab', (event) => {
      const targetId = event.target.getAttribute('aria-controls');
      loadTabData(targetId);
    });
  });
  
  // Check if URL specifies a tab
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam) {
    // Activate the specified tab
    const tabElement = document.querySelector(`#${tabParam}-tab`);
    if (tabElement) {
      const tab = new bootstrap.Tab(tabElement);
      tab.show();
    }
  }
});

// Initialize reports
function initializeReports() {
  // Load locations for filters
  loadLocationFilters();
  
  // Load initial tab data (default: inventory)
  loadTabData('inventory');
}

// Load tab data based on tab ID
function loadTabData(tabId) {
  switch (tabId) {
    case 'inventory':
      loadInventoryReport();
      break;
    case 'transactions':
      loadTransactionsReport();
      break;
    case 'maintenance':
      loadMaintenanceReport();
      break;
    case 'locations':
      loadLocationReport();
      break;
  }
}

// Load location data for filter dropdowns
async function loadLocationFilters() {
  try {
    // Fetch room locations
    const response = await fetchWithAuth(`${API_URL}/locations?type=Room`);
    
    if (!response) return;
    
    if (response.ok) {
      rooms = await response.json();
      
      // Populate inventory location filter
      const inventoryLocationFilter = document.getElementById('inventoryLocationFilter');
      inventoryLocationFilter.innerHTML = '<option value="">All Locations</option>';
      
      rooms.forEach(room => {
        inventoryLocationFilter.innerHTML += `<option value="${room._id}">${room.name}</option>`;
      });
    }
  } catch (error) {
    console.error('Error loading locations:', error);
  }
}

// ----- INVENTORY REPORT -----

// Load inventory report data
async function loadInventoryReport() {
  try {
    // Get filter values
    const category = document.getElementById('inventoryCategoryFilter').value;
    const status = document.getElementById('inventoryStatusFilter').value;
    const locationId = document.getElementById('inventoryLocationFilter').value;
    const sort = document.getElementById('inventorySortBy').value;
    
    // Build query parameters
    let query = '?';
    if (category) query += `category=${encodeURIComponent(category)}&`;
    if (status) query += `status=${encodeURIComponent(status)}&`;
    if (locationId) query += `location=${encodeURIComponent(locationId)}&`;
    if (sort) query += `sort=${encodeURIComponent(sort)}&`;
    
    // Show loading state in table
    document.getElementById('inventoryReportTable').innerHTML = `
      <tr>
        <td colspan="7" class="text-center">
          <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          Loading inventory data...
        </td>
      </tr>
    `;
    
    // Fetch inventory report
    const response = await fetchWithAuth(`${API_URL}/reports/inventory${query}`);
    
    if (!response) return;
    
    if (response.ok) {
      const data = await response.json();
      
      // Update summary data
      updateInventorySummary(data.summary);
      
      // Update inventory chart
      createInventoryCategoryChart(data.summary.itemsByCategory);
      
      // Update inventory table
      updateInventoryTable(data.items);
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to load inventory report', 'danger');
      
      document.getElementById('inventoryReportTable').innerHTML = `
        <tr>
          <td colspan="7" class="text-center">
            <i class="fas fa-exclamation-circle text-danger me-2"></i>
            Failed to load inventory data
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Inventory report error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    
    document.getElementById('inventoryReportTable').innerHTML = `
      <tr>
        <td colspan="7" class="text-center">
          <i class="fas fa-exclamation-circle text-danger me-2"></i>
          Failed to load inventory data
        </td>
      </tr>
    `;
  }
}

// Update inventory summary
function updateInventorySummary(summary) {
  document.getElementById('inventoryTotalItems').textContent = summary.totalItems || 0;
  document.getElementById('inventoryTotalQuantity').textContent = summary.totalQuantity || 0;
  document.getElementById('inventoryTotalValue').textContent = formatCurrency(summary.totalValue || 0);
  
  // Count low stock items
  let lowStockCount = 0;
  for (const category in summary.itemsByCategory) {
    if (summary.itemsByCategory[category].lowStock) {
      lowStockCount += summary.itemsByCategory[category].lowStock;
    }
  }
  document.getElementById('inventoryLowStockItems').textContent = lowStockCount;
}

// Create inventory category chart
function createInventoryCategoryChart(categoryData) {
  const ctx = document.getElementById('inventoryCategoryChart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (inventoryChartInstance) {
    inventoryChartInstance.destroy();
  }
  
  // Prepare data for chart
  const categories = [];
  const itemCounts = [];
  const totalValues = [];
  const backgroundColors = [
    'rgba(0, 132, 61, 0.7)',
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 206, 86, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)',
    'rgba(231, 76, 60, 0.7)'
  ];
  
  // Format category data
  let index = 0;
  for (const category in categoryData) {
    categories.push(category);
    itemCounts.push(categoryData[category].count || 0);
    totalValues.push(categoryData[category].value || 0);
    index++;
  }
  
  // Create the chart
  inventoryChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [
        {
          label: 'Item Count',
          data: itemCounts,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
          borderWidth: 1
        },
        {
          label: 'Total Value (KES)',
          data: totalValues,
          type: 'line',
          fill: false,
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Item Count'
          }
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          grid: {
            drawOnChartArea: false
          },
          title: {
            display: true,
            text: 'Total Value (KES)'
          },
          ticks: {
            callback: function(value) {
              return value.toLocaleString('en-KE', {
                style: 'currency',
                currency: 'KES',
                maximumFractionDigits: 0
              });
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.dataset.label === 'Total Value (KES)') {
                return context.dataset.label + ': ' + formatCurrency(context.raw);
              }
              return context.dataset.label + ': ' + context.raw;
            }
          }
        }
      }
    }
  });
}

// Update inventory table
function updateInventoryTable(items) {
  const tableBody = document.getElementById('inventoryReportTable');
  
  if (!items || items.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">
          <i class="fas fa-info-circle text-info me-2"></i>
          No inventory items found matching the criteria
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  
  items.forEach(item => {
    // Format location
    let locationStr = 'N/A';
    if (item.location) {
      if (item.location.room && item.location.room.name) {
        locationStr = item.location.room.name;
        
        if (item.location.rack && item.location.rack.name) {
          locationStr += ` → ${item.location.rack.name}`;
          
          if (item.location.shelf && item.location.shelf.name) {
            locationStr += ` → ${item.location.shelf.name}`;
          }
        }
      }
    }
    
    // Calculate total value
    const totalValue = item.quantity * item.unitCost;
    
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
          ${item.quantity <= item.reorderLevel ? '<span class="badge bg-danger ms-1">Low</span>' : ''}
        </td>
        <td>${formatCurrency(item.unitCost)}</td>
        <td>${formatCurrency(totalValue)}</td>
        <td>
          <span class="${getStatusBadgeClass(item.status)}">${item.status}</span>
        </td>
        <td>${locationStr}</td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
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

// ----- TRANSACTIONS REPORT -----

// Load transactions report data
async function loadTransactionsReport() {
  try {
    // Get filter values
    const type = currentTransactionFilters.type || '';
    const startDate = currentTransactionFilters.startDate || '';
    const endDate = currentTransactionFilters.endDate || '';
    
    // Build query parameters
    let query = `?page=${currentTransactionPage}&limit=20`;
    if (type) query += `&type=${encodeURIComponent(type)}`;
    if (startDate) query += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) query += `&endDate=${encodeURIComponent(endDate)}`;
    
    // Show loading state in table
    document.getElementById('transactionsReportTable').innerHTML = `
      <tr>
        <td colspan="7" class="text-center">
          <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          Loading transaction data...
        </td>
      </tr>
    `;
    
    // Fetch transactions report
    const response = await fetchWithAuth(`${API_URL}/reports/transactions${query}`);
    
    if (!response) return;
    
    if (response.ok) {
      const data = await response.json();
      
      // Update transactions chart
      createTransactionTypeChart(data.summary.transactionsByType);
      createTransactionTimeChart(data.summary.transactionsByDay);
      
      // Update transactions table
      updateTransactionsTable(data.transactions);
      
      // Update pagination
      updateTransactionsPagination(data);
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to load transactions report', 'danger');
      
      document.getElementById('transactionsReportTable').innerHTML = `
        <tr>
          <td colspan="7" class="text-center">
            <i class="fas fa-exclamation-circle text-danger me-2"></i>
            Failed to load transaction data
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Transactions report error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    
    document.getElementById('transactionsReportTable').innerHTML = `
      <tr>
        <td colspan="7" class="text-center">
          <i class="fas fa-exclamation-circle text-danger me-2"></i>
          Failed to load transaction data
          </td>
        </tr>
      `;
    }
  }
  
  // Create transaction type chart
  function createTransactionTypeChart(typeData) {
    const ctx = document.getElementById('transactionTypeChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (transactionTypeChartInstance) {
      transactionTypeChartInstance.destroy();
    }
    
    // Prepare data for chart
    const types = typeData.map(type => type._id);
    const counts = typeData.map(type => type.count);
    
    // Define colors for different transaction types
    const backgroundColors = {
      'Check-in': 'rgba(40, 167, 69, 0.7)',
      'Check-out': 'rgba(255, 193, 7, 0.7)',
      'Maintenance': 'rgba(23, 162, 184, 0.7)',
      'Restock': 'rgba(0, 123, 255, 0.7)'
    };
    
    const colors = types.map(type => backgroundColors[type] || 'rgba(108, 117, 125, 0.7)');
    
    // Create the chart
    transactionTypeChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: types,
        datasets: [{
          data: counts,
          backgroundColor: colors,
          borderColor: colors.map(color => color.replace('0.7', '1')),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

// Create transaction time chart
function createTransactionTimeChart(timeData) {
  const ctx = document.getElementById('transactionTimeChart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (transactionTimeChartInstance) {
    transactionTimeChartInstance.destroy();
  }
  
  // Sort data by date
  timeData.sort((a, b) => new Date(a._id) - new Date(b._id));
  
  // Prepare data for chart
  const dates = timeData.map(item => {
    const date = new Date(item._id);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const counts = timeData.map(item => item.count);
  
  // Create the chart
  transactionTimeChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Number of Transactions',
        data: counts,
        fill: false,
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1,
        pointBackgroundColor: 'rgba(75, 192, 192, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(75, 192, 192, 1)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

// Update transactions table
function updateTransactionsTable(transactions) {
  const tableBody = document.getElementById('transactionsReportTable');
  
  if (!transactions || transactions.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">
          <i class="fas fa-info-circle text-info me-2"></i>
          No transactions found matching the criteria
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  
  transactions.forEach(transaction => {
    // Format date
    const date = formatDate(transaction.timestamp);
    
    // Get item info
    const itemName = transaction.item ? transaction.item.name : 'N/A';
    const itemBarcode = transaction.item ? transaction.item.barcode : '';
    
    // Get location info
    let locationStr = 'N/A';
    if (transaction.type === 'Check-in' && transaction.fromLocation) {
      locationStr = `From: ${transaction.fromLocation.name}`;
    } else if (transaction.type === 'Check-out' && transaction.toLocation) {
      locationStr = `To: ${transaction.toLocation.name}`;
    } else if (transaction.type === 'Restock') {
      if (transaction.fromLocation) {
        locationStr = `From: ${transaction.fromLocation.name}`;
      }
      if (transaction.toLocation) {
        locationStr += locationStr ? ` To: ${transaction.toLocation.name}` : `To: ${transaction.toLocation.name}`;
      }
    }
    
    // Get user info
    const userName = transaction.performedBy ? transaction.performedBy.name : 'N/A';
    
    html += `
      <tr>
        <td>${date}</td>
        <td>
          <div>
            <span>${itemName}</span>
            ${itemBarcode ? `<div class="small text-muted">${itemBarcode}</div>` : ''}
          </div>
        </td>
        <td>
          <span class="badge ${getTransactionTypeBadge(transaction.type)}">${transaction.type}</span>
        </td>
        <td>${transaction.quantity}</td>
        <td>${locationStr}</td>
        <td>${userName}</td>
        <td>
          <small>${transaction.notes || '-'}</small>
        </td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
}

// Update transactions pagination
function updateTransactionsPagination(data) {
  const paginationEl = document.getElementById('transactionsPagination');
  
  // Update total pages
  transactionTotalPages = data.pages || 1;
  
  if (transactionTotalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }
  
  const paginationNav = createPagination(data.page, transactionTotalPages, (page) => {
    currentTransactionPage = page;
    loadTransactionsReport();
  });
  
  paginationEl.innerHTML = '';
  paginationEl.appendChild(paginationNav);
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

// ----- MAINTENANCE REPORT -----

// Load maintenance report data
async function loadMaintenanceReport() {
  try {
    // Show loading state in tables
    document.getElementById('underMaintenanceTable').innerHTML = `
      <tr>
        <td colspan="6" class="text-center">
          <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          Loading maintenance data...
        </td>
      </tr>
    `;
    
    document.getElementById('dueForMaintenanceTable').innerHTML = `
      <tr>
        <td colspan="6" class="text-center">
          <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          Loading maintenance data...
        </td>
      </tr>
    `;
    
    document.getElementById('maintenanceHistoryTable').innerHTML = `
      <tr>
        <td colspan="5" class="text-center">
          <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          Loading maintenance history...
        </td>
      </tr>
    `;
    
    // Fetch maintenance report
    const response = await fetchWithAuth(`${API_URL}/reports/maintenance`);
    
    if (!response) return;
    
    if (response.ok) {
      const data = await response.json();
      
      // Update summary counts
      document.getElementById('itemsUnderMaintenance').textContent = data.itemsUnderMaintenance.length || 0;
      document.getElementById('itemsDueForMaintenance').textContent = data.itemsDueForMaintenance.length || 0;
      document.getElementById('maintenanceActivities').textContent = data.maintenanceHistory.length || 0;
      
      // Update tables
      updateUnderMaintenanceTable(data.itemsUnderMaintenance);
      updateDueForMaintenanceTable(data.itemsDueForMaintenance);
      updateMaintenanceHistoryTable(data.maintenanceHistory);
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to load maintenance report', 'danger');
      
      // Show error in tables
      const errorHtml = `
        <tr>
          <td colspan="6" class="text-center">
            <i class="fas fa-exclamation-circle text-danger me-2"></i>
            Failed to load maintenance data
          </td>
        </tr>
      `;
      
      document.getElementById('underMaintenanceTable').innerHTML = errorHtml;
      document.getElementById('dueForMaintenanceTable').innerHTML = errorHtml;
      document.getElementById('maintenanceHistoryTable').innerHTML = errorHtml.replace('colspan="6"', 'colspan="5"');
    }
  } catch (error) {
    console.error('Maintenance report error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    
    // Show error in tables
    const errorHtml = `
      <tr>
        <td colspan="6" class="text-center">
          <i class="fas fa-exclamation-circle text-danger me-2"></i>
          Failed to load maintenance data
        </td>
      </tr>
    `;
    
    document.getElementById('underMaintenanceTable').innerHTML = errorHtml;
    document.getElementById('dueForMaintenanceTable').innerHTML = errorHtml;
    document.getElementById('maintenanceHistoryTable').innerHTML = errorHtml.replace('colspan="6"', 'colspan="5"');
  }
}

// Update under maintenance table
function updateUnderMaintenanceTable(items) {
  const tableBody = document.getElementById('underMaintenanceTable');
  
  if (!items || items.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">
          <i class="fas fa-info-circle text-info me-2"></i>
          No items currently under maintenance
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  
  items.forEach(item => {
    // Format location
    let locationStr = 'N/A';
    if (item.location && item.location.room) {
      locationStr = item.location.room.name;
    }
    
    html += `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <i class="fas fa-tools text-warning me-2"></i>
            <div>
              <h6 class="mb-0">${item.name}</h6>
            </div>
          </div>
        </td>
        <td>${item.category}</td>
        <td>${item.serialNumber || 'N/A'}</td>
        <td>${item.lastMaintenanceDate ? formatDate(item.lastMaintenanceDate) : 'N/A'}</td>
        <td>${locationStr}</td>
        <td>
          <a href="inventory.html?id=${item._id}" class="btn btn-sm btn-outline-primary">
            <i class="fas fa-eye"></i> View
          </a>
        </td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
}

// Update due for maintenance table
function updateDueForMaintenanceTable(items) {
  const tableBody = document.getElementById('dueForMaintenanceTable');
  
  if (!items || items.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">
          <i class="fas fa-info-circle text-info me-2"></i>
          No items due for maintenance in the next 30 days
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  
  const today = new Date();
  
  items.forEach(item => {
    // Calculate days left
    const nextMaintenance = new Date(item.nextMaintenanceDate);
    const timeDiff = nextMaintenance - today;
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Determine badge color
    let badgeClass = 'bg-success';
    if (daysLeft <= 7) {
      badgeClass = 'bg-danger';
    } else if (daysLeft <= 14) {
      badgeClass = 'bg-warning';
    }
    
    html += `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <i class="fas fa-wrench text-primary me-2"></i>
            <div>
              <h6 class="mb-0">${item.name}</h6>
            </div>
          </div>
        </td>
        <td>${item.category}</td>
        <td>${formatDate(item.nextMaintenanceDate)}</td>
        <td><span class="badge ${badgeClass}">${daysLeft} days</span></td>
        <td>
          <span class="${getStatusBadgeClass(item.status)}">${item.status}</span>
        </td>
        <td>
          <div class="btn-group">
            <a href="inventory.html?id=${item._id}" class="btn btn-sm btn-outline-primary">
              <i class="fas fa-eye"></i> View
            </a>
            <button type="button" class="btn btn-sm btn-outline-warning maintenance-btn" data-id="${item._id}" data-name="${item.name}">
              <i class="fas fa-tools"></i> Send to Maintenance
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
  
  // Add event listeners to maintenance buttons
  document.querySelectorAll('.maintenance-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sendToMaintenance(btn.dataset.id, btn.dataset.name);
    });
  });
}

// Update maintenance history table
// ----- LOCATION REPORT -----

// Load location usage report
async function loadLocationReport() {
  try {
    // Show loading state in table
    document.getElementById('locationUsageTable').innerHTML = `
      <tr>
        <td colspan="5" class="text-center">
          <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          Loading location data...
        </td>
      </tr>
    `;
    
    // Fetch location report
    const response = await fetchWithAuth(`${API_URL}/reports/locations`);
    
    if (!response) return;
    
    if (response.ok) {
      const data = await response.json();
      
      // Create location chart
      createLocationUsageChart(data);
      
      // Update location table
      updateLocationUsageTable(data);
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to load location report', 'danger');
      
      document.getElementById('locationUsageTable').innerHTML = `
        <tr>
          <td colspan="5" class="text-center">
            <i class="fas fa-exclamation-circle text-danger me-2"></i>
            Failed to load location data
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Location report error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    
    document.getElementById('locationUsageTable').innerHTML = `
      <tr>
        <td colspan="5" class="text-center">
          <i class="fas fa-exclamation-circle text-danger me-2"></i>
          Failed to load location data
        </td>
      </tr>
    `;
  }
}

// Create location usage chart
function createLocationUsageChart(data) {
  const ctx = document.getElementById('locationUsageChart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (locationChartInstance) {
    locationChartInstance.destroy();
  }
  
  // Prepare data for chart
  const roomNames = data.map(room => room.name);
  const itemCounts = data.map(room => room.valueStats.totalItems || 0);
  const itemValues = data.map(room => room.valueStats.totalValue || 0);
  
  // Create the chart
  locationChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: roomNames,
      datasets: [
        {
          label: 'Number of Items',
          data: itemCounts,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        },
        {
          label: 'Total Value (KES)',
          data: itemValues,
          type: 'line',
          fill: false,
          borderColor: 'rgba(255, 99, 132, 1)',
          tension: 0.1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Items'
          }
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          grid: {
            drawOnChartArea: false
          },
          title: {
            display: true,
            text: 'Total Value (KES)'
          },
          ticks: {
            callback: function(value) {
              return value.toLocaleString('en-KE', {
                style: 'currency',
                currency: 'KES',
                maximumFractionDigits: 0
              });
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.dataset.label === 'Total Value (KES)') {
                return context.dataset.label + ': ' + formatCurrency(context.raw);
              }
              return context.dataset.label + ': ' + context.raw;
            }
          }
        }
      }
    }
  });
}

// Update location usage table
function updateLocationUsageTable(data) {
  const tableBody = document.getElementById('locationUsageTable');
  
  if (!data || data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center">
          <i class="fas fa-info-circle text-info me-2"></i>
          No location data found
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  
  data.forEach(room => {
    // Format categories
    let categories = 'None';
    if (room.itemsByCategory && room.itemsByCategory.length > 0) {
      categories = room.itemsByCategory
        .map(cat => `${cat._id} (${cat.count})`)
        .join(', ');
    }
    
    // Get item count and value
    const itemCount = room.valueStats ? room.valueStats.totalItems || 0 : 0;
    const totalValue = room.valueStats ? room.valueStats.totalValue || 0 : 0;
    
    html += `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <i class="fas fa-door-open text-primary me-2"></i>
            <div>
              <h6 class="mb-0">${room.name}</h6>
            </div>
          </div>
        </td>
        <td>${itemCount}</td>
        <td>
          <small>${categories}</small>
        </td>
        <td>${formatCurrency(totalValue)}</td>
        <td>
          <a href="inventory.html?location=${room._id}" class="btn btn-sm btn-outline-primary">
            <i class="fas fa-boxes me-1"></i> View Items
          </a>
        </td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
}

// Export current report
function exportCurrentReport() {
  // Determine which tab is active
  const activeTab = document.querySelector('.tab-pane.active');
  const tabId = activeTab.id;
  
  switch (tabId) {
    case 'inventory':
      exportInventoryReport();
      break;
    case 'transactions':
      exportTransactionsReport();
      break;
    case 'maintenance':
      exportMaintenanceReport();
      break;
    case 'locations':
      exportLocationReport();
      break;
    default:
      showAlert('Unknown report type', 'danger');
  }
}

// Export inventory report to CSV
function exportInventoryReport() {
  try {
    // Get table data
    const table = document.querySelector('#inventory table');
    const rows = table.querySelectorAll('tbody tr');
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add headers
    const headers = ['Item Name', 'Category', 'Quantity', 'Unit Cost', 'Total Value', 'Status', 'Location'];
    csvContent += headers.join(',') + '\n';
    
    // Add rows
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length <= 1) return; // Skip "no items found" row
      
      // Extract text content from cells (clean up to remove HTML)
      const itemName = cells[0].textContent.trim().replace(/\s+/g, ' ').split('No S/N')[0].trim();
      const category = cells[1].textContent.trim();
      const quantity = cells[2].textContent.trim().split('Low')[0].trim();
      const unitCost = cells[3].textContent.trim();
      const totalValue = cells[4].textContent.trim();
      const status = cells[5].textContent.trim();
      const location = cells[6].textContent.trim();
      
      const rowData = [
        `"${itemName}"`,
        `"${category}"`,
        `"${quantity}"`,
        `"${unitCost}"`,
        `"${totalValue}"`,
        `"${status}"`,
        `"${location}"`
      ];
      
      csvContent += rowData.join(',') + '\n';
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  } catch (error) {
    console.error('Export error:', error);
    showAlert('Failed to export inventory report', 'danger');
  }
}

// Export transactions report to CSV
function exportTransactionsReport() {
  try {
    // Get table data
    const table = document.querySelector('#transactions table');
    const rows = table.querySelectorAll('tbody tr');
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add headers
    const headers = ['Date & Time', 'Item', 'Type', 'Quantity', 'Location', 'Performed By', 'Notes'];
    csvContent += headers.join(',') + '\n';
    
    // Add rows
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length <= 1) return; // Skip "no transactions found" row
      
      // Extract text content from cells (clean up to remove HTML)
      const dateTime = cells[0].textContent.trim();
      const item = cells[1].textContent.trim().replace(/\s+/g, ' ');
      const type = cells[2].textContent.trim();
      const quantity = cells[3].textContent.trim();
      const location = cells[4].textContent.trim();
      const performedBy = cells[5].textContent.trim();
      const notes = cells[6].textContent.trim();
      
      const rowData = [
        `"${dateTime}"`,
        `"${item}"`,
        `"${type}"`,
        `"${quantity}"`,
        `"${location}"`,
        `"${performedBy}"`,
        `"${notes}"`
      ];
      
      csvContent += rowData.join(',') + '\n';
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transactions_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  } catch (error) {
    console.error('Export error:', error);
    showAlert('Failed to export transactions report', 'danger');
  }
}

// Export maintenance report to CSV
function exportMaintenanceReport() {
  try {
    // Get table data
    const underMaintenanceTable = document.querySelector('#underMaintenanceTable');
    const dueForMaintenanceTable = document.querySelector('#dueForMaintenanceTable');
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add headers and data for items under maintenance
    csvContent += 'ITEMS UNDER MAINTENANCE\n';
    csvContent += 'Item Name,Category,Serial Number,Last Maintenance,Location\n';
    
    // Add under maintenance rows
    underMaintenanceTable.querySelectorAll('tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length <= 1) return; // Skip "no items found" row
      
      // Extract text content from cells
      const itemName = cells[0].textContent.trim().replace(/\s+/g, ' ');
      const category = cells[1].textContent.trim();
      const serialNumber = cells[2].textContent.trim();
      const lastMaintenance = cells[3].textContent.trim();
      const location = cells[4].textContent.trim();
      
      const rowData = [
        `"${itemName}"`,
        `"${category}"`,
        `"${serialNumber}"`,
        `"${lastMaintenance}"`,
        `"${location}"`
      ];
      
      csvContent += rowData.join(',') + '\n';
    });
    
    // Add headers and data for items due for maintenance
    csvContent += '\nITEMS DUE FOR MAINTENANCE\n';
    csvContent += 'Item Name,Category,Next Maintenance,Days Left,Current Status\n';
    
    // Add due for maintenance rows
    dueForMaintenanceTable.querySelectorAll('tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length <= 1) return; // Skip "no items found" row
      
      // Extract text content from cells
      const itemName = cells[0].textContent.trim().replace(/\s+/g, ' ');
      const category = cells[1].textContent.trim();
      const nextMaintenance = cells[2].textContent.trim();
      const daysLeft = cells[3].textContent.trim();
      const status = cells[4].textContent.trim();
      
      const rowData = [
        `"${itemName}"`,
        `"${category}"`,
        `"${nextMaintenance}"`,
        `"${daysLeft}"`,
        `"${status}"`
      ];
      
      csvContent += rowData.join(',') + '\n';
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `maintenance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  } catch (error) {
    console.error('Export error:', error);
    showAlert('Failed to export maintenance report', 'danger');
  }
}

// Export location report to CSV
function exportLocationReport() {
  try {
    // Get table data
    const table = document.querySelector('#locations table');
    const rows = table.querySelectorAll('tbody tr');
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add headers
    const headers = ['Room', 'Items Count', 'Categories', 'Total Value'];
    csvContent += headers.join(',') + '\n';
    
    // Add rows
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length <= 1) return; // Skip "no rooms found" row
      
      // Extract text content from cells
      const room = cells[0].textContent.trim().replace(/\s+/g, ' ');
      const itemsCount = cells[1].textContent.trim();
      const categories = cells[2].textContent.trim();
      const totalValue = cells[3].textContent.trim();
      
      const rowData = [
        `"${room}"`,
        `"${itemsCount}"`,
        `"${categories}"`,
        `"${totalValue}"`
      ];
      
      csvContent += rowData.join(',') + '\n';
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `location_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  } catch (error) {
    console.error('Export error:', error);
    showAlert('Failed to export location report', 'danger');
  }
}

// Print current report
function printCurrentReport() {
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
  
  // Inventory filters
  document.getElementById('inventoryCategoryFilter').addEventListener('change', loadInventoryReport);
  document.getElementById('inventoryStatusFilter').addEventListener('change', loadInventoryReport);
  document.getElementById('inventoryLocationFilter').addEventListener('change', loadInventoryReport);
  document.getElementById('inventorySortBy').addEventListener('change', loadInventoryReport);
  
  // Transaction filters
  document.getElementById('applyTransactionFilters').addEventListener('click', () => {
    // Reset to first page
    currentTransactionPage = 1;
    
    // Get filter values
    currentTransactionFilters = {
      type: document.getElementById('transactionTypeFilter').value,
      startDate: document.getElementById('transactionStartDate').value,
      endDate: document.getElementById('transactionEndDate').value
    };
    
    // Load transactions with filters
    loadTransactionsReport();
  });
  
  // Export and print buttons
  document.getElementById('exportReportBtn').addEventListener('click', exportCurrentReport);
  document.getElementById('printReportBtn').addEventListener('click', printCurrentReport);
}

function updateMaintenanceHistoryTable(history) {
  const tableBody = document.getElementById('maintenanceHistoryTable');
  
  if (!history || history.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center">
          <i class="fas fa-info-circle text-info me-2"></i>
          No maintenance history found
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  
  history.forEach(transaction => {
    // Format date
    const date = formatDate(transaction.timestamp);
    
    // Get item info
    const itemName = transaction.item ? transaction.item.name : 'N/A';
    const itemCategory = transaction.item ? transaction.item.category : 'N/A';
    
    // Get user info
    const userName = transaction.performedBy ? transaction.performedBy.name : 'N/A';
    
    html += `
      <tr>
        <td>${date}</td>
        <td>${itemName}</td>
        <td>${itemCategory}</td>
        <td>${userName}</td>
        <td>${transaction.notes || '-'}</td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
}

// Send item to maintenance
async function sendToMaintenance(itemId, itemName) {
  // Ask for confirmation with notes
  const { value: notes } = await Swal.fire({
    title: 'Send to Maintenance',
    text: `Are you sure you want to send "${itemName}" to maintenance?`,
    icon: 'question',
    input: 'textarea',
    inputLabel: 'Maintenance Notes',
    inputPlaceholder: 'Enter notes about the maintenance required...',
    showCancelButton: true,
    confirmButtonText: 'Yes, Send to Maintenance',
    confirmButtonColor: '#ffc107',
    cancelButtonText: 'Cancel'
  });
  
  if (notes !== undefined) {
    try {
      // Create maintenance transaction
      const response = await fetchWithAuth(`${API_URL}/items/${itemId}/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'Maintenance',
          quantity: 1,
          notes: notes || 'Scheduled maintenance'
        })
      });
      
      if (!response) return;
      
      if (response.ok) {
        // Show success message
        showAlert('Item sent to maintenance successfully', 'success');
        
        // Reload maintenance report
        loadMaintenanceReport();
      } else {
        const errorData = await response.json();
        showAlert(errorData.message || 'Failed to send item to maintenance', 'danger');
      }
    } catch (error) {
      console.error('Maintenance error:', error);
      showAlert('Failed to connect to server. Please try again.', 'danger');
    }
  }
}