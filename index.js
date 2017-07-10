'use strict';

let las2Extractor = require("./source/extractors/las2/las2-extractor");
let ascExtract = require("./source/extractors/ascii/ascii-extractor");

module.exports.lasExtract = function (inputURL, projectId, wellId) {
    las2Extractor.extractWell(inputURL, projectId, wellId, function (result) {
        console.log('Read finished', result);
    })
};

module.exports.ascExtract = function (inputURL, projectId, wellId) {
    ascExtract.extractFromASC(inputURL, projectId, wellId, function (result) {
        console.log('Read finished', result)
    })
};