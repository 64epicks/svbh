const mysql_p = require('mysql');
const config  = require('./config');
const util    = require('util');

var mysql = mysql_p.createConnection({
    host        : config.sql_host,
    user        : config.sql_user,
    password    : config.sql_pass,
    database    : config.sql_db
});

mysql.connect(function (err) {
    if (err) {
        console.error("Mysql connection error: " + err.stack);
        process.exit();
    }
    console.log("Connected to " + config.sql_host);
})

const query = util.promisify(mysql.query).bind(mysql);

module.exports = {
    query: query
};