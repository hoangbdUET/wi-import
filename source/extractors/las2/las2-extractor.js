'use strict';
let readline = require('line-by-line');
let async = require('async');
let hashDir = require('../../hash-dir');
let CONFIG = require('../crypto-file/crypto.config').CONFIG;
let fs = require('fs');
let __config = require('../common-config');
const cryptorFile = require('file-encryptor');
let cypher = CONFIG.cypher;
let secret = CONFIG.secret;
const optionsEncode = {algorithm: cypher};

function writeToCurveFile(buffer, curveFileName, index, value, defaultNull) {
    buffer.count += 1;
    if (value == defaultNull) {
        buffer.data += index + " null" + "\n";
    }
    else {
        buffer.data += index + " " + value + "\n";
    }
    if (buffer.count >= 1000) {
        fs.appendFileSync(curveFileName, buffer.data);
        buffer.count = 0;
        buffer.data = "";
    }
}

function encoding(pathsCurve, curvesName) {
    let output;
    curvesName.forEach(function (curveName) {
        let dirs = pathsCurve[curveName].split('/');
        dirs[dirs.length - 1] = dirs[dirs.length - 1].split('.')[0];
        dirs = dirs.join('/');
        output = dirs + '.enc.txt';
        cryptorFile.encryptFile(pathsCurve[curveName], output, secret, optionsEncode, function (err) {
            if (err) return console.log(err);
            deleteFile(pathsCurve[curveName]);
        });
    });
}

function extractCurves(inputURL) {
    let rl = new readline(inputURL);
    let curvesName = new Array();
    let count = 0;
    let BUFFERS = new Object();
    let filePaths = new Object();
    let nameSection;
    let datasetName = null;
    let defaultNull = null;
    rl.on('line', function (line) {
        line = line.trim();
        line = line.toUpperCase();
        line = line.replace(/\s+\s/g, " ");
        if (/^~A|^~ASCII/.test(line)) {
            if (curvesName) {
                curvesName.forEach(function (curveName) {
                    BUFFERS[curveName] = {
                        count: 0,
                        data: ""
                    };
                    filePaths[curveName] = hashDir.createPath(__config.basePath, datasetName + curveName, curveName + '.txt');
                    fs.writeFileSync(filePaths[curveName], "");
                });
            }
        }
        else if (/^~/.test(line)) {
            nameSection = line;
        }
        else if (/^[A-z]/.test(line)) {
            if (/CURVE/.test(nameSection)) {
                line = line.replace(/([0-9]):([0-9])/g, "$1=$2");
                let dotPosition = line.indexOf('.');
                let fieldName = line.substring(0, dotPosition);
                if (/DEPTH/.test(fieldName)) {

                }
                else if (curvesName) {
                    curvesName.push(fieldName.trim());
                }
            }
            else if (/WELL/.test(nameSection)) {
                if (/WELL/.test(line)) {
                    let dotPosition = line.indexOf('.');
                    let colon = line.indexOf(':');
                    let wellString = line.substr(dotPosition + 1, colon);
                    wellString = wellString.trim();
                    datasetName = wellString;
                }
                else if (/NULL/.test(line)) {
                    let dotPosition = line.indexOf('.');
                    let colon = line.indexOf(':');
                    let nullString = line.substring(dotPosition + 1,colon);
                    nullString = nullString.trim();
                    defaultNull = nullString;
                }
            }
        }

        else if (/^[0-9][0-9]/.test(line)) {
            let spacePosition = line.indexOf(' ');
            line = line.substring(spacePosition, line.length).trim();
            let fields = line.split(" ");
            if (curvesName) {
                curvesName.forEach(function (curveName, i) {
                    writeToCurveFile(BUFFERS[curveName], filePaths[curveName], count, fields[i], defaultNull);
                });
                count++;
            }
        }
    });
    rl.on('end', function () {
        if (curvesName) {
            async.each(curvesName, function (curveName, callback) {
                fs.appendFileSync(filePaths[curveName], BUFFERS[curveName].data);
                callback();
            }, function (err) {
                if (err) return console.log("ExtractCurves has error", err);
                deleteFile(inputURL);
                //encoding(filePaths, curvesName);
                //callbackGetPaths(false, filePaths, curvesName);
            });
        }

        console.log("ExtractCurvesFromLAS done");
    });

    rl.on('error', function (err) {
        if (err) {
            console.log("ExtractCurves has error", err);
            //callbackGetPaths(err, null, null);
        }
    });
}

