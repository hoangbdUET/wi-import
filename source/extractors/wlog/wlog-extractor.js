'use strict';

let LAS2Extractor = require('../las2-extractor');
// let CSVExtractor = require('../csv-extractor');
let ASCExtractor = require('../ascii-extractor');

module.exports.extractCurvesFromLAS = LASExtractor.extractCurvesFromLAS;
module.exports.extractWellFromLAS2 = LASExtractor.extractWellFromLAS2;
module.exports.extractWellFromLAS3 = LASExtractor.extractWellFromLAS3;
module.exports.extractFromASC = ASCExtractor.extractFromASC;
//
// module.exports.extractCurvesFromCSV = CSVExtractor.extractCurves;
