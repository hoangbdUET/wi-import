let wlogExtractor = require('../../wlog/wlog-extractor.js');
let url = process.argv[2];

wlogExtractor.extractWellFromLAS3(url); //done
wlogExtractor.extractCurvesFromLAS(url); //done


