'use strict';

let extractLAS2 = require("./source/extractors/las2/las2-extractor");
let extractASC = require("./source/extractors/ascii/ascii-extractor");
let extractCSV = require("./source/extractors/csv/csv-extractor");

module.exports.extractLAS2 = function (inputURL, projectId, wellId) {
    extractLAS2.extractWell(inputURL, projectId, wellId, function (result) {
        console.log('Read finished', result);
    })
};

module.exports.extractASC = function (inputURL, projectId, wellId) {
    extractASC.extractFromASC(inputURL, projectId, wellId, function (result) {
        console.log('Read finished', result)
    })
};

module.exports.extractCSV = function (inputURL, projectId, wellId) {
    extractCSV.extractFromCSV(inputURL, projectId, wellId);
};