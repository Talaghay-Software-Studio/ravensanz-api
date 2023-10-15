const express = require('express');
const router = express.Router();
const userSignupController = require('../controllers/userSignupController');

// Routes
router.post("/", userSignupController.createUser);
router.delete("/deleteuser", userSignupController.deleteUser);

// Continue with Google Signup/Login
router.post("/google", userSignupController.createGoogleUser);

module.exports = router;