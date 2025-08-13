// public/js/locations.js

// Global variables
let locationHierarchy = [];
let allLocations = {
  rooms: [],
  racks: [],
  shelves: []
};
let expandedState = false;

document.addEventListener('DOMContentLoaded', () => {

  const token = getAuthToken();
  const user = getCurrentUser();
  
  if (!token || !user) {
    window.location.href = '../index.html';
    return;
  }
  

  setupEventListeners();
  

  if (isInventoryManager()) {
    document.querySelectorAll('.manager-only').forEach(el => el.classList.remove('d-none'));
  }
  
  if (isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
  }
  
  
  document.getElementById('userName').textContent = user.name;
  document.getElementById('profileName').value = user.name;
  document.getElementById('profileEmail').value = user.email;
  document.getElementById('profileRole').value = user.role;
  
 
  loadLocations();
  

  loadLocationStatistics();
});


async function loadLocations() {
  try {
    
    const response = await fetchWithAuth(`${API_URL}/locations/hierarchy`);
    
    if (!response) return;
    
    if (response.ok) {
      locationHierarchy = await response.json();
      
    
      processLocations();
      
    
      updateLocationCounters();
      
   
      renderLocationTree();
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to load locations', 'danger');
      
      // Show error in location tree
      document.getElementById('locationTree').innerHTML = `
        <div class="text-center py-4">
          <i class="fas fa-exclamation-circle fa-3x mb-3 text-danger"></i>
          <p class="mb-0">Failed to load locations. Please try again.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Location loading error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    

    document.getElementById('locationTree').innerHTML = `
      <div class="text-center py-4">
        <i class="fas fa-exclamation-circle fa-3x mb-3 text-danger"></i>
        <p class="mb-0">Failed to load locations. Please try again.</p>
      </div>
    `;
  }
}


function processLocations() {
  // Reset
  allLocations = {
    rooms: [],
    racks: [],
    shelves: []
  };
  
  // Add rooms
  locationHierarchy.forEach(room => {
    allLocations.rooms.push({
      id: room._id,
      name: room.name,
      type: 'Room',
      parent: null,
      description: room.description || ''
    });
    
    // Add racks
    if (room.racks && room.racks.length > 0) {
      room.racks.forEach(rack => {
        allLocations.racks.push({
          id: rack._id,
          name: rack.name,
          type: 'Rack',
          parent: room._id,
          parentName: room.name,
          description: rack.description || ''
        });
        
        // Add shelves
        if (rack.shelves && rack.shelves.length > 0) {
          rack.shelves.forEach(shelf => {
            allLocations.shelves.push({
              id: shelf._id,
              name: shelf.name,
              type: 'Shelf',
              parent: rack._id,
              parentName: rack.name,
              grandParent: room._id,
              grandParentName: room.name,
              description: shelf.description || ''
            });
          });
        }
      });
    }
  });
}

// Update location counters
function updateLocationCounters() {
  document.getElementById('roomsCount').textContent = allLocations.rooms.length;
  document.getElementById('racksCount').textContent = allLocations.racks.length;
  document.getElementById('shelvesCount').textContent = allLocations.shelves.length;
}

// Render location tree
function renderLocationTree() {
  const locationTree = document.getElementById('locationTree');
  
  if (locationHierarchy.length === 0) {
    locationTree.innerHTML = `
      <div class="text-center py-4">
        <i class="fas fa-info-circle fa-3x mb-3 text-info"></i>
        <p class="mb-0">No locations found. Start by adding rooms to your inventory system.</p>
      </div>
    `;
    return;
  }
  
  let html = '<ul class="list-group">';
  
  // Render rooms
  locationHierarchy.forEach(room => {
    html += `
      <li class="list-group-item">
        <div class="d-flex justify-content-between align-items-center location-item">
          <div>
            <span class="toggle-icon me-2 ${room.racks && room.racks.length > 0 ? '' : 'd-none'}">
              <i class="fas fa-caret-right"></i>
            </span>
            <i class="fas fa-door-open text-primary me-2"></i>
            <span class="fw-bold">${room.name}</span>
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-sm btn-outline-primary view-btn" data-id="${room._id}" data-type="Room">
              <i class="fas fa-eye"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary edit-btn manager-only ${!isInventoryManager() ? 'd-none' : ''}" data-id="${room._id}" data-type="Room">
              <i class="fas fa-edit"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger delete-btn admin-only ${!isAdmin() ? 'd-none' : ''}" data-id="${room._id}" data-type="Room">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <!-- Racks for this room -->
        <div class="location-children ms-4 mt-2 d-none">
    `;
    
    // Render racks for this room
    if (room.racks && room.racks.length > 0) {
      html += '<ul class="list-group">';
      
      room.racks.forEach(rack => {
        html += `
          <li class="list-group-item">
            <div class="d-flex justify-content-between align-items-center location-item">
              <div>
                <span class="toggle-icon me-2 ${rack.shelves && rack.shelves.length > 0 ? '' : 'd-none'}">
                  <i class="fas fa-caret-right"></i>
                </span>
                <i class="fas fa-th-large text-success me-2"></i>
                <span>${rack.name}</span>
              </div>
              <div class="btn-group">
                <button type="button" class="btn btn-sm btn-outline-primary view-btn" data-id="${rack._id}" data-type="Rack">
                  <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary edit-btn manager-only ${!isInventoryManager() ? 'd-none' : ''}" data-id="${rack._id}" data-type="Rack">
                  <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger delete-btn admin-only ${!isAdmin() ? 'd-none' : ''}" data-id="${rack._id}" data-type="Rack">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            
            <!-- Shelves for this rack -->
            <div class="location-children ms-4 mt-2 d-none">
        `;
        
        // Render shelves for this rack
        if (rack.shelves && rack.shelves.length > 0) {
          html += '<ul class="list-group">';
          
          rack.shelves.forEach(shelf => {
            html += `
              <li class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <i class="fas fa-stream text-info me-2"></i>
                    <span>${shelf.name}</span>
                  </div>
                  <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-primary view-btn" data-id="${shelf._id}" data-type="Shelf">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary edit-btn manager-only ${!isInventoryManager() ? 'd-none' : ''}" data-id="${shelf._id}" data-type="Shelf">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger delete-btn admin-only ${!isAdmin() ? 'd-none' : ''}" data-id="${shelf._id}" data-type="Shelf">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </li>
            `;
          });
          
          html += '</ul>';
        } else {
          html += `
            <div class="text-muted small py-2">
              No shelves in this rack. <a href="#" class="add-location-link" data-parent="${rack._id}" data-type="Shelf">Add shelf</a>
            </div>
          `;
        }
        
        html += `
            </div>
          </li>
        `;
      });
      
      html += '</ul>';
    } else {
      html += `
        <div class="text-muted small py-2">
          No racks in this room. <a href="#" class="add-location-link" data-parent="${room._id}" data-type="Rack">Add rack</a>
        </div>
      `;
    }
    
    html += `
        </div>
      </li>
    `;
  });
  
  html += '</ul>';
  
  locationTree.innerHTML = html;
  
  // Add event listeners to toggle icons
  document.querySelectorAll('.toggle-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      const parent = e.currentTarget.closest('.location-item');
      const children = parent.nextElementSibling;
      const caretIcon = e.currentTarget.querySelector('i');
      
      children.classList.toggle('d-none');
      
      if (children.classList.contains('d-none')) {
        caretIcon.classList.remove('fa-caret-down');
        caretIcon.classList.add('fa-caret-right');
      } else {
        caretIcon.classList.remove('fa-caret-right');
        caretIcon.classList.add('fa-caret-down');
      }
      
      // Prevent event bubbling
      e.stopPropagation();
    });
  });
  
  // Add event listeners to location items
  document.querySelectorAll('.location-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Only toggle if clicking on the item itself, not on buttons
      if (!e.target.closest('button') && !e.target.closest('.toggle-icon')) {
        const toggleIcon = item.querySelector('.toggle-icon');
        if (toggleIcon) {
          toggleIcon.click();
        }
      }
    });
  });
  
  // Add event listeners to action buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const locationId = btn.dataset.id;
      const locationType = btn.dataset.type;
      viewLocation(locationId, locationType);
    });
  });
  
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const locationId = btn.dataset.id;
      const locationType = btn.dataset.type;
      editLocation(locationId, locationType);
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const locationId = btn.dataset.id;
      const locationType = btn.dataset.type;
      
      if (confirm(`Are you sure you want to delete this ${locationType.toLowerCase()}? This action cannot be undone.`)) {
        deleteLocation(locationId, locationType);
      }
    });
  });
  
  // Add event listeners to "Add location" links
  document.querySelectorAll('.add-location-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const parentId = link.dataset.parent;
      const locationType = link.dataset.type;
      
      openLocationModal(null, locationType, parentId);
    });
  });
}

// View location details
function viewLocation(locationId, locationType) {
  let location;
  
  // Find location by ID and type
  switch (locationType) {
    case 'Room':
      location = allLocations.rooms.find(room => room.id === locationId);
      break;
    case 'Rack':
      location = allLocations.racks.find(rack => rack.id === locationId);
      break;
    case 'Shelf':
      location = allLocations.shelves.find(shelf => shelf.id === locationId);
      break;
  }
  
  if (!location) {
    showAlert(`${locationType} not found`, 'danger');
    return;
  }
  
  // Create location path
  let locationPath = '';
  if (locationType === 'Shelf') {
    locationPath = `${location.grandParentName} → ${location.parentName} → ${location.name}`;
  } else if (locationType === 'Rack') {
    locationPath = `${location.parentName} → ${location.name}`;
  } else {
    locationPath = location.name;
  }
  
  // Show location details
  Swal.fire({
    title: location.name,
    html: `
      <div class="text-start">
        <p><strong>Type:</strong> ${location.type}</p>
        <p><strong>Location:</strong> ${locationPath}</p>
        ${location.description ? `<p><strong>Description:</strong> ${location.description}</p>` : ''}
      </div>
    `,
    icon: 'info',
    confirmButtonText: 'Close'
  });
}

// Edit location
function editLocation(locationId, locationType) {
  openLocationModal(locationId, locationType);
}

// Delete location
async function deleteLocation(locationId, locationType) {
  try {
    // Send delete request
    const response = await fetchWithAuth(`${API_URL}/locations/${locationId}`, {
      method: 'DELETE'
    });
    
    if (!response) return;
    
    if (response.ok) {
      // Show success message
      showAlert(`${locationType} deleted successfully`, 'success');
      
      // Reload locations
      loadLocations();
      loadLocationStatistics();
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || `Failed to delete ${locationType.toLowerCase()}`, 'danger');
    }
  } catch (error) {
    console.error('Delete location error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
  }
}

// Open location modal for adding/editing
function openLocationModal(locationId = null, locationType, parentId = null) {
  const modal = document.getElementById('locationModal');
  const modalTitle = document.getElementById('locationModalTitle');
  const form = document.getElementById('locationForm');
  const locationIdInput = document.getElementById('locationId');
  const locationTypeInput = document.getElementById('locationType');
  const locationNameInput = document.getElementById('locationName');
  const parentLocationGroup = document.getElementById('parentLocationGroup');
  const parentLocationSelect = document.getElementById('parentLocation');
  const parentLocationHelp = document.getElementById('parentLocationHelp');
  const locationDescriptionInput = document.getElementById('locationDescription');
  
  // Reset form
  form.reset();
  
  // Set initial values
  locationIdInput.value = locationId || '';
  locationTypeInput.value = locationType;
  
  // Set modal title
  modalTitle.textContent = locationId ? `Edit ${locationType}` : `Add ${locationType}`;
  
  // Show or hide parent location field
  if (locationType === 'Room') {
    parentLocationGroup.style.display = 'none';
  } else {
    parentLocationGroup.style.display = 'block';
    
    // Populate parent location options based on type
    if (locationType === 'Rack') {
      // Parent must be a room
      parentLocationHelp.textContent = 'Select the room for this rack';
      parentLocationSelect.innerHTML = '<option value="">Select Room</option>';
      
      allLocations.rooms.forEach(room => {
        parentLocationSelect.innerHTML += `<option value="${room.id}">${room.name}</option>`;
      });
    } else if (locationType === 'Shelf') {
      // Parent must be a rack
      parentLocationHelp.textContent = 'Select the rack for this shelf';
      parentLocationSelect.innerHTML = '<option value="">Select Rack</option>';
      
      allLocations.racks.forEach(rack => {
        parentLocationSelect.innerHTML += `<option value="${rack.id}">${rack.parentName} → ${rack.name}</option>`;
      });
    }
  }
  
  // If editing existing location, populate form
  if (locationId) {
    let location;
    
    // Find location by ID and type
    switch (locationType) {
      case 'Room':
        location = allLocations.rooms.find(room => room.id === locationId);
        break;
      case 'Rack':
        location = allLocations.racks.find(rack => rack.id === locationId);
        break;
      case 'Shelf':
        location = allLocations.shelves.find(shelf => shelf.id === locationId);
        break;
    }
    
    if (location) {
      locationNameInput.value = location.name;
      locationDescriptionInput.value = location.description;
      
      if (location.parent) {
        parentLocationSelect.value = location.parent;
      }
    }
  } else if (parentId) {
    // If adding a new child location with parent ID specified
    parentLocationSelect.value = parentId;
  }
  
  // Open the modal
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}

// Save location
async function saveLocation() {
  try {
    // Get form data
    const locationId = document.getElementById('locationId').value;
    const locationType = document.getElementById('locationType').value;
    const name = document.getElementById('locationName').value;
    const description = document.getElementById('locationDescription').value;
    let parent = null;
    
    if (locationType !== 'Room') {
      parent = document.getElementById('parentLocation').value;
      
      if (!parent) {
        showAlert(`Please select a parent for this ${locationType.toLowerCase()}`, 'danger');
        return;
      }
    }
    
    // Validate name
    if (!name) {
      showAlert('Please enter a name for the location', 'danger');
      return;
    }
    
    // Prepare location data
    const locationData = {
      name,
      type: locationType,
      description
    };
    
    if (parent) {
      locationData.parent = parent;
    }
    
    // Show loading state
    const saveBtn = document.getElementById('saveLocationBtn');
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';
    saveBtn.disabled = true;
    
    let response;
    
    if (locationId) {
      // Update existing location
      response = await fetchWithAuth(`${API_URL}/locations/${locationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(locationData)
      });
    } else {
      // Create new location
      response = await fetchWithAuth(`${API_URL}/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(locationData)
      });
    }
    
    // Reset button state
    saveBtn.innerHTML = 'Save Location';
    saveBtn.disabled = false;
    
    if (!response) return;
    
    if (response.ok) {
      // Close modal
      bootstrap.Modal.getInstance(document.getElementById('locationModal')).hide();
      
      // Show success message
      showAlert(`${locationType} ${locationId ? 'updated' : 'created'} successfully`, 'success');
      
      // Reload locations
      loadLocations();
      loadLocationStatistics();
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || `Failed to ${locationId ? 'update' : 'create'} ${locationType.toLowerCase()}`, 'danger');
    }
  } catch (error) {
    console.error('Save location error:', error);
    showAlert('Failed to connect to server. Please try again.', 'danger');
    
    // Reset button state
    const saveBtn = document.getElementById('saveLocationBtn');
    saveBtn.innerHTML = 'Save Location';
    saveBtn.disabled = false;
  }
}

// Load location statistics
async function loadLocationStatistics() {
  try {
    // Fetch location report
    const response = await fetchWithAuth(`${API_URL}/reports/locations`);
    
    if (!response) return;
    
    if (response.ok) {
      const data = await response.json();
      
      // Update total items count
      let totalItems = 0;
      data.forEach(room => {
        if (room.valueStats && room.valueStats.totalItems) {
          totalItems += room.valueStats.totalItems;
        }
      });
      document.getElementById('totalItems').textContent = totalItems;
      
      // Update room stats table
      updateRoomStatsTable(data);
    } else {
      const errorData = await response.json();
      console.error('Location statistics error:', errorData);
    }
  } catch (error) {
    console.error('Location statistics error:', error);
  }
}

// Update room statistics table
function updateRoomStatsTable(roomsData) {
  const tableBody = document.getElementById('roomStatsTable');
  
  if (!roomsData || roomsData.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No room data available</td></tr>';
    return;
  }
  
  let html = '';
  
  roomsData.forEach(room => {
    // Format categories
    let categories = 'None';
    if (room.itemsByCategory && room.itemsByCategory.length > 0) {
      categories = room.itemsByCategory
        .map(cat => `${cat._id} (${cat.count})`)
        .join(', ');
    }
    
    // Get value and count
    const itemCount = room.valueStats ? room.valueStats.totalItems || 0 : 0;
    const totalValue = room.valueStats ? room.valueStats.totalValue || 0 : 0;
    
    html += `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <i class="fas fa-door-open text-primary me-2"></i>
            <span>${room.name}</span>
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

// Toggle all location tree nodes
function toggleAllNodes(expand) {
  const locationItems = document.querySelectorAll('.location-children');
  const toggleIcons = document.querySelectorAll('.toggle-icon i');
  
  locationItems.forEach(item => {
    if (expand) {
      item.classList.remove('d-none');
    } else {
      item.classList.add('d-none');
    }
  });
  
  toggleIcons.forEach(icon => {
    if (expand) {
      icon.classList.remove('fa-caret-right');
      icon.classList.add('fa-caret-down');
    } else {
      icon.classList.remove('fa-caret-down');
      icon.classList.add('fa-caret-right');
    }
  });
  
  // Update state
  expandedState = expand;
  
  // Update button text
  const expandAllBtn = document.getElementById('expandAllBtn');
  expandAllBtn.innerHTML = expand ? 
    '<i class="fas fa-compress-alt me-1"></i> Collapse All' : 
    '<i class="fas fa-expand-alt me-1"></i> Expand All';
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
  
  // Add location dropdown items
  document.querySelectorAll('.dropdown-item[data-type]').forEach(item => {
    item.addEventListener('click', () => {
      const locationType = item.dataset.type;
      openLocationModal(null, locationType);
    });
  });
  
  // Save location button
  document.getElementById('saveLocationBtn').addEventListener('click', saveLocation);
  
  // Expand/collapse all button
  document.getElementById('expandAllBtn').addEventListener('click', () => {
    toggleAllNodes(!expandedState);
  });
}