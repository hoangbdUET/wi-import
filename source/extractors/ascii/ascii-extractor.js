'use strict';
let readline = require('line-by-line');
let fs = require('fs');
let hashDir = require('../../hash-dir');
let path = require('path');
let __config = require('../common-config');

function writeToFile(buffer, fileName, index, data, callback) {
    try {
        buffer.count += 1;
        buffer.data += index + ' la ' + data + '\n';
        if (buffer.count >= 1000) {
            fs.appendFileSync(fileName, buffer.data);
            buffer.count = 0;
            buffer.data = "";
        }
    }
    catch (err) {
        callback(err);
    }
    callback();
}

function createCurveFile(curveName, datasetName) {
    let filePath = new Object();
    filePath[curveName] = hashDir.createPath(__config.basePath, datasetName + curveName, curveName + '.txt');
    fs.writeFileSync(filePath[curveName], "");
}

function getCurvesInfo(curvesName, datasetName, units, callbackGetBuffer) {
    let BUFFERS = new Object();
    let curves = new Array();
    if (curvesName) {
        curvesName.forEach(function (curveName, i) {
            if (/\./.test(units[i])) {
                units[i] = "";
            }
            curves.push({
                name: curveName,
                unit: units[i],
                data: "",
                description: "",
                dataset: datasetName
            });
            BUFFERS[curveName] = {
                count: 0,
                data: ""
            };
            createCurveFile(curveName, datasetName);
        });
        callbackGetBuffer(BUFFERS, curves);
    }
}

