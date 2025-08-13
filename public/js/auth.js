// public/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      window.location.href = 'pages/dashboard.html';
      return;
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize password strength meter
    setupPasswordStrengthMeter();
    
    // Initially hide the confirm password feedback
    const confirmPasswordFeedback = document.getElementById('confirmPasswordFeedback');
    if (confirmPasswordFeedback) {
      confirmPasswordFeedback.style.display = 'none';
    }
  });
  
  // Toggle password visibility
  function togglePasswordVisibility(inputId, buttonId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    input.type = input.type === 'password' ? 'text' : 'password';
    
    // Change the eye icon if button is provided
    if (buttonId) {
      const button = document.getElementById(buttonId);
      if (button) {
        const icon = button.querySelector('i');
        if (icon) {
          if (input.type === 'text') {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
          } else {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
          }
        }
      }
    }
  }
  
  // Setup password strength meter
  function setupPasswordStrengthMeter() {
    const passwordInput = document.getElementById('registerPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (!passwordInput || !confirmPasswordInput) return;
    
    // Check password strength as user types
    passwordInput.addEventListener('input', () => {
      const password = passwordInput.value;
      checkPasswordStrength(password);
      
      // Check if passwords match if confirmation has value
      if (confirmPasswordInput.value) {
        const confirmPasswordFeedback = document.getElementById('confirmPasswordFeedback');
        if (password === confirmPasswordInput.value) {
          confirmPasswordInput.classList.remove('is-invalid');
          if (confirmPasswordFeedback) {
            confirmPasswordFeedback.style.display = 'none';
          }
        } else {
          confirmPasswordInput.classList.add('is-invalid');
          if (confirmPasswordFeedback) {
            confirmPasswordFeedback.style.display = 'block';
          }
        }
      }
    });
    
    // Check if passwords match as user types confirmation
    confirmPasswordInput.addEventListener('input', () => {
      const confirmPasswordFeedback = document.getElementById('confirmPasswordFeedback');
      if (passwordInput.value === confirmPasswordInput.value) {
        confirmPasswordInput.classList.remove('is-invalid');
        if (confirmPasswordFeedback) {
          confirmPasswordFeedback.style.display = 'none';
        }
      } else {
        confirmPasswordInput.classList.add('is-invalid');
        if (confirmPasswordFeedback) {
          confirmPasswordFeedback.style.display = 'block';
        }
      }
    });
  }
  
  // Check password strength and update UI
  function checkPasswordStrength(password) {
    const progressBar = document.getElementById('passwordStrength');
    const feedback = document.getElementById('passwordFeedback');
    
    if (!progressBar || !feedback) return false;
    
    // Default empty password
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
    // Form switch handlers
    const loginRadio = document.getElementById('loginRadio');
    const registerRadio = document.getElementById('registerRadio');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginRadio && registerRadio && loginForm && registerForm) {
      loginRadio.addEventListener('change', () => {
        loginForm.classList.remove('d-none');
        registerForm.classList.add('d-none');
      });
      
      registerRadio.addEventListener('change', () => {
        loginForm.classList.add('d-none');
        registerForm.classList.remove('d-none');
      });
    }
    
    // Login form submit
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', handleLogin);
    }
    
    // Register form submit
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
      registerBtn.addEventListener('click', handleRegister);
    }
    
    // Password visibility toggles
    const toggleLoginPasswordBtn = document.getElementById('toggleLoginPassword');
    if (toggleLoginPasswordBtn) {
      toggleLoginPasswordBtn.addEventListener('click', () => {
        togglePasswordVisibility('loginPassword', 'toggleLoginPassword');
      });
    }
    
    const toggleRegisterPasswordBtn = document.getElementById('toggleRegisterPassword');
    if (toggleRegisterPasswordBtn) {
      toggleRegisterPasswordBtn.addEventListener('click', () => {
        togglePasswordVisibility('registerPassword', 'toggleRegisterPassword');
        togglePasswordVisibility('confirmPassword');
      });
    }
    
    // Allow enter key to submit forms
    const loginPassword = document.getElementById('loginPassword');
    if (loginPassword) {
      loginPassword.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          handleLogin();
        }
      });
    }
    
    const confirmPassword = document.getElementById('confirmPassword');
    if (confirmPassword) {
      confirmPassword.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          handleRegister();
        }
      });
    }
  }
  
  // Handle login form submission
  async function handleLogin() {
    try {
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      if (!email || !password) {
        showAlertMessage('Please enter email and password', 'danger');
        return;
      }
      
      // Show loading state
      const loginBtn = document.getElementById('loginBtn');
      const originalBtnText = loginBtn.innerHTML;
      loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Logging in...';
      loginBtn.disabled = true;
      
      // Send login request
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Error parsing response:', e);
        data = { message: 'Invalid response from server' };
      }
      
      // Reset button state
      loginBtn.innerHTML = originalBtnText;
      loginBtn.disabled = false;
      
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
        showAlertMessage(data.message || 'Invalid email or password', 'danger');
      }
    } catch (error) {
      console.error('Login error:', error);
      showAlertMessage('Failed to connect to server. Please try again.', 'danger');
      
      // Reset button state
      const loginBtn = document.getElementById('loginBtn');
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i> Login';
      loginBtn.disabled = false;
    }
  }
  
  // Handle registration form submission
 
