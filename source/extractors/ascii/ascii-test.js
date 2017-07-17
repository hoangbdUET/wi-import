'use strict';
let extractor = require('./ascii-extractor');
let url = '../../../sample-data/ascii/02_97_DD_1X.asc';

extractor.extractFromASC(url, 'project1', function (result) {
    console.log(result);
}); //done