function getUniqueIdForDataset(sections) {
    let datasetName;
    sections.forEach(function (section) {
        if (/~WELL/.test(section.name)) {
            section.content.forEach(function (item) {
                if (item.name.trim() == "WELL") {
                    datasetName = item.data;
                }
            })
        }
    });
    return datasetName;
}

function extractWell(inputURL, callbackSections) {
    let rl = new readline(inputURL);
    let sections = new Array();
    let currentSection = null;
    let defaultNull = null;
    rl.on('line', function (line) {
        line = line.trim();
        line = line.toUpperCase();
        if (/^~A/.test(line)) { //
            // end case
            rl.close();
        }
        else if (line === '') { // skip blank line
        }
        else if (/^#/.test(line)) { // skip line with leading '#'
        }
        else if (/^~/.test(line)) { // beginning of a section
            if (currentSection) {
                sections.push(currentSection);
            }

            currentSection = new Object();
            currentSection.name = line.toUpperCase();
            currentSection.content = new Array();
        }
        else {
            if (currentSection) {
                if (/[A-z]/.test(line)) {
                    line = line.replace(/([0-9]):([0-9])/g, "$1=$2");
                    let dotPosition = line.indexOf('.');
                    let fieldName = line.substring(0, dotPosition);
                    let remainingString = line.substring(dotPosition, line.length).trim();
                    let firstSpaceAfterDotPos = remainingString.indexOf(' ');
                    let secondField = remainingString.substring(1, firstSpaceAfterDotPos);
                    remainingString = remainingString.substring(firstSpaceAfterDotPos, remainingString.length).trim();
                    let colonPosition = remainingString.indexOf(':');

                    if (colonPosition < 0) {
                        colonPosition = remainingString.length;
                    }
                    let fieldDescription = remainingString.substring(colonPosition, remainingString.length);
                    let thirdField = remainingString.substring(0, colonPosition).trim();
                    thirdField = thirdField.replace(/([0-9])=([0-9])/g, '$1:$2');
                    if (/NULL/g.test(fieldName.toUpperCase())) {
                        defaultNull = thirdField;
                    }
                    if (/^\./.test(secondField)) {
                        secondField = "";
                    }
                    currentSection.content.push({
                        name: fieldName.trim(),
                        unit: secondField.trim(),
                        data: thirdField,
                        description: fieldDescription.trim()
                    });
                }
            }
        }

    });
    rl.on('end', function () {
        if (currentSection) {
            sections.push(currentSection);
        }

        if (sections) {
            sections.forEach(function (section) {
                if (/CURVE/.test(section.name)) {
                    section.content.shift();
                }
            });
        }
        callbackSections(false, sections);
    });

    rl.on('error', function (err) {
        if (err) return callbackSections(err, null);
    })
}

function extractAll(inputURL, callbackGetSections) {
    extractCurves(inputURL);
    extractWell(inputURL, function (err, sections) {
        if (err) callbackGetSections(err, null);
        callbackGetSections(false, sections);
    });

}

function deleteFile(inputURL) {
    fs.unlink(inputURL, function (err) {
        if (err) return console.log(err);
    });
}

module.exports.extractCurves = extractCurves;
module.exports.extractWell = extractWell;
module.exports.deleteFile = deleteFile;
module.exports.extractAll = extractAll;
module.exports.setBasePath = function (basePath) {
    __config.basePath = basePath;
};

module.exports.getBasePath = function () {
    return __config.basePath;
};
