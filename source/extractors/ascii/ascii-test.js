'use strict';
let extractor = require('./ascii-extractor');
let url = process.argv[2];

extractor.extractFromASC(url, 'project1', 'well1', function (result) {
    console.log(result);
}); //done
