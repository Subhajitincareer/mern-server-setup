#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { execSync } from 'child_process';

// Support __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prompt user for folder name
async function getUserFolder() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('📁 Enter folder name for your project (default: server): ', (answer) => {
      rl.close();
      resolve(answer.trim() || 'server');
    });
  });
}

async function createServerSetup() {
  try {
    // Get user input for folder name
    const userFolder = await getUserFolder();
    const baseDir = path.resolve(process.cwd(), userFolder);

    console.log(`🚀 Creating MERN backend in folder: ${userFolder}`);
    await fs.ensureDir(baseDir);

    // Create folder structure
    console.log('🚀 Creating folder structure...');
    const folders = ['config', 'controllers', 'middlewares', 'models', 'routes', 'utils'];
    folders.forEach(folder =>
      fs.mkdirSync(path.join(baseDir, folder), { recursive: true })
    );

    // Write .env and .gitignore
    console.log('📄 Creating configuration files...');
    await fs.writeFile(
      path.join(baseDir, '.env'),
      [
        'PORT=5000',
        'MONGO_URI=mongodb://localhost:27017/mern_app',
        'JWT_SECRET=supersecretkey123456789',
        'JWT_EXPIRE=30d',
        'NODE_ENV=development'
      ].join('\n')
    );

    await fs.writeFile(
      path.join(baseDir, '.gitignore'),
      [
        'node_modules',
        '.env',
        '.DS_Store',
        'dist',
        'build',
        '*.log',
        'coverage',
        '.nyc_output'
      ].join('\n')
    );

    // Create config/db.js
    await fs.writeFile(
      path.join(baseDir, 'config/db.js'),
      `import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    console.log(\`🍃 MongoDB Connected: \${conn.connection.host}\`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;`
    );

    // Create models/User.js
    await fs.writeFile(
      path.join(baseDir, 'models/User.js'),
      `import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);`
    );

    // Create models/Item.js
    await fs.writeFile(
      path.join(baseDir, 'models/Item.js'),
      `import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity'],
    min: [0, 'Quantity cannot be negative']
  },
  price: {
    type: Number,
    required: [true, 'Please add price'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['electronics', 'clothing', 'books', 'home', 'sports', 'other']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Item', itemSchema);`
    );

    // Create controllers/authController.js
    await fs.writeFile(
      path.join(baseDir, 'controllers/authController.js'),
      `import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import asyncHandler from '../middlewares/asyncHandler.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({
      success: false,
      message: 'User already exists'
    });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password
  });

  if (user) {
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid user data'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email }).select('+password');

  if (user && (await user.comparePassword(password))) {
    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({
    success: true,
    data: user
  });
});`
    );

    // Create controllers/itemController.js
    await fs.writeFile(
      path.join(baseDir, 'controllers/itemController.js'),
      `import Item from '../models/Item.js';
import asyncHandler from '../middlewares/asyncHandler.js';

// @desc    Get all items
// @route   GET /api/items
// @access  Private
export const getItems = asyncHandler(async (req, res) => {
  const items = await Item.find({ user: req.user.id }).populate('user', 'name email');
  
  res.json({
    success: true,
    count: items.length,
    data: items
  });
});

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Private
export const getItem = asyncHandler(async (req, res) => {
  const item = await Item.findOne({ _id: req.params.id, user: req.user.id });

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  res.json({
    success: true,
    data: item
  });
});

// @desc    Create new item
// @route   POST /api/items
// @access  Private
export const createItem = asyncHandler(async (req, res) => {
  req.body.user = req.user.id;
  
  const item = await Item.create(req.body);

  res.status(201).json({
    success: true,
    data: item
  });
});

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private
export const updateItem = asyncHandler(async (req, res) => {
  let item = await Item.findOne({ _id: req.params.id, user: req.user.id });

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  item = await Item.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.json({
    success: true,
    data: item
  });
});

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private
export const deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findOne({ _id: req.params.id, user: req.user.id });

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  await Item.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    data: {}
  });
});`
    );

    // Create middlewares/authMiddleware.js
    await fs.writeFile(
      path.join(baseDir, 'middlewares/authMiddleware.js'),
      `import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from './asyncHandler.js';

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
});

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: \`User role \${req.user.role} is not authorized to access this route\`
      });
    }
    next();
  };
};

export { protect, authorize };`
    );

    // Create middlewares/asyncHandler.js
    await fs.writeFile(
      path.join(baseDir, 'middlewares/asyncHandler.js'),
      `const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;`
    );

    // Create middlewares/errorHandler.js
    await fs.writeFile(
      path.join(baseDir, 'middlewares/errorHandler.js'),
      `const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.log(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

export default errorHandler;`
    );

    // Create routes/auth.js
    await fs.writeFile(
      path.join(baseDir, 'routes/auth.js'),
      `import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

export default router;`
    );

    // Create routes/items.js
    await fs.writeFile(
      path.join(baseDir, 'routes/items.js'),
      `import express from 'express';
import {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem
} from '../controllers/itemController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // Protect all routes

router.route('/').get(getItems).post(createItem);
router.route('/:id').get(getItem).put(updateItem).delete(deleteItem);

export default router;`
    );

    // Create utils/generateToken.js
    await fs.writeFile(
      path.join(baseDir, 'utils/generateToken.js'),
      `import jwt from 'jsonwebtoken';

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};`
    );

    // Create server.js
    await fs.writeFile(
      path.join(baseDir, 'server.js'),
      `import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/db.js';
import errorHandler from './middlewares/errorHandler.js';

// Route files
import auth from './routes/auth.js';
import items from './routes/items.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Enable CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
}

// Mount routers
app.use('/api/auth', auth);
app.use('/api/items', items);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MERN Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to MERN Backend API 🚀',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      items: '/api/items',
      health: '/health'
    },
    documentation: 'See README.md for API documentation'
  });
});



// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(\`🚀 Server running in \${process.env.NODE_ENV} mode on port \${PORT}\`);
  console.log(\`📍 API available at: http://localhost:\${PORT}\`);
  console.log(\`🏥 Health check: http://localhost:\${PORT}/health\`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(\`❌ Error: \${err.message}\`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received');
  server.close(() => {
    console.log('Process terminated');
  });
});`
    );

    // Change to project directory
    process.chdir(baseDir);

    // Initialize npm project
    console.log('⚡ Initializing npm project...');
    execSync('npm init -y', { stdio: 'inherit' });

    // Update package.json with module type and scripts
    console.log('🔧 Updating package.json with ESM module type...');
    const packageJsonPath = path.join(baseDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    packageJson.type = 'module';
    packageJson.scripts = {
      start: 'node server.js',
      dev: 'nodemon server.js',
      test: 'echo "Error: no test specified" && exit 1'
    };
    packageJson.description = 'MERN backend server with JWT authentication and CRUD operations';
    packageJson.keywords = ['mern', 'express', 'mongodb', 'nodejs', 'backend', 'jwt', 'auth', 'api'];
    packageJson.author = '';
    packageJson.license = 'MIT';
    packageJson.main = 'server.js';

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Install dependencies
    console.log('📦 Installing production dependencies...');
    const dependencies = [
      'express',
      'mongoose',
      'dotenv',
      'cors',
      'jsonwebtoken',
      'bcryptjs',
      'morgan'
    ];

    const devDependencies = ['nodemon'];

    execSync(`npm install ${dependencies.join(' ')}`, { stdio: 'inherit' });
    console.log('🔧 Installing development dependencies...');
    execSync(`npm install -D ${devDependencies.join(' ')}`, { stdio: 'inherit' });

    // Check for package updates
    try {
      console.log('🔄 Checking for package updates...');
      execSync('npx npm-check-updates -u', { stdio: 'inherit' });
      execSync('npm install', { stdio: 'inherit' });
    } catch (error) {
      console.log('⚠️ Package update check failed, continuing...');
    }

    // Create README.md with comprehensive documentation
    await fs.writeFile(
      path.join(baseDir, 'README.md'),
      `# MERN Backend Server

A complete MERN stack backend with JWT authentication and CRUD operations.

## Features

- ✅ **JWT Authentication** - Secure user registration and login
- ✅ **User Management** - User registration, login, and profile
- ✅ **Protected Routes** - Middleware-based authentication
- ✅ **CRUD Operations** - Complete item management system
- ✅ **Error Handling** - Comprehensive error middleware
- ✅ **MongoDB Integration** - Mongoose ODM with validation
- ✅ **ESM Modules** - Modern JavaScript module system
- ✅ **Password Hashing** - bcryptjs for secure passwords
- ✅ **Request Logging** - Morgan middleware for development
- ✅ **CORS Support** - Cross-origin resource sharing

## Quick Start

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment variables in \`.env\`:**
   \`\`\`
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/mern_app
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRE=30d
   NODE_ENV=development
   \`\`\`

3. **Start the server:**
   \`\`\`bash
   npm run dev    # Development mode with nodemon
   npm start      # Production mode
   \`\`\`

## API Endpoints

### Authentication Routes
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | \`/api/auth/register\` | Register a new user | Public |
| POST | \`/api/auth/login\` | Login user | Public |
| GET | \`/api/auth/me\` | Get current user | Private |

### Item Management Routes
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | \`/api/items\` | Get all user items | Private |
| POST | \`/api/items\` | Create new item | Private |
| GET | \`/api/items/:id\` | Get single item | Private |
| PUT | \`/api/items/:id\` | Update item | Private |
| DELETE | \`/api/items/:id\` | Delete item | Private |

### Health Check
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | \`/health\` | Server health check | Public |
| GET | \`/\` | API information | Public |

## Request/Response Examples

### Register User
\`\`\`bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
\`\`\`

### Login User
\`\`\`bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
\`\`\`

### Create Item (Protected)
\`\`\`bash
POST /api/items
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "name": "Laptop",
  "description": "Gaming laptop",
  "quantity": 1,
  "price": 1299.99,
  "category": "electronics"
}
\`\`\`

## Project Structure

\`\`\`
${userFolder}/
├── config/
│   └── db.js              # Database connection
├── controllers/
│   ├── authController.js  # Authentication logic
│   └── itemController.js  # Item CRUD operations
├── middlewares/
│   ├── authMiddleware.js  # JWT authentication
│   ├── asyncHandler.js    # Async error handler
│   └── errorHandler.js    # Global error handler
├── models/
│   ├── User.js           # User schema
│   └── Item.js           # Item schema
├── routes/
│   ├── auth.js           # Authentication routes
│   └── items.js          # Item routes
├── utils/
│   └── generateToken.js   # JWT token generation
├── .env                  # Environment variables
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies and scripts
├── README.md           # Documentation
└── server.js           # Application entry point
\`\`\`

## Environment Variables

Create a \`.env\` file in the root directory:

\`\`\`
PORT=5000
MONGO_URI=mongodb://localhost:27017/mern_app
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d
NODE_ENV=development
CLIENT_URL=http://localhost:3000
\`\`\`

## Available Scripts

- \`npm start\` - Start production server
- \`npm run dev\` - Start development server with nodemon
- \`npm test\` - Run tests (to be implemented)

## MongoDB Setup

Make sure MongoDB is running on your system:

### Local MongoDB
\`\`\`bash
# Install MongoDB Community Edition
# Start MongoDB service
mongod
\`\`\`

### MongoDB Atlas (Cloud)
Replace \`MONGO_URI\` in \`.env\` with your Atlas connection string:
\`\`\`
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/mern_app
\`\`\`

## Testing the API

Use tools like Postman, Insomnia, or curl to test the API:

\`\`\`bash
# Health check
curl http://localhost:5000/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this project for learning and development.

## Support

If you encounter any issues, please check:
1. MongoDB is running
2. Environment variables are set correctly
3. All dependencies are installed
4. Port 5000 is not in use by another application

Happy coding! 🚀
`
    );

    console.log('🎉 ✅ MERN Backend setup completed successfully!');
    console.log(`\n📁 Project created in: ${userFolder}/`);
    console.log('📝 All files generated with ESM module support');
    console.log('🔧 Package.json configured with "type": "module"');
    console.log('📦 All dependencies installed');
    console.log('🏥 Health check endpoint: http://localhost:5000/health');
    console.log('📚 Complete API documentation in README.md');

    // Automatically start the development server
    console.log('\n🚀 Starting development server with nodemon...');
    console.log('🔥 Press Ctrl+C to stop the server\n');

    try {
      execSync('npm run dev', { stdio: 'inherit' });
    } catch (error) {
      console.log('\n👋 Development server stopped.');
      console.log(`\nTo restart your server:`);
      console.log(`   cd ${userFolder}`);
      console.log('   npm run dev     # Development mode with nodemon');
      console.log('   npm start       # Production mode');
    }

  } catch (error) {
    console.error('❌ Error creating MERN backend:', error.message);
    process.exit(1);
  }
}

createServerSetup().catch(console.error);
