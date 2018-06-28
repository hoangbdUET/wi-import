'use strict';
var crypto = require('crypto');
var fs = require('fs');
var byline = require('byline');
var Transform = require('stream').Transform;
const LEN = 8;
var decrypto = require('./crypto-file/decrypto');
let async = require('async');

function createDirSync(basePath, hash, dir) {
    dir.push(hash.substr(0, LEN));
    try {
        fs.mkdirSync(basePath + '/' + dir.join('/'));
    }
    catch (err) {
        if (err.errno !== -17) {
            //console.log(err.message);
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
    //console.log("HASHSTRING : " + hashString);
    var md5sum = crypto.createHash('md5');
    md5sum.update(hashString);
    var hash = md5sum.digest('hex');
    var dirs = [];

    while (hash.length > 0) {
        hash = createDirSync(basePath, hash, dirs);
    }
    return basePath + '/' + dirs.join('/') + '/' + fileName;
}

function getHashPath(hashString) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(hashString);
    var hash = md5sum.digest('hex');
    var dirs = [];

    while (hash.length > 0) {
        dirs.push(hash.substr(0, LEN));
        hash = hash.substr(LEN);
    }
    return dirs.join('/') + '/';
}

function createReadStream(basePath, hashString, fileName) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(hashString);
    var hash = md5sum.digest('hex');
    var dirs = [];

    while (hash.length > 0) {
        dirs.push(hash.substr(0, LEN));
        hash = hash.substr(LEN);
    }
    // while (hash.length > 0) {
    //     hash = createDirSync(basePath, hash, dirs);
    // }
    console.log("CreateReadStream File : " + basePath + '/' + dirs.join('/') + '/' + fileName);
    var stream = fs.createReadStream(basePath + '/' + dirs.join('/') + '/' + fileName, {flags: 'r'});
    stream.on('error', function (err) {
        //handler create stream error
        console.log("CreateReadStream File err : " + err);
    })
    return stream;
}



module.exports.getHashPath = getHashPath;
module.exports.createPath = createPath;
module.exports.createReadStream = createReadStream;

function deleteFolderRecursive(path) {
    var files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

module.exports.copyFile = function (basePath, srcHashedPath, desHashedDir, fileName) {
    let result = true;
    let desPath = basePath + '/';
    while (desHashedDir.length > 0){
        desPath += desHashedDir.substr(0, desHashedDir.indexOf('/') + 1);
        desHashedDir = desHashedDir.substr(desHashedDir.indexOf('/') + 1);
        try {
            fs.mkdirSync(desPath);
        }
        catch (err) {
            if (err.errno !== -17) {
                //console.log(err.message);
            }
        }
    }

    //change this if error
    var cp = fs.createReadStream(basePath + '/' + srcHashedPath);
    cp.on('error', function (err) {
        //handler create stream error
        result = false;
        console.log("Copy File err : " + err);

    });
    cp.pipe(fs.createWriteStream(desPath + fileName));
    return result;

}

module.exports.deleteFolder = function (basePath, hashString) {
    var result = true;
    var md5sum = crypto.createHash('md5');
    md5sum.update(hashString);
    var path = basePath + '/' + md5sum.digest('hex').substr(0, 8);
    deleteFolderRecursive(path);
    console.log("Delete : " + path);
    return null;
}

module.exports.createJSONReadStream = function (basePath, hashString, fileName, beginFragment, endFragment) {
    var MyTransform = new Transform({
        writableObjectMode: true,
        transform: function (chunk, encoding, callback) {
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
    let url = createPath(basePath, hashString, fileName);
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