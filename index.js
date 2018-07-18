'use strict';

module.exports.setBasePath = function (path) {
    require('./source/extractors/common-config').dataPath = path;
};

module.exports.getBasePath = function (path) {
    return require('./source/extractors/common-config').dataPath;
};

module.exports.LASExtractor = require('./source/extractors/las/las-extractor');
module.exports.hashDir = require('./source/extractors/hash-dir');
module.exports.coreDataExtractor = require('./source/extractors/core_data/core_data-extractor');
module.exports.asciiExtractor = require('./source/extractors/ascii/ascii-extractor');
module.exports.extractFromCSV = require('./source/extractors/csv/csv-extractor').extractFromCSV;
