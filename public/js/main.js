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
  if (loginForm) {
    // If user is already logged in, redirect to dashboard
    const token = localStorage.getItem('token');
    if (token) {
      window.location.href = 'pages/dashboard.html';
    }
    
    // Toggle password visibility
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
    
    // Handle login form submission
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      try {
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Logging in...';
        submitBtn.disabled = true;
        
        // Send login request
        const response = await fetch(`${API_URL}/users/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Save token and user data to localStorage
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify({
            id: data._id,
            name: data.name,
            email: data.email,
            role: data.role
          }));
          
          // Redirect to dashboard
          window.location.href = 'pages/dashboard.html';
        } else {
          // Show error message
          loginAlert.textContent = data.message || 'Invalid email or password';
          loginAlert.classList.remove('d-none');
          loginAlert.classList.add('fade-in');
          
          // Reset form button
          submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i> Login';
          submitBtn.disabled = false;
        }
      } catch (error) {
        console.error('Login error:', error);
        
        // Show error message
        loginAlert.textContent = 'Failed to connect to server. Please try again.';
        loginAlert.classList.remove('d-none');
        loginAlert.classList.add('fade-in');
        
        // Reset form button
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i> Login';
        submitBtn.disabled = false;
      }
    });
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
    throw error;
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