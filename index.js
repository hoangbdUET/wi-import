'use strict';

let extractASC = require("./source/extractors/ascii/ascii-extractor");
let extractCSV = require("./source/extractors/csv/csv-extractor");
let decoding = require("./source/extractors/crypto-file/decrypto");
module.exports.setBasePath = function (path) {
    require('./source/extractors/common-config').dataPath = path;
};

module.exports.getBasePath = function (path) {
    return require('./source/extractors/common-config').dataPath;
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
