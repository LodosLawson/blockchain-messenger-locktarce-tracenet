import fs from 'fs';
import path from 'path';
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

export default { createUser, getUserByUsername, getUserById, getAllUsers, searchUsers };
