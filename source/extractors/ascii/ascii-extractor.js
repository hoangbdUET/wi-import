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

function extractFromASC(inputURL, resultCallBack, options) {
    let rl = new readline(inputURL);
    let token;
    let BUFFERS = new Object();
    let count = 0;
    let wellName = null;
    let topDepth = null;
    let bottomDepth = null;
    let step = null;
    let countWell = 1;
    let filePaths = new Object();
    let unitList = new Array();
    let wells = null;
    let curves = new Array();
    let curvesName = new Array();
    let dataCurves;
    let fieldsLine;
    let fileFormat = path.extname(inputURL);
    let label = options.label || "label default";

    console.log('file format la ', fileFormat);
    rl.on('line', function (line) {
        line = line.trim();
        if (/^\$ASCII/.test(line.toUpperCase())) { //get field WELL or UWI
            let bigToken = line.split(':');
            token = bigToken[1].trim().split(/\s|,/);
        }
        else if (/DATA/.test(line.toUpperCase())) { //skip line Data
        }
        else if (/DEPTH/g.test(line.toUpperCase())) { //Check field WELL or UWI, after get list Field Curve

            line = line.replace(/\t/g, ' ');
            line = line.replace(/\s+\s/g, ' ');
            line = line.toUpperCase();
            fieldsLine = line;
            let spaceDepth = line.indexOf('DEPTH');
            wells = new Object();
            wells.fieldWell = line.substring(0, spaceDepth);
            curvesName = line.substring(spaceDepth, line.length).split(/\s|,/);
        }
        else if (/^\.|^M\s|^M,/g.test(line.toUpperCase())) {
            line = line.replace(/\t/g, ' ');
            line = line.replace(/\s+\s/g, ' ');
            let spacePosition;
            if(/\.CSV/g.test(fileFormat.toUpperCase())) {
                spacePosition = line.indexOf(',');
                if (/^WELL UWI|^WELL,UWI/g.test(fieldsLine)) {
                    spacePosition = line.indexOf(',', spacePosition + 1);
                }
            }
            else {
                spacePosition = line.indexOf(' ');
                if (/^WELL UWI|^WELL,UWI/g.test(fieldsLine)) {
                    spacePosition = line.indexOf(' ', spacePosition + 1);
                }
            }
            wells.data = new Array();

            unitList = line.substring(spacePosition + 1, line.length).split(/\s|,/);
            if (curvesName) {
                curvesName.forEach(function (curveName, i) {
                    BUFFERS[curveName] = {
                        count: 0,
                        data: ""
                    };

                    filePaths[curveName] = hashDir.createPath(__config.basePath, inputURL + label + countWell + curveName, curveName + '.txt');
                    if(/\./.test(unitList[i])) {
                        unitList[i] = "";
                    }
                    curves.push({
                        name: curveName,
                        unit: unitList[i],
                        data: filePaths[curveName]
                    });
                    fs.writeFileSync(filePaths[curveName], "");
                });
            }
        }
        else if (/^[A-z]|^[0-9]/g.test(line)) {
            line = line.replace(/\t/g, ' ');
            line = line.replace(/\s+\s/g, ' ');
            if (/^WELL UWI|^WELL,UWI/g.test(fieldsLine)) {
                let spaceFirst;
                let spaceSecond;
                if(/\.CSV/g.test(fileFormat.toUpperCase())) {
                    spaceFirst = line.indexOf(',');
                    spaceSecond = line.indexOf(',', spaceFirst + 1);
                }
                else {
                    spaceFirst = line.indexOf(' ');
                    spaceSecond  = line.indexOf(' ', spaceFirst + 1);
                }
                let currentWell = line.substring(0, spaceFirst);
                dataCurves = line.substring(spaceSecond + 1, line.length).split(/\s|,/);
                if (wellName) {
                    if (!(new RegExp(wellName)).test(currentWell.toUpperCase())) {
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
                            fs.appendFileSync(filePaths[curveName], BUFFERS[curveName].data);
                        });
                        countWell++;
                        curvesName.forEach(function (curveName) {
                            BUFFERS[curveName] = {
                                count: 0,
                                data: ""
                            };

                            filePaths[curveName] = hashDir.createPath(__config.basePath, inputURL + label + countWell + curveName, curveName + '.txt');
                            fs.writeFileSync(filePaths[curveName], "");
                        });
                        count = 0;
                    }
                }
                curvesName.forEach(function (curveName, i) {
                    if (/DEPTH/g.test(curveName.toUpperCase())) {
                        if (count == 0) {
                            topDepth = dataCurves[i];
                        }
                        else if (count == 1) {
                            step = dataCurves[i] - topDepth;
                            step = step.toFixed(4);
                        }
                        bottomDepth = dataCurves[i].toString();
                    }
                    writeToFile(BUFFERS[curveName], filePaths[curveName], count, dataCurves[i], function (err) {
                        if (err) console.log("File format is not true", err);
                    });
                });
                count++;

                wellName = currentWell.toUpperCase().split(/\s|,/)[0];
            }
            else if (/WELL|UWI/g.test(fieldsLine)) {
                let spaceFirst;
                let currentWell;
                if(/\.CSV/g.test(fileFormat.toUpperCase())) {
                    spaceFirst = line.indexOf(',');
                }
                else {
                    spaceFirst = line.indexOf(' ');
                }
                if(/WELL/g.test(fieldsLine)) {
                    currentWell = line.substring(0, spaceFirst);
                }
                else {
                    currentWell = line.substring(0, spaceFirst) + 'W';
                }

                dataCurves = line.substring(spaceFirst + 1, line.length).split(/\s|,/);
                if (wellName) {
                    if (!(new RegExp(wellName)).test(currentWell.toUpperCase())) {
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
                            fs.appendFileSync(filePaths[curveName], BUFFERS[curveName].data);
                        });
                        countWell++;
                        curvesName.forEach(function (curveName) {
                            BUFFERS[curveName] = {
                                count: 0,
                                data: ""
                            };

                            filePaths[curveName] = hashDir.createPath(__config.basePath, inputURL + label + countWell + curveName, curveName + '.txt');
                            fs.writeFileSync(filePaths[curveName], "");
                        });
                        count = 0;
                    }
                }
                curvesName.forEach(function (curveName, i) {
                    if (/DEPTH/g.test(curveName.toUpperCase())) {
                        if (count == 0) {
                            topDepth = dataCurves[i];
                        }
                        else if (count == 1) {
                            step = dataCurves[i] - topDepth;
                            step = step.toFixed(4);
                        }
                        bottomDepth = dataCurves[i].toString();
                    }
                    writeToFile(BUFFERS[curveName], filePaths[curveName], count, dataCurves[i], function (err) {
                        if (err) console.log("File format is not true", err);
                    });
                });
                count++;
                if(/WELL/g.test(fieldsLine)) {
                    wellName = currentWell.toUpperCase();
                }
                else {
                    wellName = currentWell.toUpperCase().split('W')[0] + 'W';
                }

            }
            else {

                dataCurves = line.split(/\s|,/);
                let checkBottomDepth;
                curvesName.forEach(function (curveName, i) {
                    if (/DEPTH/g.test(curveName.toUpperCase())) {
                        checkBottomDepth = dataCurves[i];
                    }
                });
                if ((step != null) && step != (checkBottomDepth - bottomDepth).toFixed(4)) {
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
                        fs.appendFileSync(filePaths[curveName], BUFFERS[curveName].data);
                    });
                    countWell++;
                    curvesName.forEach(function (curveName) {
                        BUFFERS[curveName] = {
                            count: 0,
                            data: ""
                        };

                        filePaths[curveName] = hashDir.createPath(__config.basePath, inputURL + label + countWell + curveName, curveName + '.txt');
                        fs.writeFileSync(filePaths[curveName], "");
                    });
                    count = 0;

                }

                curvesName.forEach(function (curveName, i) {
                    if (/DEPTH/g.test(curveName.toUpperCase())) {
                        if (count == 0) {
                            topDepth = dataCurves[i];
                        }
                        else if (count == 1) {
                            step = dataCurves[i] - topDepth;
                            step = step.toFixed(4);
                        }
                        bottomDepth = dataCurves[i].toString();
                    }
                    writeToFile(BUFFERS[curveName], filePaths[curveName], count, dataCurves[i], function (err) {
                        if (err) console.log("File format is not true", err);
                    });
                });
                count++;
            }
        }
    });

    rl.on('end', function () {
        if (curvesName) {
            curvesName.forEach(function (curveName) {
                fs.appendFileSync(filePaths[curveName], BUFFERS[curveName].data);
            });
        }
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
