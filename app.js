'use strict';

var config    = require('./config');

var fs        = require('fs');
var http      = require('http');
var https     = require('https');

const express = require('express');
const mysql_p   = require('mysql');

var app = express();

var mysql = mysql_p.createConnection({
    host        : config.sql_host,
    user        : config.sql_user,
    password    : config.sql_pass
});

mysql.connect(function (err) {
    if (err) {
        console.error("Mysql: " + err.stack);
        process.exit();
    }
    console.log("Connected to " + config.sql_host);
})

app.use(express.static('html'));
app.use('/css', express.static('css'));
app.use('/code', express.static('js'));
app.use('/content', express.static('assets'));

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