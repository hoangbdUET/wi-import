'use strict';

let hashDir = require('./source/hash-dir');
let extractLAS2 = require("./source/extractors/las2/las2-extractor");
let extractASC = require("./source/extractors/ascii/ascii-extractor");
let extractCSV = require("./source/extractors/csv/csv-extractor");

module.exports.setBasePath = function(path) {
    extractLAS2.setBasePath(path);
}

module.exports.extractLAS2 = function (inputURL, callback, options) {
    extractLAS2.extractWell(inputURL, function (result) {
        callback(result);
    }, options);
};

module.exports.extractASC = function (inputURL, projectId, wellId) {
    extractASC.extractFromASC(inputURL, projectId, wellId, function (result) {
        console.log('Read finished', result)
    })
};

module.exports.extractCSV = function (inputURL, projectId, wellId) {
    extractCSV.extractFromCSV(inputURL, projectId, wellId);
};

module.exports.hashDir = hashDir;
