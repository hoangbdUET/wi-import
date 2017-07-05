let wlogExtractor = require('./wlog-extractor');
let url = process.argv[2];

//wlogExtractor.extractCurvesFromLAS(url); //done

//wlogExtractor.extractWellFromLAS2(url); //done

//wlogExtractor.extractWellFromLAS3(url); //done

wlogExtractor.extractFromASC(url);