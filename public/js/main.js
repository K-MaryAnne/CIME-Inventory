// public/js/main.js


const API_URL = 'http://localhost:5000/api';


const loginForm = document.getElementById('loginForm');
const loginAlert = document.getElementById('loginAlert');
const togglePasswordBtn = document.getElementById('togglePassword');

document.addEventListener('DOMContentLoaded', () => {
  
    const loginForm = document.getElementById('loginForm');
    const togglePasswordBtn = document.getElementById('togglePassword');
    
    if (loginForm) {
     
      const token = localStorage.getItem('token');
      if (token) {
        window.location.href = 'pages/dashboard.html';
      }
      
     
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
      
     
    }
  });

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
  
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  
  alertContainer.innerHTML = '';
  alertContainer.appendChild(alertDiv);
  
 
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


const fetchWithAuth = async (url, options = {}) => {
    const token = getAuthToken();
    
    if (!token) {
    
      window.location.href = '../index.html';
      return null;
    }
    
    
    const headers = {
      ...options.headers || {},
      'Authorization': `Bearer ${token}`
    };
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
     
      if (response.status === 401) {
        logout();
        return null;
      }
      
      return response;
    } catch (error) {
      console.error('API request failed:', error);
     
      return {
        ok: false,
        json: async () => ({ message: 'Network error: Failed to connect to server' })
      };
    }
  };


const createPagination = (currentPage, totalPages, onPageChange) => {
  const paginationEl = document.createElement('nav');
  paginationEl.setAttribute('aria-label', 'Page navigation');
  
  const ul = document.createElement('ul');
  ul.className = 'pagination justify-content-center';
  
 
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
 * @param {HTMLElement} modalElement 
 */
function enhancedModalClose(modalElement) {
  if (!modalElement) return;
  
  try {
   
    const focusedElement = modalElement.querySelector(':focus');
    if (focusedElement) {
      focusedElement.blur();
     
      document.body.focus();
    }
    
  
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (!modalInstance) return;
    
  
    const modalCloseHandler = function(event) {
    
      event.preventDefault();
      
     
      modalElement.removeAttribute('aria-hidden');
      
     
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
     
      modalElement.style.display = 'none';
      
     
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
      });
    };
    
   
    modalElement.addEventListener('hidden.bs.modal', modalCloseHandler, { once: true });
    
    
    modalInstance.hide();
    
   
    setTimeout(() => {
    
      modalElement.removeAttribute('aria-hidden');
      
   
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
      });
      
      
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }, 350); 
    
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




function patchBootstrapModals() {

  if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
    console.warn('Bootstrap not loaded, cannot patch modals');
    return;
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'aria-hidden' && 
          mutation.target.classList.contains('modal') &&
          mutation.target.getAttribute('aria-hidden') === 'true') {
        
     
        const focusedElement = mutation.target.querySelector(':focus');
        if (focusedElement) {
       
          focusedElement.blur();
          document.body.focus();
        
          setTimeout(() => {
            mutation.target.removeAttribute('aria-hidden');
          }, 0);
        }
      }
    });
  });


  document.querySelectorAll('.modal').forEach(modal => {
    observer.observe(modal, { attributes: true });
  });


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


  bodyObserver.observe(document.body, { 
    childList: true, 
    subtree: true 
  });


  const originalHide = bootstrap.Modal.prototype.hide;
  bootstrap.Modal.prototype.hide = function() {
 
    const modalElement = this._element;
    
  
    const focusedElement = modalElement.querySelector(':focus');
    if (focusedElement) {
      focusedElement.blur();
      document.body.focus();
    }
    
  
    modalElement.removeAttribute('aria-hidden');
    
  
    originalHide.call(this);
    
   
    setTimeout(() => {
      modalElement.removeAttribute('aria-hidden');
      modalElement.style.display = 'none';
    }, 350);
  };
}




function generateScannerFriendlyBarcode() {
 
  const prefix = '1000'; 
  const timestamp = Date.now().toString().substring(7); 
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  

  return `${prefix}${timestamp}${random}`;
}



function renderBarcode(canvas, barcodeValue) {
  JsBarcode(canvas, barcodeValue, {
    format: "CODE128",  
    lineColor: "#000",
    width: 2,
    height: 60,         
    displayValue: true, 
    fontSize: 14,
    margin: 10,         
    textMargin: 6       
  });
}




function setupImprovedModalHandling() {

  document.addEventListener('hidden.bs.modal', function(event) {
 
    const modal = event.target;
 
    const focusedElement = modal.querySelector(':focus');
    if (focusedElement) {
    
      focusedElement.blur();
    }
    
  
    setTimeout(() => {
      modal.removeAttribute('aria-hidden');
      
      // Reset body styles
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
   
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
      });
    }, 50);
  });
  
  document.addEventListener('shown.bs.modal', function(event) {
   
    const modal = event.target;
    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    
    if (focusable) {
      setTimeout(() => {
        focusable.focus();
      }, 100);
    }
  });
}




document.addEventListener('DOMContentLoaded', function() {

  setupImprovedModalHandling();
  patchBootstrapModals();
  
  console.log('All enhanced modal handling improvements initialized');
});