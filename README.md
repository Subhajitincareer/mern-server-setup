
# MERN Server Setup CLI

A command-line tool that scaffolds a complete MERN backend server (ESM) with Express, MongoDB, JWT auth, and Nodemon.

## Features

- Creates folder structure:
  - `config/`
  - `controllers/`
  - `middlewares/`
  - `models/`
  - `routes/`
  - `utils/`
- Generates starter files:
  - `.env`
  - `.gitignore`
  - `config/db.js`
  - `models/itemModel.js`
  - `controllers/itemController.js`
  - `middlewares/authMiddleware.js`
  - `routes/itemRoutes.js`
  - `utils/generateToken.js`
  - `server.js`
- Initializes `package.json` with:
  - `"type": "module"`
  - `start` and `dev` scripts
  - `publishConfig.access = "public"`
- Installs dependencies:
  - express, mongoose, dotenv, cors, jsonwebtoken
- Installs dev dependency:
  - nodemon
- (Optional) Updates dependencies to latest versions
- Automatically runs `npm run dev` to start the server

## Installation

### Run via npx (no install required)

```bash
npx mern-server-setup
```

### Install Globally

```bash
npm install -g @subhajitpalv/mern-server-setup
mern-server-setup
```

### Install Locally in a Project

```bash
npm install @subhajitpalv/mern-server-setup
npx mern-server-setup
```

## Usage

1. Open a terminal in an empty project directory.
2. Run the setup command:

   ```bash
   npx mern-server-setup
   ```

3. The CLI will scaffold the project, install dependencies, and start the server in development mode.
4. Visit `http://localhost:5000` to verify:

   - `GET /` → `{ message: "MERN Server is running!" }`
   - `GET /api/items` → Returns an empty array
   - `POST /api/items` → Creates a new item

## Scripts

After setup, your `package.json` will include:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

- **dev**: Starts server with hot reload
- **start**: Starts server normally

## Configuration

Copy `.env` to configure:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/mern_app
JWT_SECRET=supersecretkey
```

## Troubleshooting

- **Command not found**  
  Ensure you call the binary name `mern-server-setup`, not the package name.  
  ```bash
  npx mern-server-setup
  # or if installed globally:
  mern-server-setup
  ```

- **Windows PATH issues**  
  Use npx to avoid PATH problems, or run the local binary directly:
  ```bash
  .\node_modules\.bin\mern-server-setup
  ```

- **Permission or 2FA errors**  
  Ensure you’re logged in to npm with:
  ```bash
  npm login
  npm publish --access public
  ```

## Contribution

Feel free to open issues or submit pull requests on [GitHub](https://github.com/Subhajitincareer/mern-server-setup).

## License

MIT License  
© 2025 Subhajit Pal
