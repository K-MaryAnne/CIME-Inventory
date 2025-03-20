// public/js/users.js

// Global variables
let users = [];
let filteredUsers = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log('User management page loaded');
  
  // Check if user is logged in
  const token = getAuthToken();
  const user = getCurrentUser();
  
  if (!token || !user) {
    console.log('No token or user found, redirecting to login');
    window.location.href = '../index.html';
    return;
  }
  
  // Check if user is admin, if not redirect
  if (!isAdmin()) {
    console.log('User is not admin, redirecting');
    showAlert('You do not have permission to access this page.', 'danger');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 2000);
    return;
  }
  
  console.log('Admin access confirmed');
  
  // Store current user
  currentUser = user;
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup password strength meter
  setupPasswordStrengthMeter();
  
  // Update user info in navbar
  document.getElementById('currentUserName').textContent = user.name;
  document.getElementById('profileName').value = user.name;
  document.getElementById('profileEmail').value = user.email;
  document.getElementById('profileRole').value = user.role;
  
  // Load users
  loadUsers();
});

// Load users from API
async function loadUsers() {
  try {
    console.log('Loading users...');
    
    // Show loading indicator
    document.getElementById('usersTable').innerHTML = '<tr><td colspan="5" class="text-center">Loading users...</td></tr>';
    
    console.log('API URL:', `${API_URL}/users`);
    
    // Fetch users
    const response = await fetchWithAuth(`${API_URL}/users`);
    console.log('API response status:', response?.status);
    
    if (!response) {
      console.error('No response received');
      return;
    }
    
    if (response.ok) {
      users = await response.json();
      console.log('Users loaded:', users.length, users);
      filteredUsers = [...users];
      
      // Check if search filter is applied
      const searchInput = document.getElementById('searchInput');
      const roleFilter = document.getElementById('roleFilter');
      
      if (searchInput.value.trim() || roleFilter.value) {
        filterUsers(searchInput.value.trim(), roleFilter.value);
      } else {
        // Display users
        renderUsers();
      }
    } else {
      let errorMessage = 'Failed to load users';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.error('Error response:', errorData);
      } catch (e) {
        console.error('Could not parse error response', e);
      }
      
      showAlert(errorMessage, 'danger');
      
      // Show error in table
      document.getElementById('usersTable').innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4">
            <i class="fas fa-exclamation-circle text-danger me-2"></i>
            Failed to load users. Please try again.
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('User loading error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    
    // Show error in table
    document.getElementById('usersTable').innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4">
          <i class="fas fa-exclamation-circle text-danger me-2"></i>
          Failed to load users. Please try again.
        </td>
      </tr>
    `;
  }
}

// Render users table
function renderUsers() {
  console.log('Rendering users table with', filteredUsers.length, 'users');
  const tableBody = document.getElementById('usersTable');
  
  if (!tableBody) {
    console.error('Could not find usersTable element');
    return;
  }
  
  if (filteredUsers.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4">
          <i class="fas fa-info-circle text-info me-2"></i>
          No users found.
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  
  filteredUsers.forEach(user => {
    // Format date
    const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
    
    // Get role badge class
    const roleBadgeClass = getRoleBadgeClass(user.role);
    
    // Check if this is the current user
    const isCurrentUser = currentUser._id === user._id;
    
    html += `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <div class="avatar bg-light text-primary rounded-circle d-inline-flex align-items-center justify-content-center me-2" style="width: 40px; height: 40px;">
              <i class="fas fa-user"></i>
            </div>
            <div>
              <h6 class="mb-0">${user.name}</h6>
              ${isCurrentUser ? '<span class="badge bg-secondary">You</span>' : ''}
            </div>
          </div>
        </td>
        <td>${user.email}</td>
        <td><span class="badge ${roleBadgeClass}">${user.role}</span></td>
        <td>${createdDate}</td>
        <td>
          <div class="btn-group">
            <button type="button" class="btn btn-sm btn-outline-secondary edit-btn" data-id="${user._id}">
              <i class="fas fa-edit"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger delete-btn ${isCurrentUser ? 'disabled' : ''}" data-id="${user._id}" ${isCurrentUser ? 'disabled' : ''}>
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
  
  // Add event listeners to action buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      console.log('Edit button clicked for user:', btn.dataset.id);
      editUser(btn.dataset.id);
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      console.log('Delete button clicked for user:', btn.dataset.id);
      openDeleteModal(btn.dataset.id);
    });
  });
}

