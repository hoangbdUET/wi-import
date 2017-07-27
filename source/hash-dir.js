'use strict';
var crypto = require('crypto');
var fs = require('fs');
var byline = require('byline');
var Transform = require('stream').Transform;
const LEN = 8;
var decrypto = require('./extractors/crypto-file/decrypto');
let async = require('async');
function createDirSync(basePath, hash, dir) {
    dir.push(hash.substr(0, LEN));
    try {
        fs.mkdirSync(basePath + '/' + dir.join('/'));
    }
    catch (err) {
        if (err.errno !== -17) {
            console.log(err);
        }
    }
    return hash.substr(LEN);
}

function createDir(basePath, hash, dirs) {
    dirs.push(hash.substr(0, LEN));
    hash = hash.substr(LEN);
    fs.mkdir(basePath + "/" + dirs.join('/'), function (err) {
        if (err && (err.errno != -17)) {
            console.log(err);
        }
        else if (hash.length > 0) {
            createDir(basePath, hash, dirs);
        }
    });
}

module.exports.createWriteStream = function (basePath, hashString, fileName) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(hashString);
    var hash = md5sum.digest('hex');
    var dirs = [];

    while (hash.length > 0) {
        hash = createDirSync(basePath, hash, dirs);
    }

    return fs.createWriteStream(basePath + '/' + dirs.join('/') + '/' + fileName, {flags: 'w'});
}

function createPath(basePath, hashString, fileName) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(hashString);
    var hash = md5sum.digest('hex');
    var dirs = [];

    while (hash.length > 0) {
        hash = createDirSync(basePath, hash, dirs);
    }
    return basePath + '/' + dirs.join('/') + '/' + fileName;
}

function createReadStream(basePath, hashString, fileName) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(hashString);
    var hash = md5sum.digest('hex');
    var dirs = [];

    while (hash.length > 0) {
        hash = createDirSync(basePath, hash, dirs);
    }
    console.log(basePath + '/' + dirs.join('/') + '/' + fileName);
    try {
        var stream = fs.createReadStream(basePath + '/' + dirs.join('/') + '/' + fileName, {flags: 'r'});
        return stream;
    }
    catch (err) {
        return null;
    }
}

function getHashPath(basePath, hashString, fileName) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(hashString);
    var hash = md5sum.digest('hex');
    var dirs = [];

    while (hash.length > 0) {
        hash = createDirSync(basePath, hash, dirs);
    }
    return basePath + '/' + dirs.join('/') + '/' + fileName;
}
module.exports.getHashPath = getHashPath;
module.exports.createPath = createPath;
module.exports.createReadStream = createReadStream;

module.exports.createJSONReadStream = function (basePath, hashString, fileName, beginFragment, endFragment) {
    var MyTransform = new Transform({
        writableObjectMode: true,
        transform: function (chunk, encoding, callback) {
            chunk = decoding(chunk);
            var tokens = chunk.toString().split(" ");
            if (!this._started_) {
                if (beginFragment) this.push(beginFragment);
                this.push('[' + JSON.stringify({y: tokens[0], x: tokens[1]}));
                this._started_ = true;
            }
            else {
                this.push(',\n' + JSON.stringify({y: tokens[0], x: tokens[1]}));
            }
            callback();
        },
        flush: function (callback) {
            this.push(']');
            if (endFragment) this.push(endFragment);
            callback();
        }
    });
    var readStream = createReadStream(basePath, hashString, fileName);
    if (!readStream) return null;

    return byline.createStream(readStream).pipe(MyTransform);
}

function DeCodeData(basePath, hashString, fileName, callback) {
    let url = getHashPath(basePath, hashString, fileName);
    let arr = [];
    decrypto.decoding(url, function (err, data) {
        if (err) return callback(err, null);
        let tokens = data.toString().split('\n');
        async.each(tokens, function (item, cb) {
            item = item.split(' ');
            arr.push({
                y: item[0],
                x: item[1]
            })
            cb();
        }, function (err) {
            if (err) return callback(err, null);
            callback(false, arr.slice(0, -1));
        });

    });
}
module.exports.DeCodeData = DeCodeData;