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


function getLASVersion(inputURL, callback) {
    let result = {
        lasVersion: 0,
        delimiting: "SPACE"
    }
    let section = null;
    let rl = new readline(inputURL);
    rl.on('line', function (line) {
        line = line.trim();
        line = line.toUpperCase();
        line = line.replace(/\s+\s/g, " ");
        if (/^~/.test(line)) {
            section = line;
        } else if (/^[A-z]/.test(line)) {
            if (/VERSION/.test(section)) {
                if (/VERS/.test(line)) {
                    let dotPosition = line.indexOf('.');
                    let colon = line.indexOf(':');
                    let versionString = line.substring(dotPosition + 1, colon);
                    /2/.test(versionString) ? result.lasVersion = 2 : result.lasVersion = 3;
                } else if (/DLM/.test(line)) {
                    let dotPosition = line.indexOf('.');
                    let colon = line.indexOf(':');
                    let dlmString = line.substring(dotPosition + 1, colon);
                    result.delimiting = dlmString.trim();
                }
            }
        }
    });
    rl.on('end', function () {
        callback(null, result);
    });
    rl.on('err', function (err) {
        callback(err, null);
    });
}


function extractCurves(inputURL, moreUploadData, callback) {
    // /console.log(moreUploadData.curves);
    let rl = new readline(inputURL);
    let sectionName = "";
    let datasetsName = [];
    let curves = [];
    let count = 0;
    let wellInfo = new Object();
    let filePaths = new Object();
    let BUFFERS = new Object();
    rl.on('line', function (line) {
        line = line.trim();
        line = line.toUpperCase();
        line = line.replace(/\s+\s/g, " ");

        if (/^~/.test(line)) {
            sectionName = line;
        } else if (/^[A-z]/.test(line)) {
            let hasWellName = false;
            if (/WELL/.test(sectionName)) {
                let wellname = "";
                let start = "";
                let stop = "";
                let step = "";
                let NULL = "";
                if ((/WELL/).test(line) && !/UWI/.test(line)) {
                    hasWellName = true;
                    wellname = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                    wellInfo.wellname = wellname;
                } else if (/STRT/.test(line)) {
                    start = line.substring(line.indexOf('.') + 2, line.indexOf(':')).trim();
                    wellInfo.start = start;
                } else if (/STOP/.test(line)) {
                    stop = line.substring(line.indexOf('.') + 2, line.indexOf(':')).trim();
                    wellInfo.stop = stop;
                } else if (/STEP/.test(line)) {
                    step = line.substring(line.indexOf('.') + 2, line.indexOf(':')).trim();
                    wellInfo.step = step;
                } else if (/NULL/.test(line)) {
                    NULL = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                    wellInfo.null = NULL;
                }
            } else if (/CURVE/.test(sectionName)) {
                if (moreUploadData.wellName) {
                    wellInfo.wellname = moreUploadData.wellName;
                } else {
                    if (!hasWellName) {
                        wellInfo.wellname = moreUploadData.fileName;
                    }
                }
                let curve = new Object();
                let curveName = "";
                let unit = "";
                curveName = line.substring(0, line.indexOf('.')).trim();
                if (line.indexOf('00')) {
                    unit = line.substring(line.indexOf('.') + 1, line.indexOf(' ')).trim();
                } else {
                    unit = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                }
                curve.name = curveName;
                curve.unit = unit;
                curve.datasetname = moreUploadData.datasetName ? moreUploadData.datasetName : wellInfo.wellname;
                curve.wellname = wellInfo.wellname;
                curve.initValue = "abc";
                curve.family = "VNU";
                curve.idDataset = null;
                if (!/DEPTH/.test(curve.name)) {
                    BUFFERS[curveName] = {
                        count: 0,
                        data: ""
                    };
                    filePaths[curveName] = hashDir.createPath(__config.basePath, moreUploadData.projectName + wellInfo.wellname + curve.datasetname + curveName, curveName + '.txt');
                    fs.writeFileSync(filePaths[curveName], "");
                    curve.path = filePaths[curveName];
                    curves.push(curve);
                }
            }
        } else if (/^[0-9][0-9]/.test(line)) {
            let spacePosition = line.indexOf(' ');
            line = line.substring(spacePosition, line.length).trim();
            let fields = line.split(' ');
            if (curves) {
                curves.forEach(function (curve, i) {
                    //console.log(moreUploadData.curves.indexOf(curve.name));
                    if (moreUploadData.curves) {
                        if (moreUploadData.curves.indexOf(curve.name) != -1) {
                            writeToCurveFile(BUFFERS[curve.name], curve.path, count, fields[i], wellInfo.null);
                        } else {
                            curves.splice(i, 1);
                        }
                    } else {
                        writeToCurveFile(BUFFERS[curve.name], curve.path, count, fields[i], wellInfo.null);
                    }
                });
                count++;
            }
        }
    });
    rl.on('end', function () {
        deleteFile(inputURL);
        wellInfo.datasetInfo = [];
        curves.forEach(function (curve, i) {
            fs.appendFileSync(curve.path, BUFFERS[curve.name].data);
        });
        let dataset = {
            name: moreUploadData.datasetName ? moreUploadData.datasetName : wellInfo.wellname,
            datasetKey: moreUploadData.datasetName ? moreUploadData.datasetName : wellInfo.wellname,
            datasetLabel: moreUploadData.datasetName ? moreUploadData.datasetName : wellInfo.wellname,
            curves: null
        }
        dataset.curves = curves;
        wellInfo.datasetInfo.push(dataset);
        callback(false, wellInfo);
    });
    rl.on('err', function (err) {
        deleteFile(inputURL);
        callback(err, null);
    });
}

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

