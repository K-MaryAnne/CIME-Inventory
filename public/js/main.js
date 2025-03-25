// public/js/main.js

// API URL (change this to your actual server URL in production)
const API_URL = 'http://localhost:5000/api';

// DOM elements
const loginForm = document.getElementById('loginForm');
const loginAlert = document.getElementById('loginAlert');
const togglePasswordBtn = document.getElementById('togglePassword');

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the login page
    const loginForm = document.getElementById('loginForm');
    const togglePasswordBtn = document.getElementById('togglePassword');
    
    if (loginForm) {
      // If user is already logged in, redirect to dashboard
      const token = localStorage.getItem('token');
      if (token) {
        window.location.href = 'pages/dashboard.html';
      }
      
      // Toggle password visibility if the button exists
      if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
          const passwordInput = document.getElementById('password');
          const eyeIcon = togglePasswordBtn.querySelector('i');
          
          if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeIcon.classList.remove('fa-eye');
            eyeIcon.classList.add('fa-eye-slash');
          } else {
            passwordInput.type = 'password';
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
          }
        });
      }
      
      // Update for the new login process
      // This is now handled by auth.js, so we don't need the old code
    }
  });
// Utility functions
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return 'N/A';
  
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(amount);
};

const showAlert = (message, type = 'success', container = 'alertContainer', autoClose = true) => {
  const alertContainer = document.getElementById(container);
  if (!alertContainer) return;
  
  // Create alert element
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  // Add to container
  alertContainer.innerHTML = '';
  alertContainer.appendChild(alertDiv);
  
  // Auto close after 5 seconds
  if (autoClose) {
    setTimeout(() => {
      alertDiv.classList.remove('show');
      setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
  }
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Available':
      return 'status-badge status-available';
    case 'Under Maintenance':
      return 'status-badge status-maintenance';
    case 'Out of Stock':
      return 'status-badge status-outofstock';
    case 'Rented':
      return 'status-badge status-rented';
    default:
      return 'status-badge';
  }
};

// Authentication helper functions
const getAuthToken = () => localStorage.getItem('token');

const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

const isAdmin = () => {
  const user = getCurrentUser();
  return user && user.role === 'Admin';
};

const isInventoryManager = () => {
  const user = getCurrentUser();
  return user && (user.role === 'Admin' || user.role === 'Inventory Manager');
};

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../index.html';
};

// API helper functions
const fetchWithAuth = async (url, options = {}) => {
    const token = getAuthToken();
    
    if (!token) {
      // Redirect to login if no token
      window.location.href = '../index.html';
      return null;
    }
    
    // Add authorization header
    const headers = {
      ...options.headers || {},
      'Authorization': `Bearer ${token}`
    };
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      // If unauthorized, redirect to login
      if (response.status === 401) {
        logout();
        return null;
      }
      
      return response;
    } catch (error) {
      console.error('API request failed:', error);
      // Return a custom error response instead of throwing
      return {
        ok: false,
        json: async () => ({ message: 'Network error: Failed to connect to server' })
      };
    }
  };

// Pagination helper
const createPagination = (currentPage, totalPages, onPageChange) => {
  const paginationEl = document.createElement('nav');
  paginationEl.setAttribute('aria-label', 'Page navigation');
  
  const ul = document.createElement('ul');
  ul.className = 'pagination justify-content-center';
  
  // Previous button
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
  
  const prevLink = document.createElement('a');
  prevLink.className = 'page-link';
  prevLink.href = '#';
  prevLink.innerHTML = '&laquo;';
  prevLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  });
  
  prevLi.appendChild(prevLink);
  ul.appendChild(prevLi);
  
  // Page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === currentPage ? 'active' : ''}`;
    
    const link = document.createElement('a');
    link.className = 'page-link';
    link.href = '#';
    link.textContent = i;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      onPageChange(i);
    });
    
    li.appendChild(link);
    ul.appendChild(li);
  }
  
  // Next button
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
  
  const nextLink = document.createElement('a');
  nextLink.className = 'page-link';
  nextLink.href = '#';
  nextLink.innerHTML = '&raquo;';
  nextLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  });
  
  nextLi.appendChild(nextLink);
  ul.appendChild(nextLi);
  
  paginationEl.appendChild(ul);
  return paginationEl;
};



// Add this function to main.js
function setupImprovedModalHandling() {
  // Fix for modal focus issues
  document.addEventListener('hidden.bs.modal', function(event) {
    // Get the modal that was just hidden
    const modal = event.target;
    
    // Find any elements that might still have focus inside
    const focusedElement = modal.querySelector(':focus');
    if (focusedElement) {
      // Force blur on any focused elements
      focusedElement.blur();
    }
    
    // Remove aria-hidden after a short delay
    setTimeout(() => {
      modal.removeAttribute('aria-hidden');
      
      // Reset body styles
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Clean up any stray backdrops
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
      });
    }, 50);
  });
  
  // Also fix modal opening to set proper focus management
  document.addEventListener('shown.bs.modal', function(event) {
    // Find the first focusable element and focus it
    const modal = event.target;
    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    
    if (focusable) {
      setTimeout(() => {
        focusable.focus();
      }, 100);
    }
  });
}



// Function to fix modal backdrop issues
function setupModalBackdropFix() {
    // Fix for modal backdrop not disappearing
    document.addEventListener('hidden.bs.modal', function (event) {
      // When any modal is hidden, remove all .modal-backdrop elements
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => {
        backdrop.remove();
      });
      
      // Also ensure body doesn't have the modal-open class
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }, false);
    
    // Additional fix for cases where modals are forcibly closed
    window.clearModalBackdrops = function() {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => {
        backdrop.remove();
      });
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }


// Fix modal focus issues
function fixModalFocusIssues() {
    // Fix for modals with aria-hidden issues
    document.addEventListener('hidden.bs.modal', function(event) {
      // When any modal is hidden
      setTimeout(() => {
        // Reset focus to the body to avoid ARIA errors
        document.body.focus();
        // Remove any stray aria-hidden attributes
        document.body.removeAttribute('aria-hidden');
        document.documentElement.removeAttribute('aria-hidden');
      }, 50);
    });
  }

  
  // Consolidated initialization when document is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Call all setup functions in one place
  setupModalBackdropFix();
  fixModalFocusIssues();
  setupImprovedModalHandling();
  
  console.log('All modal handling improvements initialized');
});