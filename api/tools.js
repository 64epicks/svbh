const db = require('../db');

function makestring(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
function makeid(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
async function user_access_id(token) {
    try {
        if (token == undefined)
            return undefined;
        var result = await db.query("SELECT * FROM tokens WHERE token = ?", [token]);
        if (result.length == 0) {
            return undefined;
        }
        if (result[0].expire < Math.floor(new Date() / 1000) && result[0].expire != 0) {
            return undefined;
        }
        return result[0].userid;
    }
    catch (err) {
        console.error(err);
        return undefined;
    }
}
async function user_club_id(userid) {
    try {
        if (userid == undefined)
            return undefined;
        var result = await db.query("SELECT club FROM users WHERE id = ?", [userid]);
        if (result.length == 0)
            return undefined;
        return result[0].club;
    }
    catch (err) {
        return undefined;
    }
}

async function user_info(userid) {
    try {
        if (userid == undefined)
            return undefined;
        var result = await db.query("SELECT * FROM users WHERE id = ?", [userid]);
        if (result.length == 0)
            return undefined;
        return result[0];
    }
    catch (err) {
        return undefined;
    }
}
async function user_info_token(token) {
    return await user_info(await user_access_id(token));
}
async function club_info(clubid) {
    try {
        if (clubid == undefined)
            return undefined;
        var result = await db.query("SELECT * FROM clubs WHERE id = ?", [clubid]);
        if (result.length == 0)
            return undefined;
        return result[0];
    }
    catch (err) {
        return undefined;
    }
}
async function club_info_userid(userid) {
    return await club_info(await user_club_id(userid));
}
async function club_info_token(token) {
    return await club_info(await user_club_id(await user_access_id(token)));
}

module.exports = {
    makestring,
    makeid,

    user_access_id,
    user_club_id,

    user_info,
    user_info_token,
    club_info,
    club_info_userid,
    club_info_token
};