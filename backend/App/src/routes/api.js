const express = require('express');
const {
    postEnrollUserAPI,
    updatePhotoAPI,
    deleteUser,
    getUsersAPI
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



routerAPI.post(
    '/verify-face', 
    express.raw({ type: ['image/jpeg', 'application/octet-stream'], limit: '10mb' }), 
    postAttendanceAPI
);
routerAPI.post('/login', handleLogin);
routerAPI.post('/users/login', handleLogin);

routerAPI.use(auth);

// --- Quản lý Users ---
routerAPI.get('/users', checkRole(['ADMIN']), getUsersAPI);
routerAPI.post('/users/enroll', checkRole(['ADMIN']), uploadPhoto.single('photo'), postEnrollUserAPI);
routerAPI.put('/users/:id', checkRole(['ADMIN']), uploadPhoto.single('photo'), updatePhotoAPI);
routerAPI.delete('/users/:id', checkRole(['ADMIN']), deleteUser);

// --- Lịch sử Chấm công & Bảng công ---
routerAPI.get('/timesheets', getTimesheetsAPI);
routerAPI.get('/attendance/logs', getAttendanceLogsAPI);

// --- Quản lý Ca làm việc (Shifts) ---
routerAPI.get('/shifts', getAllShifts);
routerAPI.post('/shifts', checkRole(['ADMIN']), createShift);      
routerAPI.put('/shifts/:id', checkRole(['ADMIN']), updateShift);
routerAPI.delete('/shifts/:id', checkRole(['ADMIN']), deleteShift);

// --- Quản lý Xếp ca (User_Shifts) ---
routerAPI.post('/user-shifts', checkRole(['ADMIN']), assignUserShift);
routerAPI.get('/user-shifts', getRoster); // Mọi người đều có quyền xem lịch trực chung
routerAPI.delete('/user-shifts', checkRole(['ADMIN']), removeUserShift);
routerAPI.post('/user-shifts/bulk', checkRole(['ADMIN']), assignBulkUserShifts);

module.exports = routerAPI;