'use strict';

let extractor = require('./csv-extractor');
let urls = [
  '../../../sample-data/csv/ExportTopsToColumns.csv',
  '../../../sample-data/csv/ExportTopsToColumns_Top.csv',
  '../../../sample-data/csv/ExportTopsToColumns_Zone.csv',
  '../../../sample-data/csv/ExportTopsToRows.csv',
  '../../../sample-data/csv/ExportTopsToSingleColumn.csv',
];

urls.forEach(function (url) {
    extractor.extractFromCSV(url, 'projectId', 'wellId');
});
