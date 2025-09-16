const express = require('express');
const connectDB = require('./config/database');
const cookieParser = require('cookie-parser');
var cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const chatRoutes = require('./routes/chatRoutes');
const postRoutes = require('./routes/postRoutes');
require('dotenv').config({ path: '../.env' });

// Seeding function to ensure proper order
async function seedData() {
  const { seedDefaultRoles } = require('./services/roleServices');
  await seedDefaultRoles();
  
  const { seedTestData } = require('./services/testDataService');
  await seedTestData();
}

if (process.env.NODE_ENV !== 'test') {
  seedData();
}


// Set fallback JWT_SECRET for development
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-secret-key-change-in-production';
  // eslint-disable-next-line no-console
  console.log('Warning: Using default JWT_SECRET for development');
}

const app = express();

// CORS configuration - simpler setup
app.use(cors({
  origin: true, // Allow all origins
  credentials: true // Allow cookies
}));


// Connect to MongoDB
connectDB();

app.use(express.json({ limit: '10mb' })); // Increase limit for Base64 images
app.use(cookieParser());

app.use('/api', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/posts', postRoutes);

module.exports = app;

