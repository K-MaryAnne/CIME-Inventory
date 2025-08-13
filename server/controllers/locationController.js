// server/controllers/locationController.js
const Location = require('../models/Location');
const Item = require('../models/Item');

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private
const getLocations = async (req, res) => {
  try {
    // Filter by type if specified
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    const locations = await Location.find(filter)
      .populate('parent', 'name type')
      .sort({ type: 1, name: 1 });
    
    res.json(locations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get location by ID
// @route   GET /api/locations/:id
// @access  Private
const getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('parent', 'name type');
    
    if (location) {
      res.json(location);
    } else {
      res.status(404).json({ message: 'Location not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new location
// @route   POST /api/locations
// @access  Private/Admin,InventoryManager
const createLocation = async (req, res) => {
  try {
    const { name, type, parent, description } = req.body;
    
   
    if (parent) {
      const parentLocation = await Location.findById(parent);
      if (!parentLocation) {
        return res.status(400).json({ message: 'Parent location not found' });
      }
      
      // Ensure proper hierarchy (Room -> Rack -> Shelf)
      if (type === 'Room' && parentLocation) {
        return res.status(400).json({ message: 'A Room cannot have a parent location' });
      }
      
      if (type === 'Rack' && parentLocation.type !== 'Room') {
        return res.status(400).json({ message: 'A Rack must have a Room as parent' });
      }
      
      if (type === 'Shelf' && parentLocation.type !== 'Rack') {
        return res.status(400).json({ message: 'A Shelf must have a Rack as parent' });
      }
    } else if (type !== 'Room') {
      return res.status(400).json({ 
        message: `A ${type} must have a parent location` 
      });
    }
    
    const location = await Location.create({
      name,
      type,
      parent,
      description
    });
    
    res.status(201).json(location);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a location
// @route   PUT /api/locations/:id
// @access  Private/Admin,InventoryManager
const updateLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    
    if (location) {
      location.name = req.body.name || location.name;
      location.description = req.body.description || location.description;
      
      // Don't allow changing type or parent as it could break the hierarchy
      if (req.body.type && req.body.type !== location.type) {
        return res.status(400).json({ 
          message: 'Cannot change location type after creation' 
        });
      }
      
      if (req.body.parent && req.body.parent.toString() !== location.parent.toString()) {
        return res.status(400).json({ 
          message: 'Cannot change parent location after creation' 
        });
      }
      
      const updatedLocation = await location.save();
      res.json(updatedLocation);
    } else {
      res.status(404).json({ message: 'Location not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a location
// @route   DELETE /api/locations/:id
// @access  Private/Admin
const deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }
    
    // Check if location has child locations
    const childLocations = await Location.findOne({ parent: req.params.id });
    if (childLocations) {
      return res.status(400).json({ 
        message: 'Cannot delete location with child locations. Remove child locations first.' 
      });
    }
    
    // Check if location is being used by any items
    let itemQuery = {};
    if (location.type === 'Room') {
      itemQuery = { 'location.room': req.params.id };
    } else if (location.type === 'Rack') {
      itemQuery = { 'location.rack': req.params.id };
    } else if (location.type === 'Shelf') {
      itemQuery = { 'location.shelf': req.params.id };
    }
    
    const itemsUsingLocation = await Item.findOne(itemQuery);
    if (itemsUsingLocation) {
      return res.status(400).json({ 
        message: 'Cannot delete location that is being used by items. Move items first.' 
      });
    }
    
    await location.remove();
    res.json({ message: 'Location removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get location hierarchy
// @route   GET /api/locations/hierarchy
// @access  Private
const getLocationHierarchy = async (req, res) => {
  try {
    // First get all rooms (top level)
    const rooms = await Location.find({ type: 'Room' }).lean();
    
    // Get all racks
    const racks = await Location.find({ type: 'Rack' }).lean();
    
    // Get all shelves
    const shelves = await Location.find({ type: 'Shelf' }).lean();
    
    // Build hierarchy
    const hierarchy = rooms.map(room => {
      const roomRacks = racks
        .filter(rack => rack.parent && rack.parent.toString() === room._id.toString())
        .map(rack => {
          const rackShelves = shelves
            .filter(shelf => shelf.parent && shelf.parent.toString() === rack._id.toString());
          
          return {
            ...rack,
            shelves: rackShelves
          };
        });
      
      return {
        ...room,
        racks: roomRacks
      };
    });
    
    res.json(hierarchy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationHierarchy
};
