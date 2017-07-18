'use strict';
let extractor = require('./las2-extractor.js');
let url = '../../../sample-data/las-2.0/Las2_W4.las';

extractor.setBasePath('./data');
extractor.extractWell(url, function(result) {
    console.log("Well log sections extracted:", JSON.stringify(result, null, 2));
}, {
    label:"Las 2"
}); //done

//extractor.extractCurves(url, 'project1', 'well1'); //done