// Get role badge class
function getRoleBadgeClass(role) {
  switch (role) {
    case 'Admin':
      return 'bg-danger';
    case 'Inventory Manager':
      return 'bg-success';
    case 'Technician':
      return 'bg-info';
    case 'Staff':
      return 'bg-secondary';
    default:
      return 'bg-secondary';
  }
}

// Filter users by search term and role
function filterUsers(searchTerm, role) {
  console.log('Filtering users by:', searchTerm, role);
  if (!searchTerm && !role) {
    filteredUsers = [...users];
  } else {
    filteredUsers = users.filter(user => {
      // Check role filter
      const roleMatch = !role || user.role === role;
      
      // Check search term
      const searchMatch = !searchTerm || 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      return roleMatch && searchMatch;
    });
  }
  
  renderUsers();
}

// Open user modal for editing
function editUser(userId) {
  console.log('Opening user modal for editing, userId:', userId);
  const modal = document.getElementById('userModal');
  
  if (!modal) {
    console.error('User modal not found in the DOM');
    return;
  }
  
  const modalTitle = document.getElementById('userModalTitle');
  const form = document.getElementById('userForm');
  const passwordGroup = document.getElementById('passwordGroup');
  const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
  
  // Reset form
  form.reset();
  
  // Reset password strength indicator
  document.getElementById('passwordStrength').style.width = '0%';
  document.getElementById('passwordStrength').style.backgroundColor = '#e9ecef';
  document.getElementById('passwordFeedback').textContent = 'Password must be at least 8 characters long.';
  
  // Find user in the array
  const user = users.find(u => u._id === userId);
  
  if (user) {

     // debugging
  console.log('Populating form with user data:', user);
    
    // Update modal title
    modalTitle.textContent = 'Edit User';
    
    // Populate form fields
    document.getElementById('userId').value = user._id;

    // document.getElementById('currentUserName').value = user.name;

    const nameInput = document.querySelector('#userModal input[id="userName"]');
    if (nameInput) {
        console.log('Setting name input value to:', user.name);
        nameInput.value = user.name;
    } else {
        console.error('Could not find name input element');
    }

    document.getElementById('userEmail').value = user.email;
    document.getElementById('userRole').value = user.role;
    
    // Make password optional for edit
    passwordGroup.classList.add('optional-field');
    confirmPasswordGroup.classList.add('optional-field');
    
    const passwordLabel = passwordGroup.querySelector('label');
    passwordLabel.textContent = 'Password (leave blank to keep unchanged)';
    
    document.getElementById('userPassword').removeAttribute('required');
    document.getElementById('confirmPassword').removeAttribute('required');
  } else {
    // New user
    modalTitle.textContent = 'Add User';
    document.getElementById('userId').value = '';
    
    // Make password required for new users
    passwordGroup.classList.remove('optional-field');
    confirmPasswordGroup.classList.remove('optional-field');
    
    const passwordLabel = passwordGroup.querySelector('label');
    passwordLabel.textContent = 'Password*';
    
    document.getElementById('userPassword').setAttribute('required', 'required');
    document.getElementById('confirmPassword').setAttribute('required', 'required');
  }
  
  // Open the modal
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}

// Open delete confirmation modal
function openDeleteModal(userId) {
  console.log('Opening delete modal for user:', userId);
  document.getElementById('deleteUserId').value = userId;
  const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
  modal.show();
}

