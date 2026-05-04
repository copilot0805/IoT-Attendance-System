const express = require('express');
const {
    postEnrollUserAPI,
    updatePhotoAPI,
    deleteUser,
} = require('../controllers/adminController');

const { 
    createShift, getAllShifts, updateShift, deleteShift, 
    assignUserShift, getRoster, removeUserShift, assignBulkUserShifts 
} = require('../controllers/shiftController');

const { handleLogin } = require('../controllers/userController');
const { auth, checkRole } = require('../middleware/auth');
const uploadPhoto = require('../middleware/uploadPhoto');
const { postAttendanceAPI, getTimesheetsAPI, getAttendanceLogsAPI } = require('../controllers/attendanceController');

const routerAPI = express.Router();

routerAPI.post('/attendance', express.raw({ type: ['image/jpeg', 'application/octet-stream', '*/*'], limit: '10mb' }), postAttendanceAPI);

routerAPI.post('/login', handleLogin);
routerAPI.post('/users/login', handleLogin);

routerAPI.use(auth);

routerAPI.post('/users/enroll', checkRole(['ADMIN']), uploadPhoto.single('photo'), postEnrollUserAPI);
routerAPI.put('/users/:id', checkRole(['ADMIN']), uploadPhoto.single('photo'), updatePhotoAPI);
routerAPI.delete('/users/:id', checkRole(['ADMIN']), deleteUser);

routerAPI.get('/timesheets', getTimesheetsAPI);
routerAPI.get('/attendance/logs', getAttendanceLogsAPI);

// Bảng Shifts
routerAPI.get('/shifts', getAllShifts);
routerAPI.post('/shifts', checkRole(['ADMIN']), createShift);      
routerAPI.put('/shifts/:id', checkRole(['ADMIN']), updateShift);
routerAPI.delete('/shifts/:id', checkRole(['ADMIN']), deleteShift);

// Bảng User_Shifts
routerAPI.post('/user-shifts', assignUserShift);
routerAPI.get('/user-shifts', getRoster);
routerAPI.delete('/user-shifts', removeUserShift);
routerAPI.post('/user-shifts/bulk', checkRole(['ADMIN']), assignBulkUserShifts);

module.exports = routerAPI;