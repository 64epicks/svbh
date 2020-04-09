const express   = require('express');
const bcrypt    = require('bcrypt');
const cron      = require('node-cron');
const db        = require('../db');
const tools     = require('./tools');

var router = express.Router();

const default_expire_time = 31556952; // ~ 1 year
const cleanup_interval = '*/10 * * * *';
const email_regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Clean up expired tokens
cron.schedule(cleanup_interval, function () {
    console.log('Cleaning up tokens...');
    db.query("DELETE FROM tokens WHERE expire < ? AND expire != 0", [Math.floor(new Date() / 1000)]);
    console.log('Next cleanup will be in 10 min');
});

// User login / logout
router.post('/authorize', function (req, res) {
    (async () => {
        try {
            var result;
            // Check that all values needed to authenticate are provided
            if ((req.body.user == undefined && req.body.email == undefined) || req.body.password == undefined || req.body.expire == undefined) {
                res.status(400);
                res.json({ message: "Missing param" });
                res.end();
                return;
            }
            // Get the expiretime
            let ctime = Math.floor(new Date() / 1000);
            let expire = parseInt(req.body.expire);
            if (expire == NaN) {
                res.status(400);
                res.json({ message: 'Invalid format for "expire"' });
                res.end();
                return;
            }
            if (expire == 0)
                ctime += default_expire_time;
            else
                ctime += expire;
            // Try to find the user in question
            if (req.body.user != undefined && req.body.email != undefined) {
                res.status(400);
                res.json({ message: '"user" and "email" can not be defined at the same time' });
                res.end();
                return;
            }
            var idq;
            var rvar;
            if (req.body.user != undefined) {
                idq = 'SELECT * FROM users WHERE username = ? AND flags NOT LIKE "%deactivated%"';
                rvar = req.body.user;
            }
            else {
                idq = 'SELECT * FROM users WHERE email = ? AND flags NOT LIKE "%deactivated%"';
                rvar = req.body.email;
            }
            var user;
            result = await db.query(idq, [rvar]);
            if (result.length == 0) {
                res.status(401);
                res.json({ message: 'Invalid credentials' });
                res.end();
                return;
            }
            user = result[0];

            // Hash the password provided along with the salt stored in the database and check if it matches
            if (!bcrypt.compareSync(req.body.password, user.hash)) {
                res.status(401)
                res.json({ message: 'Invalid credentials' });
                res.end();
                return;
            }

            // Generate the "care package" with the token
            var tokenreq = {
                token: undefined,
                userid: user.id,
                expire: ctime
            }
            // Generate a unique token
            while (true) {
                tokenreq.token = tools.makestring(40);
                result = await db.query("SELECT * FROM tokens WHERE token = ?", [tokenreq.token]);
                if (result.length == 0)
                    break;
            }

            // Insert the new token 
            await db.query("INSERT INTO tokens (token, userid, expire) VALUES (?, ?, ?)", [tokenreq.token, tokenreq.userid, tokenreq.expire]);

            res.status(200);
            res.json(tokenreq);
            res.end();
            return;
        }
        catch (err) {
            console.error(err);
            res.status(500);
            res.json({ message: "Internal server error" });
            res.end();
            return;
        }
    })()
});
// Refresh token
router.post('/refresh', function (req, res) {
    (async () => {
        try {
            // Check that the token is provided
            if (req.headers.token == undefined) {
                res.status(400);
                res.json({ message: "Missing token" });
                res.end();
                return;
            }
            // Check the validity of the token
            let userid = await tools.user_access_id(req.headers.token);
            if (userid == undefined) {
                res.status(400);
                res.json({ message: "Invalid token" });
                res.end();
                return;
            }
            // Check that "expire" is present
            if (req.body.expire == undefined) {
                res.status(400);
                res.json({ message: '"expire" variable missing' });
                res.end();
                return;
            }
            let ctime = Math.floor(new Date() / 1000);
            let expire = parseInt(req.body.expire);
            if (expire == NaN) {
                res.status(400);
                res.json({ message: 'Invalid format for "expire"' });
                res.end();
                return;
            }
            if (expire == 0)
                ctime += default_expire_time;
            else
                ctime += expire;
            
            db.query("UPDATE tokens SET expire = ? WHERE token = ?", [ctime, req.headers.token]);

            res.status(200);
            res.json({
                token: req.headers.token,
                userid: userid,
                expire: ctime
            });
            res.end();
            return;
        }
        catch (err) {
            console.error(err);
            res.status(500);
            res.json({ message: "Internal server error" });
            res.end();
            return;
        }
    })();
})
// Revoke token
router.get('/revoke', function (req, res) {
    (async () => {
        try {
            // Check that the token is provided
            if (req.headers.token == undefined) {
                res.status(400);
                res.json({ message: "Missing token" });
                res.end();
                return;
            }
            // Delete the token from db (if it exists)
            db.query("DELETE FROM tokens WHERE token = ?", [req.headers.token]);
            res.status(200);
            res.end();
            return;
        }
        catch (err) {
            console.error(err);
            res.status(500);
            res.json({ message: "Internal server error" });
            res.end();
            return;
        }
    })()
});

