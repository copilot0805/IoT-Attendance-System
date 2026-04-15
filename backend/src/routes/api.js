const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    getUsersAPI,
    postCreateUserAPI,
    postEnrollUserAPI,
    putUpdateUserAPI,
    deleteUserAPI
} = require('../controllers/adminController');
const { handleLogin } = require('../controllers/userController');

const uploadDir = path.join(__dirname, '../uploads/face_enroll');
fs.mkdirSync(uploadDir, { recursive: true });
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const routerAPI = express.Router();

routerAPI.post('/login', handleLogin);
routerAPI.post('/users/login', handleLogin); // alias cho client gửi theo mẫu /v1/api/users/login
// routerAPI.get('/users', getUsersAPI);
// routerAPI.post('/users', postCreateUserAPI);
routerAPI.post('/users/enroll', uploadMemory.single('photo'), postEnrollUserAPI);
// routerAPI.put('/users/:id', putUpdateUserAPI);
// routerAPI.delete('/users/:id', deleteUserAPI);

module.exports = routerAPI;