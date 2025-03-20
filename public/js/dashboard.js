// public/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const token = getAuthToken();
    const user = getCurrentUser();
    
    if (!token || !user) {
      window.location.href = '../index.html';
      return;
    }
    
    // Initialize the dashboard
    initializeDashboard();
    
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
  });

  document.addEventListener('DOMContentLoaded', () => {
    // Existing code...
    
    // Refresh tooltips when dashboard is refreshed
    document.getElementById('refreshDashboard').addEventListener('click', () => {
      // Remove any existing tooltips
      const oldTooltip = bootstrap.Tooltip.getInstance(document.querySelector('.top-items-info-trigger'));
      if (oldTooltip) {
        oldTooltip.dispose();
      }
      
      // Then refresh dashboard
      initializeDashboard();
    });
  });
  
  // Initialize dashboard data
  async function initializeDashboard() {
    try {
      // Fetch dashboard data
      const response = await fetchWithAuth(`${API_URL}/reports/dashboard`);
      
      if (!response) return;
      
      if (response.ok) {
        const data = await response.json();
        updateDashboardUI(data);
      } else {
        const errorData = await response.json();
        showAlert(errorData.message || 'Failed to load dashboard data', 'danger');
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      showAlert('Failed to connect to server. Please try again.', 'danger');
    }
  }
  
  // Update dashboard UI with data
  function updateDashboardUI(data) {
    // Update summary cards
    document.getElementById('totalItems').textContent = data.totalItems || 0;
    document.getElementById('lowStockItems').textContent = data.lowStockItems || 0;
    document.getElementById('maintenanceItems').textContent = data.itemsUnderMaintenance || 0;
    // document.getElementById('inventoryValue').textContent = formatCurrency(data.inventoryValue || 0);
    
    const mostUsedItem = data.mostUsedItems && data.mostUsedItems.length > 0 ? 
        `${data.mostUsedItems[0].name} (${data.mostUsedItems[0].totalQuantity} uses)` : 
        'No data';
    document.getElementById('mostUsedItem').textContent = mostUsedItem;
    
    // Tooltip for top 3 items
    if (data.mostUsedItems && data.mostUsedItems.length > 0) {
        const topItem = data.mostUsedItems[0];
        document.getElementById('mostUsedItem').textContent = `${topItem.name} (${topItem.totalQuantity})`;
        
        // Create tooltip content for top 3 items
        let tooltipContent = '<div class="top-items-tooltip">';
        for (let i = 0; i < Math.min(3, data.mostUsedItems.length); i++) {
          const item = data.mostUsedItems[i];
          const itemClass = i === 0 ? 'top-item-gold' : i === 1 ? 'top-item-silver' : 'top-item-bronze';
          
          tooltipContent += `
            <div class="top-item ${itemClass}">
              <span class="top-item-rank">#${i+1}</span>
              <span class="top-item-name">${item.name}</span>
              <span class="top-item-count">${item.totalQuantity} uses</span>
            </div>
          `;
        }
        tooltipContent += '</div>';
        
        // Update the tooltip
        const tooltipTrigger = document.querySelector('.top-items-info-trigger');
        tooltipTrigger.setAttribute('data-bs-original-title', tooltipContent);
        
        // Initialize Bootstrap tooltip
        const tooltip = new bootstrap.Tooltip(tooltipTrigger, {
          html: true,
          placement: 'bottom',
          template: '<div class="tooltip top-items-tooltip-container" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
        });
      } else {
        document.getElementById('mostUsedItem').textContent = 'No data available';
        document.querySelector('.top-items-info-trigger').classList.add('d-none');
      }
     
    
    // Create charts
    createCategoryChart(data.itemsByCategory || []);
    createStatusChart(data.itemsByStatus || []);
    
      // Update tables
  updateRecentTransactionsTable(data.recentTransactions || []);
  
  // Fetch low stock items only if user has permission (Admin or Inventory Manager)
  const user = getCurrentUser();
  if (user && (user.role === 'Admin' || user.role === 'Inventory Manager')) {
    fetchLowStockItems();
  } else {
    // For Staff and Technician roles, show a permissions message instead
    const lowStockTable = document.getElementById('lowStockTable');
    if (lowStockTable) {
      lowStockTable.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-3">
            <i class="fas fa-lock text-secondary me-2"></i>
            You need Admin or Inventory Manager permissions to view low stock items
          </td>
        </tr>
      `;
    }
  }
  }
  
  // Create category chart
  function createCategoryChart(itemsByCategory) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // Prepare data
    const labels = itemsByCategory.map(item => item._id);
    const counts = itemsByCategory.map(item => item.count);
    
    // Colors for different categories
    const backgroundColors = [
      'rgba(0, 132, 61, 0.7)',  // Primary color
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)'
    ];
    
    // Create chart
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: backgroundColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
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
  
  // Create status chart
  function createStatusChart(itemsByStatus) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    // Prepare data
    const labels = itemsByStatus.map(item => item._id);
    const counts = itemsByStatus.map(item => item.count);
    
    // Colors for different statuses
    const backgroundColors = {
      'Available': 'rgba(40, 167, 69, 0.7)',
      'Under Maintenance': 'rgba(255, 193, 7, 0.7)',
      'Out of Stock': 'rgba(220, 53, 69, 0.7)',
      'Rented': 'rgba(23, 162, 184, 0.7)'
    };
    
    // Create chart
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Number of Items',
          data: counts,
          backgroundColor: labels.map(label => backgroundColors[label] || 'rgba(0, 132, 61, 0.7)'),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.raw || 0;
                return `${label}: ${value}`;
              }
            }
          }
        },
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
  
  // Update recent transactions table
  function updateRecentTransactionsTable(transactions) {
    const tableBody = document.getElementById('recentTransactions');
    
    if (!transactions || transactions.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No recent transactions found</td></tr>';
      return;
    }
    
    let html = '';
    
    transactions.forEach(transaction => {
      const item = transaction.item ? transaction.item.name : 'N/A';
      const type = transaction.type || 'N/A';
      const quantity = transaction.quantity || 0;
      const user = transaction.performedBy ? transaction.performedBy.name : 'N/A';
      const time = formatDate(transaction.timestamp);
      
      html += `
        <tr>
          <td>${time}</td>
          <td>${item}</td>
          <td>
            <span class="badge ${getTransactionTypeBadge(type)}">${type}</span>
          </td>
          <td>${quantity}</td>
          <td>${user}</td>
        </tr>
      `;
    });
    
    tableBody.innerHTML = html;
  }
  
  // Fetch low stock items
  async function fetchLowStockItems() {
    try {
      const response = await fetchWithAuth(`${API_URL}/items/low-stock`);
      
      if (!response) return;
      
      if (response.ok) {
        const data = await response.json();
        updateLowStockTable(data);
      } else {
        const errorData = await response.json();
        console.error('Low stock error:', errorData);
        
        // Handle unauthorized error
        if (response.status === 403) {
          const lowStockTable = document.getElementById('lowStockTable');
          if (lowStockTable) {
            lowStockTable.innerHTML = `
              <tr>
                <td colspan="6" class="text-center py-3">
                  <i class="fas fa-lock text-secondary me-2"></i>
                  You need Admin or Inventory Manager permissions to view low stock items
                </td>
              </tr>
            `;
          }
        }
      }
    } catch (error) {
      console.error('Low stock error:', error);
    }
  }
  
  // Update low stock table
  function updateLowStockTable(items) {
    const tableBody = document.getElementById('lowStockTable');
    
    if (!items || items.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No low stock items found</td></tr>';
      return;
    }
    
    let html = '';
    
    items.forEach(item => {
      const locationRoom = item.location && item.location.room ? item.location.room.name : 'N/A';
      
      html += `
        <tr>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td><span class="badge bg-danger">${item.quantity} ${item.unit}</span></td>
          <td>${item.reorderLevel} ${item.unit}</td>
          <td>${locationRoom}</td>
          <td>
            <a href="inventory.html?id=${item._id}" class="btn btn-sm btn-outline-primary">
              <i class="fas fa-edit"></i>
            </a>
          </td>
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
  
  // Setup event listeners
  function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
    
    // Refresh dashboard
    document.getElementById('refreshDashboard').addEventListener('click', () => {
      initializeDashboard();
      showAlert('Dashboard data refreshed', 'success');
    });
    
    // Print dashboard
    document.getElementById('printDashboard').addEventListener('click', () => {
      window.print();
    });
    
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.body.classList.toggle('sidebar-toggled');
    });
  }