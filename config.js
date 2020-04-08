/*
    SVBH main configuration file
*/
var config = {};

// Should HTTPS be used?
// If true, all variables with the prefix 'https_' are used
config.use_https = true;
config.https_certificate = "./testcert.pem"; // These keys should only be used in testing
config.https_privkey = "./testkey.pem";

// What port to listen to
config.port       = 8080;
config.https_port = 8443;

// MySQL configuration
config.sql_host = "localhost";
config.sql_user = "myuser";
config.sql_pass = "mypass";

module.exports = config;