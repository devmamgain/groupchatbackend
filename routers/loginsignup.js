const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usermodel = require('../datamodels/users'); 
const router = express.Router()
const authMiddleware = require('../middleware/auth');

router.post("/api/register", async (req, res) => {
  try {
      const { username, password } = req.body;
      const existingUser = await usermodel.findOne({ username });

      if (existingUser) {
          return res.status(400).json({ message: "username is already registered" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);

      const users = {
          username,
          password: hashedPassword
      };
      const newUser = new usermodel(users);
      const saveuser = await newUser.save();
      const token = jwt.sign({ id: saveuser._id, username: saveuser.username }, 'devmamgain43');
      res.json({ user: saveuser, token });
  } catch (err) {
      res.status(500).json({ message: "error creating user" });
  }
});

router.post("/api/login", async (req, res) => {
  try {
      const { username, password } = req.body;
      const user = await usermodel.findOne({ username });

      if (user && await bcrypt.compare(password, user.password)) {
          const token = jwt.sign({ id: user._id, username: user.username }, 'devmamgain43');
          res.json({ token });
      } else {
          res.status(400).json({ message: "Invalid credentials" });
      }
  } catch (err) {
      res.status(500).json({ message: "error logging in" });
  }
});

router.get('/api/userinfo', authMiddleware, async (req, res) => {
  try {
      const user = await usermodel.findById(req.user.id).select('-password');
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
  } catch (err) {
      res.status(500).json({ message: 'Error fetching user data' });
  }
});
module.exports = router
