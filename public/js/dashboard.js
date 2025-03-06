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
    document.getElementById('inventoryValue').textContent = formatCurrency(data.inventoryValue || 0);
    
    // Create charts
    createCategoryChart(data.itemsByCategory || []);
    createStatusChart(data.itemsByStatus || []);
    
    // Update tables
    updateRecentTransactionsTable(data.recentTransactions || []);
    
    // Fetch low stock items
    fetchLowStockItems();
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