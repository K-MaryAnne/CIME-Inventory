// server/routes/userRoutes.js

const express = require('express');
const router = express.Router();
const { 
  registerUser,
  createUser,
  loginUser, 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser 
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/register', registerUser);  // Self-registration (public)
router.post('/login', loginUser);        // Login (public)

// Admin routes
router.route('/')
  .get(protect, authorize('Admin'), getUsers)        // Get all users
  .post(protect, authorize('Admin'), createUser);    // Create user (admin)

router.route('/:id')
  .get(protect, authorize('Admin'), getUserById)     // Get user by ID
  .put(protect, authorize('Admin'), updateUser)      // Update user
  .delete(protect, authorize('Admin'), deleteUser);  // Delete user

module.exports = router;