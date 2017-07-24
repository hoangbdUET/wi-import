'use strict';

let hashDir = require('./source/hash-dir');
let extractLAS2 = require("./source/extractors/las2/las2-extractor");
let extractASC = require("./source/extractors/ascii/ascii-extractor");
let extractCSV = require("./source/extractors/csv/csv-extractor");
let decoding = require("./source/extractors/crypto-file/decrypto");
module.exports.setBasePath = function(path) {
    extractLAS2.setBasePath(path);
    extractASC.setBasePath(path);
};

module.exports.getBasePath = function (path) {
    return extractLAS2.getBasePath();
};

module.exports.extractLAS2 = function (inputURL, callback, options) {
    extractLAS2.extractWell(inputURL, function (result) {
        callback(result);
    }, options);
};

module.exports.deleteFile = function (inputURL) {
    extractLAS2.deleteFile(inputURL);
};

module.exports.decoding = function (inputURL, callback) {
    decoding.decoding(inputURL, function (err, data) {
        if(err) return callback(err, null);
        callback(false, data);
    });
}

module.exports.extractASC = function (inputURL, callback, options) {
    extractASC.extractFromASC(inputURL, function (result) {
        callback(result);
    }, options);
};

module.exports.extractCSV = function (inputURL, projectId, wellId) {
    extractCSV.extractFromCSV(inputURL, projectId, wellId);
};

module.exports.hashDir = hashDir;
