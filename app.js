'use strict';

var config    = require('./config');

var fs        = require('fs');
var http      = require('http');
var https     = require('https');

const express    = require('express');
const bodyparser = require('body-parser');
const api        = require('./api/api');

var app = express();

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());

app.use(express.static('html'));
app.use('/css', express.static('css'));
app.use('/code', express.static('js'));
app.use('/content', express.static('assets'));

app.use('/api', api);

var http_server = http.createServer(app);
http_server.listen(config.port);
console.log('HTTP socket opened on port ' + config.port);

if (config.use_https) {
    var cert = fs.readFileSync(config.https_certificate, 'utf8');
    var priv = fs.readFileSync(config.https_privkey, 'utf8');
    var cred = {key: priv, cert: cert};

    var https_server = https.createServer(cred, app);
    https_server.listen(config.https_port);
    console.log('HTTPS socket opened on port ' + config.https_port);
}