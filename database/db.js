import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = process.env.NODE_ENV === 'production'
  ? '/tmp/data'
  : path.join(__dirname, '../data');

const dbPath = path.join(dataDir, 'users.json');

export const initializeDB = () => {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize database file
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify({ users: [], nextId: 1 }));
    }
    console.log('✅ Database initialized at:', dbPath);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

const readDB = () => {
  if (!fs.existsSync(dbPath)) {
    return { users: [], nextId: 1 };
  }
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
};

const writeDB = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

export const createUser = (username, password, publicKey, privateKey) => {
  const db = readDB();
  const user = {
    id: db.nextId,
    username,
    password,
    publicKey,
    privateKey,
    createdAt: Date.now()
  };
  db.users.push(user);
  db.nextId++;
  writeDB(db);
  return user.id;
};

export const getUserByUsername = (username) => {
  const db = readDB();
  return db.users.find(u => u.username === username);
};

export const getUserById = (id) => {
  const db = readDB();
  return db.users.find(u => u.id === parseInt(id));
};

export const getAllUsers = () => {
  const db = readDB();
  return db.users.map(({ id, username, publicKey, createdAt }) => ({
    id,
    username,
    publicKey,
    createdAt
  }));
};

export const searchUsers = (query) => {
  const db = readDB();
  return db.users
    .filter(u => u.username.toLowerCase().includes(query.toLowerCase()))
    .map(({ id, username, publicKey, createdAt }) => ({
      id,
      username,
      publicKey,
      createdAt
    }));
};

export default { initializeDB, createUser, getUserByUsername, getUserById, getAllUsers, searchUsers };