function extractFromASC(inputURL, resultCallBack) {
    let rl = new readline(inputURL);
    let BUFFERS = new Object();
    let count = 0;
    let wellName = null;
    let topDepth = null;
    let bottomDepth = null;
    let step = null;
    let filePath = new Object();
    let unitList = new Array();
    let wells = null;
    let curves = new Array();
    let curvesName = new Array();
    let dataCurves;
    let fieldsLine;
    let fileFormat = path.extname(inputURL).toUpperCase();
    let datasetName = null;
    let flag = true;

    console.log('file format la ', fileFormat);
    rl.on('line', function (line) {
        line = line.trim().toUpperCase();
        if (/^\$ASCII/.test(line)) { //get field WELL or UWI
        }
        else if (/DATA/.test(line)) { //skip line have string "Data"
        }
        else if (/DEPTH/.test(line)) { //Check field WELL or UWI, after get list Field Curve
            line = line.replace(/\t/g, ' ');
            line = line.replace(/\s+\s/g, ' ');
            fieldsLine = line;
            let spaceDepth = line.indexOf('DEPTH');
            wells = new Object();
            wells.fieldWell = line.substring(0, spaceDepth);
            curvesName = line.substring(spaceDepth, line.length).split(/\s|,/);
            curvesName.shift();

        }
        else if (/^\.|^M\s|^M,/.test(line)) {
            line = line.replace(/\t/g, ' ');
            line = line.replace(/\s+\s/g, ' ');
            let spacePosition;
            if (/\.CSV/.test(fileFormat)) {
                spacePosition = line.indexOf(',');
                if (/^WELL UWI|^WELL,UWI/.test(fieldsLine)) {
                    spacePosition = line.indexOf(',', spacePosition + 1);
                }
            }
            else {
                spacePosition = line.indexOf(' ');
                if (/^WELL UWI|^WELL,UWI/.test(fieldsLine)) {
                    spacePosition = line.indexOf(' ', spacePosition + 1);
                }
            }
            wells.data = new Array();

            unitList = line.substring(spacePosition + 1, line.length).split(/\s|,/);
            unitList.shift();

        }
        else if (/^[A-z]|^[0-9]/.test(line)) {
            line = line.replace(/\t/g, ' ');
            line = line.replace(/\s+\s/g, ' ');
            if (/^WELL UWI|^WELL,UWI/.test(fieldsLine)) {
                let spaceFirst;
                let spaceSecond;
                if (/\.CSV/.test(fileFormat)) {
                    spaceFirst = line.indexOf(',');
                    spaceSecond = line.indexOf(',', spaceFirst + 1);
                }
                else {
                    spaceFirst = line.indexOf(' ');
                    spaceSecond = line.indexOf(' ', spaceFirst + 1);
                }
                let currentWell = line.substring(0, spaceFirst);
                datasetName = currentWell.toUpperCase().split(/\s|,/)[0];
                if (flag) {
                    getCurvesInfo(curvesName, datasetName, unitList, function (buffers, curvesInfo) {
                        BUFFERS = buffers;
                        curves = curvesInfo;
                    });
                    flag = false;
                }
                dataCurves = line.substring(spaceSecond + 1, line.length).split(/\s|,/);
                if (wellName) {
                    if (!(new RegExp(wellName)).test(currentWell)) {
                        wells.data.push({
                            wellInfo: {
                                name: wellName,
                                topDepth: topDepth,
                                bottomDepth: bottomDepth,
                                step: step,
                                curves: curves
                            }
                        });
                        curvesName.forEach(function (curveName) {
                            filePath[curveName] = hashDir.getHashPath(__config.basePath, datasetName + curveName, curveName + '.txt');
                            fs.appendFileSync(filePath[curveName], BUFFERS[curveName].data);
                            BUFFERS[curveName] = {
                                count: 0,
                                data: ""
                            };
                            createCurveFile(curveName, datasetName);
                        });
                        count = 0;
                        flag = true;
                    }
                }
                if (count == 0) {
                    topDepth = dataCurves[0];
                }
                else if (count == 1) {
                    step = dataCurves[0] - topDepth;
                    step = step.toFixed(4);
                }
                bottomDepth = dataCurves[0].toString();
                dataCurves.shift();
                curvesName.forEach(function (curveName, i) {
                    filePath[curveName] = hashDir.getHashPath(__config.basePath, datasetName + curveName, curveName + '.txt');
                    writeToFile(BUFFERS[curveName], filePath[curveName], count, dataCurves[i], function (err) {
                        if (err) console.log("File format is not true", err);
                    });

                });
                count++;

                wellName = currentWell.split(/\s|,/)[0];
            }
            else if (/WELL|UWI/.test(fieldsLine)) {
                let spaceFirst;
                let currentWell;
                if (/\.CSV/.test(fileFormat)) {
                    spaceFirst = line.indexOf(',');
                }
                else {
                    spaceFirst = line.indexOf(' ');
                }
                if (/WELL/.test(fieldsLine)) {
                    currentWell = line.substring(0, spaceFirst);
                    datasetName = currentWell;
                }
                else {
                    currentWell = line.substring(0, spaceFirst);
                    datasetName = currentWell.split('W')[0];
                }
                dataCurves = line.substring(spaceFirst + 1, line.length).split(/\s|,/);
                if (flag) {
                    getCurvesInfo(curvesName, datasetName, unitList, function (buffers, curvesInfo) {
                        BUFFERS = buffers;
                        curves = curvesInfo;
                    });
                    flag = false;
                }
                if (wellName) {
                    if (!(new RegExp(wellName)).test(currentWell)) {
                        wells.data.push({
                            wellInfo: {
                                name: wellName,
                                topDepth: topDepth,
                                bottomDepth: bottomDepth,
                                step: step,
                                curves: curves
                            }
                        });
                        curvesName.forEach(function (curveName) {
                            filePath[curveName] = hashDir.getHashPath(__config.basePath, datasetName + curveName, curveName + '.txt');
                            fs.appendFileSync(filePath[curveName], BUFFERS[curveName].data);
                            BUFFERS[curveName] = {
                                count: 0,
                                data: ""
                            };
                            createCurveFile(curveName, datasetName);
                        });
                        count = 0;
                        flag = true;
                    }
                }
                if (count == 0) {
                    topDepth = dataCurves[0];
                }
                else if (count == 1) {
                    step = dataCurves[0] - topDepth;
                    step = step.toFixed(4);
                }
                bottomDepth = dataCurves[0].toString();
                dataCurves.shift();
                curvesName.forEach(function (curveName, i) {
                    filePath[curveName] = hashDir.getHashPath(__config.basePath, datasetName + curveName, curveName + '.txt');
                    writeToFile(BUFFERS[curveName], filePath[curveName], count, dataCurves[i], function (err) {
                        if (err) console.log("File format is not true", err);
                    });
                });
                count++;
                if (/WELL/.test(fieldsLine)) {
                    wellName = currentWell;
                }
                else {
                    wellName = currentWell.split('W')[0];
                }

            }
            else {
                dataCurves = line.split(/\s|,/);
                wellName = 'NULL';
                datasetName = 'NULL';
                if (flag) {
                    getCurvesInfo(curvesName, datasetName, unitList, function (buffers, curvesInfo) {
                        BUFFERS = buffers;
                        curves = curvesInfo;
                    });
                    flag = false;
                }
                if (count == 0) {
                    topDepth = dataCurves[0];
                }
                else if (count == 1) {
                    step = dataCurves[0] - topDepth;
                    step = step.toFixed(4);
                }
                bottomDepth = dataCurves[0].toString();
                dataCurves.shift();
                curvesName.forEach(function (curveName, i) {
                    filePath[curveName] = hashDir.getHashPath(__config.basePath, datasetName + curveName, curveName + '.txt');
                    writeToFile(BUFFERS[curveName], filePath[curveName], count, dataCurves[i], function (err) {
                        if (err) console.log("File format is not true", err);
                    });
                });
                count++;
            }
        }
    });

    rl.on('end', function () {
        if (wells) {
            wells.data.push({
                wellInfo: {
                    name: wellName,
                    topDepth: topDepth,
                    bottomDepth: bottomDepth,
                    step: step,
                    curves: curves
                }
            });
        }

        if (curvesName) {
            curvesName.forEach(function (curveName) {
                filePath[curveName] = hashDir.getHashPath(__config.basePath, datasetName + curveName, curveName + '.txt');
                fs.appendFileSync(filePath[curveName], BUFFERS[curveName].data);
            });
        }
        resultCallBack(wells);
        console.log('ExtractFromASC done');
    });

    rl.on('err', function (err) {
        if (err) console.log('ExtractFromAsc has error', err);
    });
}

module.exports.extractFromASC = extractFromASC;
module.exports.setBasePath = function (basePath) {
    __config.basePath = basePath;
};
module.exports.getBasePath = function () {
    return __config.basePath;
};
