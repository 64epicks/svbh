const express = require('express');

var api = express.Router();

api.use(function(req, res, next) {
    console.log('API ' + req.method + ' ' + req.url + ' TOKEN ' + req.headers.token);
    next();
});

const auth = require('./auth');
api.use('/auth', auth);
const user = require('./user');
api.use('/user', user);

module.exports = api;