async function handleRegister() {
    try {
      console.log('Registration handler called');
      
      const name = document.getElementById('registerName').value;
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const termsChecked = document.getElementById('termsCheck').checked;
      
      console.log('Registration form data:', { 
        name, 
        email, 
        passwordLength: password?.length || 0,
        confirmMatch: password === confirmPassword,
        termsChecked 
      });
      
      // Validate inputs
      if (!name || !email || !password || !confirmPassword) {
        showAlertMessage('Please fill in all required fields', 'danger');
        return;
      }
      
      if (!termsChecked) {
        showAlertMessage('Please agree to the terms and conditions', 'danger');
        return;
      }
      
      if (password !== confirmPassword) {
        document.getElementById('confirmPassword').classList.add('is-invalid');
        document.getElementById('confirmPasswordFeedback').style.display = 'block';
        return;
      }
      
      // Check password strength
      if (!checkPasswordStrength(password)) {
        const proceed = confirm('The password is weak. Continue anyway?');
        if (!proceed) return;
      }
      
      // Show loading state
      const registerBtn = document.getElementById('registerBtn');
      const originalBtnText = registerBtn.innerHTML;
      registerBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Registering...';
      registerBtn.disabled = true;
      
      console.log('Sending registration request to:', `${API_URL}/users/register`);
      
      // Send registration request 
      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, role: 'Staff' })
      });
      
      console.log('Registration response status:', response?.status);
      
      // Get response data
      let data;
      try {
        data = await response.json();
        console.log('Registration response data:', data);
      } catch (e) {
        console.error('Error parsing response:', e);
        data = { message: 'Invalid response from server' };
      }
      
      // Reset button state
      registerBtn.innerHTML = originalBtnText;
      registerBtn.disabled = false;
      
      if (response.ok) {
        // Save token and user data to localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
          id: data._id,
          name: data.name,
          email: data.email,
          role: data.role
        }));
        
        // Show success message and redirect
        showAlertMessage('Registration successful! Redirecting to dashboard...', 'success');
        setTimeout(() => {
          window.location.href = 'pages/dashboard.html';
        }, 2000);
      } else {
        // Show error message
        showAlertMessage(data?.message || 'Registration failed', 'danger');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showAlertMessage('Failed to connect to server. Please try again.', 'danger');
      
      // Reset button state
      const registerBtn = document.getElementById('registerBtn');
      registerBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i> Register';
      registerBtn.disabled = false;
    }
  }
  
  // Show alert message 
  function showAlertMessage(message, type = 'success') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;
    
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);
    
    
    setTimeout(() => {
      alertDiv.classList.remove('show');
      setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
  }