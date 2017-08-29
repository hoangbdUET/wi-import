'use strict';
let extractor = require('./las2-extractor.js');
//let url = '../../../sample-data/las-2.0/Las_20.las';
//let url = '../../../sample-data/las-2.0/1X_geolog_2.0.las';
//let url = '../../../sample-data/las-2.0/1X_IP_20.las';
let url = '../../../sample-data/las-2.0/1X_Techlog_20.las';
//let url = '../../../sample-data/las-2.0/1X_WI_20.las';

extractor.setBasePath('./data');
extractor.extractAll(url, function(err, result) {
    if(err) return console.log(err);
    console.log("Well log sections extracted:", JSON.stringify(result, null, 2));

}); //done

//extractor.extractCurves(url, 'project1', 'well1'); //done




