const express = require('express');
const {
    postEnrollUserAPI,
} = require('../controllers/adminController');
const { handleLogin } = require('../controllers/userController');
const { auth, checkRole } = require('../middleware/auth');
const uploadPhoto = require('../middleware/uploadPhoto');

const routerAPI = express.Router();

routerAPI.all("*", auth) // Apply auth middleware to all routes in this router
routerAPI.post('/login', handleLogin);
routerAPI.post('/users/login', handleLogin); // alias cho client gửi theo mẫu /v1/api/users/login

routerAPI.post('/users/enroll', checkRole(['ADMIN']), uploadPhoto.single('photo'), postEnrollUserAPI);


module.exports = routerAPI;