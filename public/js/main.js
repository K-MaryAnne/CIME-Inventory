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



/**
 * Enhanced modal closing function to solve ARIA and focus issues
 * @param {HTMLElement} modalElement - The modal DOM element
 */
function enhancedModalClose(modalElement) {
  if (!modalElement) return;
  
  try {
    // 1. Find and blur any focused elements BEFORE closing the modal
    const focusedElement = modalElement.querySelector(':focus');
    if (focusedElement) {
      focusedElement.blur();
      // Move focus to the body
      document.body.focus();
    }
    
    // 2. Get the Bootstrap modal instance
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (!modalInstance) return;
    
    // 3. Remove event listeners to prevent Bootstrap from adding aria-hidden back
    const modalCloseHandler = function(event) {
      // Prevent default behavior that adds aria-hidden
      event.preventDefault();
      
      // Remove aria-hidden attribute
      modalElement.removeAttribute('aria-hidden');
      
      // Clean up modal-related classes and styles
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Make sure display style is set to none
      modalElement.style.display = 'none';
      
      // Remove any leftover backdrops
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
      });
    };
    
    // One-time event listener that will clean up after modal is hidden
    modalElement.addEventListener('hidden.bs.modal', modalCloseHandler, { once: true });
    
    // 4. Close the modal
    modalInstance.hide();
    
    // 5. For extra safety, manually clean up after animation finishes
    setTimeout(() => {
      // Double-check that aria-hidden is removed
      modalElement.removeAttribute('aria-hidden');
      
      // Verify backdrop is removed
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
      });
      
      // Ensure body styles are reset
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }, 350); // Bootstrap modal transition is usually 300ms
    
  } catch (error) {
    console.error('Error in enhancedModalClose:', error);
    
    // Fallback cleanup
    modalElement.removeAttribute('aria-hidden');
    modalElement.style.display = 'none';
    document.body.classList.remove('modal-open');
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.remove();
    });
  }
}



/**
 * Fix Bootstrap modal ARIA issues
 */
function patchBootstrapModals() {
  // Only run if Bootstrap is available
  if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
    console.warn('Bootstrap not loaded, cannot patch modals');
    return;
  }

  // Create a MutationObserver to detect changes to aria-hidden
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'aria-hidden' && 
          mutation.target.classList.contains('modal') &&
          mutation.target.getAttribute('aria-hidden') === 'true') {
        
        // Check if any element inside has focus
        const focusedElement = mutation.target.querySelector(':focus');
        if (focusedElement) {
          // Clear focus to prevent ARIA conflicts
          focusedElement.blur();
          document.body.focus();
          
          // Remove the problematic aria-hidden attribute
          setTimeout(() => {
            mutation.target.removeAttribute('aria-hidden');
          }, 0);
        }
      }
    });
  });

  // Start observing all modals for aria-hidden changes
  document.querySelectorAll('.modal').forEach(modal => {
    observer.observe(modal, { attributes: true });
  });

  // Add observer to new modals that might be dynamically added
  const bodyObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach(node => {
          if (node.classList && node.classList.contains('modal')) {
            observer.observe(node, { attributes: true });
          }
        });
      }
    });
  });

  // Observe the body for new modals
  bodyObserver.observe(document.body, { 
    childList: true, 
    subtree: true 
  });

  // Override the hide method of Bootstrap modals
  const originalHide = bootstrap.Modal.prototype.hide;
  bootstrap.Modal.prototype.hide = function() {
    // Find the modal element
    const modalElement = this._element;
    
    // Remove focus from elements inside the modal
    const focusedElement = modalElement.querySelector(':focus');
    if (focusedElement) {
      focusedElement.blur();
      document.body.focus();
    }
    
    // Remove aria-hidden before hiding
    modalElement.removeAttribute('aria-hidden');
    
    // Call the original method
    originalHide.call(this);
    
    // Ensure cleanup happens after animation
    setTimeout(() => {
      modalElement.removeAttribute('aria-hidden');
      modalElement.style.display = 'none';
    }, 350);
  };
}


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





  
  // Consolidated initialization when document is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Call all setup functions in one place
  // setupModalBackdropFix();
  // fixModalFocusIssues();
  setupImprovedModalHandling();
  patchBootstrapModals();
  
  console.log('All enhanced modal handling improvements initialized');
});