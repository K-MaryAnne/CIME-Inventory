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

// Call this function when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
  setupImprovedModalHandling();
});