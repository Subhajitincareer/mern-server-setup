#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Support __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to get user input for folder name
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
    // Get user input for folder name
    const userFolder = await getUserFolder();
    const baseDir = path.resolve(process.cwd(), userFolder);

    // Create the project folder
    await fs.ensureDir(baseDir);
    console.log(`🚀 Creating MERN backend in folder: ${userFolder}`);
    console.log('🚀 Creating folder structure...');

    const folders = ['config', 'controllers', 'middlewares', 'models', 'routes', 'utils'];
    folders.forEach(folder => fs.mkdirSync(path.join(baseDir, folder), { recursive: true }));

    console.log('📄 Creating starter files...');
    await fs.writeFile(path.join(baseDir, '.env'), 'PORT=5000\nMONGO_URI=mongodb://localhost:27017/mern_app\nJWT_SECRET=supersecretkey');
    await fs.writeFile(path.join(baseDir, '.gitignore'), 'node_modules\n.env');

    await fs.writeFile(path.join(baseDir, 'config/db.js'), `
import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
};

export default connectDB;
    `.trim());

    await fs.writeFile(path.join(baseDir, 'models/itemModel.js'), `
import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
});

export default mongoose.model('Item', itemSchema);
    `.trim());

    await fs.writeFile(path.join(baseDir, 'controllers/itemController.js'), `
import Item from '../models/itemModel.js';

export const createItem = async (req, res) => {
    try {
        const newItem = new Item(req.body);
        await newItem.save();
        res.status(201).json(newItem);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getItems = async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
    `.trim());

    await fs.writeFile(path.join(baseDir, 'middlewares/authMiddleware.js'), `
import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

export default authMiddleware;
    `.trim());

    await fs.writeFile(path.join(baseDir, 'routes/itemRoutes.js'), `
import express from 'express';
import { createItem, getItems } from '../controllers/itemController.js';

const router = express.Router();

router.post('/', createItem);
router.get('/', getItems);

export default router;
    `.trim());

    await fs.writeFile(path.join(baseDir, 'utils/generateToken.js'), `
import jwt from 'jsonwebtoken';

export function generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
}
    `.trim());

    await fs.writeFile(path.join(baseDir, 'server.js'), `
import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import cors from 'cors';
import itemRoutes from './routes/itemRoutes.js';

dotenv.config();
const app = express();

connectDB();
app.use(cors());
app.use(express.json());
app.use('/api/items', itemRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'MERN Server is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
    `.trim());

    // Change to project directory for npm operations
    process.chdir(baseDir);

    console.log('⚡ Initializing npm project...');
    execSync('npm init -y', { stdio: 'inherit' });

    console.log('🔧 Updating package.json with module type and scripts...');
    const packageJsonPath = path.join(baseDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    // Set module type to ESM and add scripts
    packageJson.type = "module";
    packageJson.scripts = {
        start: "node server.js",
        dev: "nodemon server.js"
    };
    packageJson.description = "MERN backend server with ESM modules";
    packageJson.keywords = ["mern", "express", "mongodb", "nodejs", "backend"];

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    console.log('📦 Installing dependencies...');
    execSync('npm install express mongoose dotenv cors jsonwebtoken', { stdio: 'inherit' });
    execSync('npm install -D nodemon', { stdio: 'inherit' });

    // Check and update packages (optional)
    try {
        console.log('🔄 Checking for package updates...');
        execSync('npx npm-check-updates -u', { stdio: 'inherit' });
        execSync('npm install', { stdio: 'inherit' });
    } catch (error) {
        console.log('⚠️ Package update check failed, continuing...');
    }

    console.log('🚀 Starting development server with npm run dev...');
    execSync('npm run dev', { stdio: 'inherit' });

    console.log('✅ Full MERN backend server setup (ESM Module Type) is ready! 🎉');
    console.log(`\n📁 Project created in: ${userFolder}/`);
    console.log('\n🚀 To start your server again:');
    console.log(`   cd ${userFolder}`);
    console.log('   npm run dev     # Development mode with nodemon');
    console.log('   npm start       # Production mode');
    console.log('\n📝 Environment variables are in .env file');
    console.log('🔗 Test your API at: http://localhost:5000');
}

createServerSetup().catch(console.error);
