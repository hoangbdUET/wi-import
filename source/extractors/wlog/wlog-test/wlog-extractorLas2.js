'use strict';
let wlogExtractor = require('../../wlog/wlog-extractor.js');
let url = process.argv[2];

wlogExtractor.extractWellFromLAS2(url, function(result) {
    console.log("Well log sections extracted:", result);
}); //done
//wlogExtractor.extractCurvesFromLAS(url); //done


