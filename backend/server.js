const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { databases, users, databaseId, usersCollectionId, appointmentsCollectionId } = require('./config/appwrite');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api', (req, res) => {
  res.json({ message: 'Backend API is running with Appwrite!' });
});

// Example: Get user data
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const userDoc = await databases.getDocument(databaseId, usersCollectionId, uid);
    
    res.json(userDoc);
  } catch (error) {
    if (error.code === 404) {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example: Create/Update user profile
app.post('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const userData = req.body;
    
    // Try to update existing document, if not exists, create new one
    try {
      const updatedUser = await databases.updateDocument(
        databaseId,
        usersCollectionId,
        uid,
        userData
      );
      res.json({ message: 'User profile updated successfully', user: updatedUser });
    } catch (error) {
      if (error.code === 404) {
        // Document doesn't exist, create it
        const newUser = await databases.createDocument(
          databaseId,
          usersCollectionId,
          uid,
          userData
        );
        res.json({ message: 'User profile created successfully', user: newUser });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
