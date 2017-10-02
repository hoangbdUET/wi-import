'use strict';
let extractor = require('./ascii-extractor');
//let url = '../../../sample-data/csv/ASCII Forrmat 1.csv';
//let url = '../../../sample-data/csv/ASCII Forrmat 2.csv';
//let url = '../../../sample-data/csv/ASCII Forrmat 3.csv';
//let url = '../../../sample-data/csv/ASCII Forrmat 4.csv';
let url = '../../../sample-data/ascii/02_97_DD_1X_test.asc';
//let url = '../../../sample-data/ascii/Merge_File.asc';

extractor.extractFromASC(url, function (result) {
    console.log(JSON.stringify(result, null, 2));
}); //done