// Save user
async function saveUser() {
    try {
        console.log('Saving user...');
        
        // Direct access to the form and its elements
        const form = document.getElementById('userForm');
        
        // Get all form inputs
        console.log('All form inputs:', form.elements);
        
        // Log the form data directly
        const formData = new FormData(form);
        const formValues = {};
        for (const [key, value] of formData.entries()) {
          formValues[key] = value;
        }
        console.log('Form values from FormData:', formValues);
        
        // Direct access attempt for debugging
        const modalNameInput = document.querySelector('#userModal input[id="userName"]');
        console.log('Direct query selector for name input:', modalNameInput);
        console.log('Value of name input if found:', modalNameInput?.value);
        
        // Get form data with alternative approaches
        const userId = document.getElementById('userId').value;
        let name = '';
        
        // Try multiple approaches to get the name
        const nameInputByForm = form.elements['userName'];
        if (nameInputByForm) {
          name = nameInputByForm.value;
          console.log('Name from form.elements:', name);
        } else if (modalNameInput) {
          name = modalNameInput.value;
          console.log('Name from querySelector:', name); 
        } else {
        //   name = document.getElementById('userName').value;
        

        const nameInput = document.querySelector('#userModal input[id="userName"]');
        const name = nameInput ? nameInput.value : '';

          // console.log('Name from getElementById:', name);
        
        
          if (nameInput) {
            name = nameInput.value; // Assign without re-declaring
          }
          console.log('Name from getElementById:', name);

        
        }
        
        const email = document.getElementById('userEmail').value;
        const role = document.getElementById('userRole').value;
        const password = document.getElementById('userPassword').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        
        console.log('Final form data:', { userId, name, email, role, hasPassword: !!password });
        
        // Validate required fields
        if (!name || !email || !role) {
          showAlert('Please fill in all required fields', 'danger');
          return;
        }
        
        // If creating new user or changing password
        if (!userId || password) {
          // Validate password
          if (!password) {
            showAlert('Password is required for new users', 'danger');
            return;
          }
          
          if (password.length < 8) {
            showAlert('Password must be at least 8 characters long', 'danger');
            return;
          }
          
          if (password !== confirmPassword) {

            console.log('Password:', password);
            console.log('Confirm Password:', confirmPassword);
            console.log('Are passwords equal?', password === confirmPassword);


            showAlert('Passwords do not match', 'danger');
            document.getElementById('confirmPassword').classList.add('is-invalid');
            return;
          }
          
          // Check password strength
          if (!checkPasswordStrength(password)) {
            const proceed = confirm('The password is weak. Continue anyway?');
            if (!proceed) return;
          }
        }
        
        // Prepare user data
        const userData = {
          name,
          email,
          role
        };
        
        if (password) {
          userData.password = password;
        }
        
        // Show loading state
        const saveBtn = document.getElementById('saveUserBtn');
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';
        saveBtn.disabled = true;
        
        let response;
        
        if (userId) {
          // Update existing user
          console.log('Updating user:', userId);
          console.log('Update data being sent:', userData);
          response = await fetchWithAuth(`${API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
          });
        } else {
          // Create new user
          console.log('Creating new user');
          console.log('User data being sent:', userData);
          response = await fetchWithAuth(`${API_URL}/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
          });
        }
        
        console.log('API response status:', response?.status);
        
        // Reset button state
        saveBtn.innerHTML = 'Save User';
        saveBtn.disabled = false;
        
        if (!response) {
          console.error('No response received');
          return;
        }
        
        if (response.ok) {
          const responseData = await response.json();
          console.log('User saved successfully:', responseData);
          
          // Close modal
          const modalInstance = bootstrap.Modal.getInstance(document.getElementById('userModal'));
          modalInstance.hide();
          
          // Show success message
          showAlert(`User ${userId ? 'updated' : 'created'} successfully`, 'success');
      
      // Reload users
      loadUsers();
    } else {
      let errorMessage = `Failed to ${userId ? 'update' : 'create'} user`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.error('Error response:', errorData);
      } catch (e) {
        console.error('Could not parse error response', e);
      }
      
      showAlert(errorMessage, 'danger');
    }
  } catch (error) {
    console.error('Save user error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    
    // Reset button state
    const saveBtn = document.getElementById('saveUserBtn');
    saveBtn.innerHTML = 'Save User';
    saveBtn.disabled = false;
  }
}

// Delete user
async function deleteUser(userId) {
  try {
    console.log('Deleting user:', userId);
    
    // Show loading state
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Deleting...';
    deleteBtn.disabled = true;
    
    // Send delete request
    const response = await fetchWithAuth(`${API_URL}/users/${userId}`, {
      method: 'DELETE'
    });
    
    console.log('API response status:', response?.status);
    
    // Reset button state
    deleteBtn.innerHTML = 'Delete User';
    deleteBtn.disabled = false;
    
    if (!response) {
      console.error('No response received');
      return;
    }
    
    if (response.ok) {
      // Close modal
      const modalInstance = bootstrap.Modal.getInstance(document.getElementById('deleteUserModal'));
      modalInstance.hide();
      
      // Show success message
      showAlert('User deleted successfully', 'success');
      
      // Reload users
      loadUsers();
    } else {
      let errorMessage = 'Failed to delete user';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.error('Error response:', errorData);
      } catch (e) {
        console.error('Could not parse error response', e);
      }
      
      showAlert(errorMessage, 'danger');
    }
  } catch (error) {
    console.error('Delete user error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    
    // Reset button state
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    deleteBtn.innerHTML = 'Delete User';
    deleteBtn.disabled = false;
  }
}

