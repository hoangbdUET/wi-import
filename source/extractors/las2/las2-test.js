'use strict';
let extractor = require('./las2-extractor.js');
let url = process.argv[2];

extractor.extractWell(url, 'project1', 'well1', function(result) {
    console.log("Well log sections extracted:", result);
}); //done

//extractor.extractCurves(url, 'project1', 'well1'); //done