// function writeToCurveFile(curveFileName, data) {
//     fs.appendFileSync(curveFileName, data);
// }

function extractWell(inputURL, callback) {
    //console.log("extractWell");
    let rl = new readline(inputURL);
    let sectionName = "";
    let datasetsName = [];
    let curves = [];
    let wellInfo = new Object();

    rl.on('line', function (line) {
        line = line.trim();
        line = line.toUpperCase();
        line = line.replace(/\s+\s/g, " ");

        if (/^~/.test(line)) {
            sectionName = line;
        } else if (/^[A-z]/.test(line)) {
            if (/WELL/.test(sectionName)) {
                let wellname = "";
                let start = "";
                let stop = "";
                let step = "";
                let NULL = "";
                if ((/WELL/).test(line) && !/UWI/.test(line)) {
                    wellname = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                    wellInfo.wellname = wellname;
                } else if (/STRT/.test(line)) {
                    start = line.substring(line.indexOf('.') + 2, line.indexOf(':')).trim();
                    wellInfo.start = start;
                } else if (/STOP/.test(line)) {
                    stop = line.substring(line.indexOf('.') + 2, line.indexOf(':')).trim();
                    wellInfo.stop = stop;
                } else if (/STEP/.test(line)) {
                    step = line.substring(line.indexOf('.') + 2, line.indexOf(':')).trim();
                    wellInfo.step = step;
                } else if (/NULL/.test(line)) {
                    NULL = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                    wellInfo.null = NULL;
                }
            } else if (/CURVE/.test(sectionName)) {
                let curve = new Object();
                let curveName = "";
                let unit = "";
                curveName = line.substring(0, line.indexOf('.')).trim();
                unit = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                curve.name = curveName;
                curve.unit = unit;
                curve.datasetname = wellInfo.wellname;
                curve.wellname = wellInfo.wellname;
                curve.initValue = "abc";
                curve.family = "VNU";
                curve.idDataset = null;
                if (!/DEPTH/.test(curve.name)) {
                    curves.push(curve);
                }
            }
        } else if (/^[0-9][0-9]/.test(line)) {
        }
    });
    rl.on('end', function () {
        deleteFile(inputURL);
        wellInfo.datasetInfo = [];
        let dataset = {
            name: wellInfo.wellname,
            datasetKey: wellInfo.wellname,
            datasetLabel: wellInfo.wellname,
            curves: null
        }
        //console.log(curves);
        dataset.curves = curves;
        wellInfo.datasetInfo.push(dataset);
        callback(false, wellInfo);
    });
    rl.on('err', function (err) {
        deleteFile(inputURL);
        callback(err, null);
    });

}

function extractAll(inputURL, moreUploadData, callbackGetSections) {
    getLASVersion(inputURL, function (err, result) {
        if (err) {
            callbackGetSections(err, result);
        } else {
            if (result.lasVersion == 2) {
                extractCurves(inputURL, moreUploadData, function (err, info) {
                    if (err) callbackGetSections(err, null);
                    callbackGetSections(false, info);
                });
            } else if (result.lasVersion == 3) {
                callbackGetSections("LAS_3_DETECTED", null);
            }
        }
    });

}

function deleteFile(inputURL) {
    fs.unlink(inputURL, function (err) {
        if (err) return console.log(err);
    });
}

module.exports.getLASVersion = getLASVersion;
module.exports.extractCurves = extractCurves;
module.exports.extractWell = extractWell;
module.exports.extractAll = extractAll;
module.exports.deleteFile = deleteFile;
module.exports.setBasePath = function (basePath) {
    __config.basePath = basePath;
};

module.exports.getBasePath = function () {
    return __config.basePath;
};