// Setup password strength meter
function setupPasswordStrengthMeter() {
  const passwordInput = document.getElementById('userPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  
  if (!passwordInput || !confirmPasswordInput) {
    console.error('Password input elements not found');
    return;
  }
  
  // Check password strength as user types
  passwordInput.addEventListener('input', () => {
    checkPasswordStrength(passwordInput.value);
    
    // Check if passwords match
    if (confirmPasswordInput.value) {
      if (passwordInput.value === confirmPasswordInput.value) {
        confirmPasswordInput.classList.remove('is-invalid');
      } else {
        confirmPasswordInput.classList.add('is-invalid');
      }
    }
  });
  
  // Check if passwords match as user types in confirmation field
  confirmPasswordInput.addEventListener('input', () => {
    if (passwordInput.value === confirmPasswordInput.value) {
      confirmPasswordInput.classList.remove('is-invalid');
    } else {
      confirmPasswordInput.classList.add('is-invalid');
    }
  });
  
  // Password visibility toggle
  const togglePasswordBtn = document.getElementById('toggleUserPassword');
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
      confirmPasswordInput.type = type;
      
      // Change the eye icon
      const icon = togglePasswordBtn.querySelector('i');
      if (type === 'text') {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  }
}

// Check password strength
function checkPasswordStrength(password) {
  const progressBar = document.getElementById('passwordStrength');
  const feedback = document.getElementById('passwordFeedback');
  
  if (!progressBar || !feedback) {
    console.error('Password strength elements not found');
    return false;
  }
  
  // Default - empty password
  let strength = 0;
  let message = 'Password must be at least 8 characters long.';
  let color = '#e9ecef';
  
  if (password.length > 0) {
    strength = 0;
    
    // Length check
    if (password.length < 8) {
      message = 'Password is too short (minimum 8 characters)';
      color = '#dc3545'; // danger
    } else {
      strength += 25;
      
      // Check for lowercase letters
      if (password.match(/[a-z]/)) {
        strength += 25;
      }
      
      // Check for uppercase letters
      if (password.match(/[A-Z]/)) {
        strength += 25;
      }
      
      // Check for numbers or special characters
      if (password.match(/[0-9]/) || password.match(/[^a-zA-Z0-9]/)) {
        strength += 25;
      }
      
      // Set color based on strength
      if (strength <= 25) {
        message = 'Password is weak';
        color = '#dc3545'; // danger
      } else if (strength <= 50) {
        message = 'Password is moderate';
        color = '#ffc107'; // warning
      } else if (strength <= 75) {
        message = 'Password is good';
        color = '#0d6efd'; // primary
      } else {
        message = 'Password is strong';
        color = '#198754'; // success
      }
    }
  }
  
  // Update UI
  progressBar.style.width = `${strength}%`;
  progressBar.style.backgroundColor = color;
  feedback.textContent = message;
  
  return strength >= 50; // Return true if password is at least moderate strength
}

// Setup event listeners
function setupEventListeners() {
  console.log('Setting up event listeners');
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
  
  // Sidebar toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-toggled');
    });
  }
  
  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.trim();
      const role = document.getElementById('roleFilter').value;
      filterUsers(searchTerm, role);
    });
  }
  
  // Role filter
  const roleFilter = document.getElementById('roleFilter');
  if (roleFilter) {
    roleFilter.addEventListener('change', () => {
      const searchTerm = document.getElementById('searchInput').value.trim();
      const role = roleFilter.value;
      filterUsers(searchTerm, role);
    });
  }
  
  // Add user button
  const addUserBtn = document.getElementById('addUserBtn');
  if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
      console.log('Add user button clicked');
      editUser(); // With no ID, it will set up for a new user
    });
  }
  
  // Save user button
  const saveUserBtn = document.getElementById('saveUserBtn');
  if (saveUserBtn) {
    saveUserBtn.addEventListener('click', saveUser);
  }
  
  // Confirm delete button
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      const userId = document.getElementById('deleteUserId').value;
      deleteUser(userId);
    });
  }
}