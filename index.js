let extractor = require("./source/extractors/las2/las2-extractor");

module.exports.extract = function (inputURL, projectId, wellId) {
    extractor.extractWell(inputURL,projectId, wellId, function (result) {
        console.log('Read finished', result);
    })
};