const express = require('express');
const {
    postEnrollUserAPI,
    updatePhotoAPI,
    deleteUser,
} = require('../controllers/adminController');
const { handleLogin } = require('../controllers/userController');
const { auth, checkRole } = require('../middleware/auth');
const uploadPhoto = require('../middleware/uploadPhoto');
const { postAttendanceAPI, getTimesheetsAPI, getAttendanceLogsAPI } = require('../controllers/attendanceController');

const routerAPI = express.Router();

routerAPI.post('/attendance', express.raw({ type: ['image/jpeg', 'application/octet-stream', '*/*'], limit: '10mb' }), postAttendanceAPI);
routerAPI.get('/timesheets', getTimesheetsAPI);
routerAPI.get('/attendance/logs', getAttendanceLogsAPI);

routerAPI.all("*", auth) // Apply auth middleware to all routes in this router
routerAPI.post('/login', handleLogin);
routerAPI.post('/users/login', handleLogin);

routerAPI.post('/users/enroll', checkRole(['ADMIN']), uploadPhoto.single('photo'), postEnrollUserAPI);
routerAPI.put('/users/:id', checkRole(['ADMIN']), uploadPhoto.single('photo'), updatePhotoAPI);
routerAPI.delete('/users/:id', checkRole(['ADMIN']), deleteUser);
module.exports = routerAPI;