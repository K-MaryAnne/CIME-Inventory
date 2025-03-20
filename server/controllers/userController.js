// server/controllers/userController.js
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const nodemailer = require('nodemailer');

// Setup email transporter if email settings are available
let transporter;
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}


// @desc    Register a new user (self-registration)
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
    try {
      console.log('Self-registration request received:', req.body);
      const { name, email, password } = req.body;
      
      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({ 
          message: 'Please provide name, email and password' 
        });
      }
      
      // Check if user already exists
      const userExists = await User.findOne({ email });
      
      if (userExists) {
        console.log('User already exists with email:', email);
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Create new user with default Staff role
      const user = await User.create({
        name,
        email,
        password,
        role: 'Staff' // Default role for self registration
      });
      
      if (user) {
        console.log('New user registered successfully:', { 
          id: user._id, 
          name: user.name, 
          email: user.email 
        });
        
        // Send notification to admin about new user registration if email is configured
        if (transporter && process.env.ADMIN_EMAIL) {
          try {
            const mailOptions = {
              from: process.env.EMAIL_USER,
              to: process.env.ADMIN_EMAIL,
              subject: 'New User Registration',
              html: `
                <h2>New User Registration</h2>
                <p>A new user has registered to the CIME Nairobi Inventory System:</p>
                <ul>
                  <li><strong>Name:</strong> ${user.name}</li>
                  <li><strong>Email:</strong> ${user.email}</li>
                  <li><strong>Role:</strong> ${user.role}</li>
                  <li><strong>Registered on:</strong> ${new Date().toLocaleString()}</li>
                </ul>
                <p>Please review this registration and adjust roles if necessary.</p>
              `
            };
            
            await transporter.sendMail(mailOptions);
            console.log('Registration notification email sent');
          } catch (emailError) {
            console.error('Email notification failed:', emailError);
          }
        }
  
        res.status(201).json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id)
        });
      } else {
        res.status(400).json({ message: 'Invalid user data' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server Error during registration' });
    }
  };

// @desc    Admin creating a new user
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
    try {
      console.log('Creating new user with data:', req.body);
      const { name, email, password, role } = req.body;
      
      // Check if required fields are present
      if (!name || !email || !password) {
        return res.status(400).json({ 
          message: 'Please provide name, email and password' 
        });
      }
      
      // Check if user already exists
      const userExists = await User.findOne({ email });
      
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Create new user with specified role (admin access required)
      const user = await User.create({
        name,
        email,
        password,
        role: role || 'Staff'
      });
      
      if (user) {
        console.log('User created successfully:', { id: user._id, name: user.name, email: user.email });
        res.status(201).json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        });
      } else {
        res.status(400).json({ message: 'Invalid user data' });
      }
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Server Error creating user' });
    }
  };

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    
    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    console.log('Getting all users');
    const users = await User.find({}).select('-password');
    console.log('Found users:', users.length);
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
    try {
      console.log('Updating user with ID:', req.params.id);
      console.log('Update data:', req.body);
      
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update fields only if they are provided in the request
      if (req.body.name) {
        user.name = req.body.name;
      }
      
      if (req.body.email) {
        user.email = req.body.email;
      }
      
      if (req.body.role) {
        user.role = req.body.role;
      }
      
      if (req.body.password) {
        user.password = req.body.password;
      }
      
      console.log('User after updates:', { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      });
      
      const updatedUser = await user.save();
      console.log('User updated successfully');
      
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Server Error updating user' });
    }
  };

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
      console.log('Deleting user with ID:', req.params.id);
      
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Use deleteOne instead of remove (which is deprecated)
      await User.deleteOne({ _id: req.params.id });
      console.log('User deleted successfully');
      
      res.json({ message: 'User removed' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Server Error deleting user' });
    }
  };

module.exports = {
  registerUser,
  createUser,
  loginUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
};