// Club create/delete
// Remember that clubs are deactivated by default (to prevent misuse) and need to be activated manually
// TODO: create a stricter username and password policy
router.post('/club/create', function (req, res) {
    (async () => {
        try {
            var result;
            // Check that the name is free
            if (req.body.name == undefined) {
                res.status(400);
                res.json({ message: 'Missing "name"' });
                res.end();
                return;
            }
            result = await db.query('SELECT * FROM clubs WHERE name = ? AND flags NOT LIKE "%deactivated%"', [req.body.name]);
            if (result.length > 0) {
                res.status(400);
                res.json({ message: "Club exists already" });
                res.end();
                return;
            }
            // Check that the user information is provided
            if (req.body.username == undefined || req.body.fullname == undefined || req.body.email == undefined || req.body.password == undefined) {
                res.status(400);
                res.json({ message: "Missing param" });
                res.end();
                return;
            }
            // Test that the email is correctly formatted
            if (!email_regex.test(req.body.email)) {
                res.status(400);
                res.json({ message: "Email not valid" });
                res.end();
                return;
            }
            // Check that the email or username isn't in use
            result = await db.query("SELECT * FROM users WHERE username = ?", [req.body.username]);
            if (result.length > 0) {
                res.status(400);
                res.json({ message: "Username already taken" });
                res.end();
                return;
            }
            result = await db.query("SELECT * FROM users WHERE email = ?", [req.body.email]);
            if (result.length > 0) {
                res.status(400);
                res.json({ message: "Email already in use" });
                res.end();
                return;
            }
            // If all good, create the user
            // Generate id for the club
            let clubid;
            while (true) {
                clubid = tools.makeid(10000, 99999);
                result = await db.query("SELECT * FROM clubs WHERE id = ?", [clubid]);
                if (result.length == 0)
                    break;
            }
            var user = {
                id: undefined,
                username: req.body.username,
                fullname: req.body.fullname,
                email: req.body.email,
                hash: undefined,
                club: clubid,
                flags: "deactivated"
            }
            while (true) {
                user.id = tools.makeid(10000, 99999);
                result = await db.query("SELECT * FROM users WHERE id = ?", [user.id]);
                if (result.length == 0)
                    break;
            }
            user.hash = bcrypt.hashSync(req.body.password, 10);

            // Insert user into database
            await db.query("INSERT INTO users (id, username, fullname, email, hash, club, flags) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [user.id, user.username, user.fullname, user.email, user.hash, user.club, user.flags]);

            var club = {
                id: clubid,
                name: req.body.name,
                members: 1,
                ownerid: user.id,
                flags: "deactivated",
                clubcode: undefined
            }
            while (true) {
                club.clubcode = tools.makestring(10);
                result = await db.query("SELECT * FROM clubs WHERE clubcode = ?", [club.clubcode]);
                if (result.length == 0)
                    break;
            }
            await db.query("INSERT INTO clubs (id, name, members, ownerid, flags, clubcode) VALUES (?, ?, ?, ?, ?, ?)",
                [club.id, club.name, club.members, club.ownerid, club.flags, club.clubcode]);

            res.status(200);
            res.end();
            return;
        }
        catch (err) {
            console.error(err);
            res.status(500);
            res.json({ message: "Internal server error" });
            res.end();
            return;
        }
    })()
});

// User create / delete
router.post('/register', function (req, res) {
    (async () => {
        try {
            var result;
            // Check that the user information is provided
            if (req.body.clubcode == undefined || req.body.username == undefined || req.body.fullname == undefined || req.body.email == undefined || req.body.password == undefined) {
                res.status(400);
                res.json({ message: "Missing param" });
                res.end();
                return;
            }
            // Test that the email is correctly formatted
            if (!email_regex.test(req.body.email)) {
                res.status(400);
                res.json({ message: "Email not valid" });
                res.end();
                return;
            }
            // Check that the email or username isn't in use
            result = await db.query("SELECT * FROM users WHERE username = ?", [req.body.username]);
            if (result.length > 0) {
                res.status(400);
                res.json({ message: "Username already taken" });
                res.end();
                return;
            }
            result = await db.query("SELECT * FROM users WHERE email = ?", [req.body.email]);
            if (result.length > 0) {
                res.status(400);
                res.json({ message: "Email already in use" });
                res.end();
                return;
            }
            // Check that the clubcode is valid
            result = await db.query('SELECT * FROM clubs WHERE clubcode = ? AND flags NOT LIKE "%deactivated%"', [req.body.clubcode]);
            if (result.length == 0) {
                res.status(400);
                res.json({ message: "Invalid clubcode" });
                res.end();
                return;
            }
            var club = result[0];
            var user = {
                id: undefined,
                username: req.body.username,
                fullname: req.body.fullname,
                email: req.body.email,
                hash: undefined,
                club: club.id,
                flags: ""
            }
            while (true) {
                user.id = tools.makeid(10000, 99999);
                result = await db.query("SELECT * FROM users WHERE id = ?", [user.id]);
                if (result.length == 0)
                    break;
            }
            user.hash = bcrypt.hashSync(req.body.password, 10);

            db.query("INSERT INTO users (id, username, fullname, email, hash, club, flags) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [user.id, user.username, user.fullname, user.email, user.hash, user.club, user.flags]);
            db.query("UPDATE clubs SET members = members + 1 WHERE id = ?", [club.id]);

            res.status(200);
            res.end();
            return;
        }
        catch (err) {
            console.error(err);
            res.status(500);
            res.json({ message: "Internal server error" });
            res.end();
            return;
        }
    })()
});
router.get('/delete', function (req, res) {
    (async () => {
        try {
            var result;
            if (req.headers.token == undefined) {
                res.status(400);
                res.json({ message: "Missing token" });
                res.end();
                return;
            }
            let userid = await tools.user_access_id(req.headers.token);
            if (userid == undefined) {
                res.status(400);
                res.json({ message: "Invalid token" });
                res.end();
                return;
            }
            let clubid = await tools.user_club_id(userid);
            if (clubid == undefined) {
                throw "Unknown exception: tools.user_club_id returned undefined with user id " + userid;
            }
            result = await db.query("SELECT * FROM clubs WHERE id = ?", [clubid]);
            if (result.length == 0) {
                throw "Unknown exception: no club exist with id " + clubid + " given by user id " + userid;
            }
            var club = result[0];
            if (club.ownerid == userid) {
                res.status(400);
                res.json({ message: "Owner of a club must transfer ownership before deleting their account" });
                res.end();
                return;
            }

            db.query("DELETE FROM tokens WHERE userid = ?", [userid]);
            db.query("DELETE FROM users WHERE id = ?", [userid]);
            db.query("UPDATE clubs SET members = members - 1 WHERE id = ? AND members > 0", [clubid]);

            res.status(200);
            res.end();
            return;
        }
        catch (err) {
            console.error(err);
            res.status(500);
            res.json({ message: "Internal server error" });
            res.end();
            return;
        }
    })()
});

module.exports = router;