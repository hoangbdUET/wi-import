'use strict';

let extractLAS2 = require("./source/extractors/las2/las2-extractor");
let extractLAS3 = require("./source/extractors/las3/las3-extractor");
let extractASC = require("./source/extractors/ascii/ascii-extractor");
let extractCSV = require("./source/extractors/csv/csv-extractor");
let decoding = require("./source/extractors/crypto-file/decrypto");
module.exports.setBasePath = function (path) {
    require('./source/extractors/common-config').dataPath = path;
};

module.exports.getBasePath = function (path) {
    return require('./source/extractors/common-config').dataPath;
};

module.exports.extractInfoOnly = function (inputURL, callback) {
    //console.log("Get info LAS only");
    extractLAS2.getLASVersion(inputURL, function (err, result) {
        if (err) return callback(err, null);
        if (result.lasVersion == 2) {
            console.log("GET INFO ONLY LAS 2");
            extractLAS2.extractWell(inputURL, function (err, result) {
                if (err) return callback(err, null);
                callback(false, result);
            })
        } else if (result.lasVersion == 3) {
            console.log("GET INFO ONLY LAS 3");
            // extractLAS3.extractInfoOnly(inputURL, function (err, result) {
            //     if (err) {
            //         callback(err, null);
            //     } else {
            //         callback(false, result);
            //     }
            // });
            callback('LAS3', null);
        }
    });
}


module.exports.deleteFile = function (inputURL) {
    extractLAS2.deleteFile(inputURL);
};

module.exports.decoding = function (data) {
    return decoding.decoding(data);
};

module.exports.extractASC = function (inputURL, callback, options) {
    extractASC.extractFromASC(inputURL, function (result) {
        callback(result);
    }, options);
};


module.exports.LASExtractor = require('./source/extractors/las/las-extractor');

module.exports.extractCSV = function (inputURL, projectId, wellId) {
    extractCSV.extractFromCSV(inputURL, projectId, wellId);
};

module.exports.hashDir = require('./source/extractors/hash-dir');;
