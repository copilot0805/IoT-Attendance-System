const express = require('express');
const {
    getUsersAPI,
    postCreateUserAPI,
    putUpdateUserAPI,
    deleteUserAPI
} = require('../controllers/apiController');

const routerAPI = express.Router();

// routerAPI.get('/users', getUsersAPI);
// routerAPI.post('/users', postCreateUserAPI);
// routerAPI.put('/users/:id', putUpdateUserAPI);
// routerAPI.delete('/users/:id', deleteUserAPI);

module.exports = routerAPI;