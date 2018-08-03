'use strict';
let readline = require('line-by-line');
let hashDir = require('../hash-dir');
let fs = require('fs');
let config = require('../common-config');

const detectCharacterEncoding = require('detect-character-encoding');

function writeToCurveFile(buffer, curveFileName, index, value, defaultNull) {
    buffer.count += 1;
    if (parseFloat(value) === parseFloat(defaultNull)) {
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


module.exports = async function (inputFile, importData) {
    return new Promise((resolve, reject) => {
        const fileBuffer = fs.readFileSync(inputFile.path);
        const fileEncoding = detectCharacterEncoding(fileBuffer).encoding == 'ISO-8859-1' ? 'latin1' : 'utf8';
        // const fileEncoding = 'utf8';
        let rl = new readline(inputFile.path, {encoding: fileEncoding, skipEmptyLines: true});
        let sectionName = "";
        let datasets = {};
        let count = 0;
        let wellInfo = importData.well ? importData.well : {
            filename: inputFile.originalname,
            name: inputFile.originalname.substring(0, inputFile.originalname.lastIndexOf('.'))
        };
        let filePaths = new Object();
        let BUFFERS = new Object();
        let isFirstCurve = true;
        let fields = [];
        let wellTitle = 'WELL';
        let curveTitle = 'CURVE';
        let definitionTitle = '_DEFINITION';
        let dataTitle = '_DATA';
        let asciiTitle = 'ASCII';
        let parameterTitle = 'PARAMETER';
        let lasCheck = 0;
        let currentDatasetName = '';
        let lasVersion = 3;
        let delimitingChar = ' ';
        let lasFormatError = '';
        let logDataIndex = 0;

        rl.on('line', function (line) {
            line = line.trim();
            line = line.replace(/\s+\s/g, " ");
            if (/^#/.test(line) || lasFormatError.length > 0) {
                return;
            }
            if (/^~/.test(line)) {
                line = line.toUpperCase();
                const firstSpace = line.indexOf(' ');
                const barIndex = line.indexOf('|');
                if (lasVersion == 2) {
                    sectionName = line.substr(line.indexOf('~') + 1, 1);
                }
                else if (firstSpace != -1 && barIndex != -1) {
                    sectionName = line.substring(line.indexOf('~') + 1, firstSpace < barIndex ? firstSpace : barIndex);
                }
                else if (firstSpace != barIndex) {
                    sectionName = line.substring(line.indexOf('~') + 1, firstSpace > barIndex ? firstSpace : barIndex);
                }
                else {
                    sectionName = line.substring(line.indexOf('~') + 1);
                }

                if (/VERSION/.test(sectionName)) {
                    lasCheck++;
                }
                if (sectionName == wellTitle) {
                    if (lasCheck < 1) {
                        lasFormatError = 'THIS IS NOT LAS FILE, MISSING VERSION SECTION';
                        return rl.close();
                    }
                    else lasCheck++;
                }
                if (sectionName == curveTitle || new RegExp(definitionTitle).test(sectionName)) {
                    if (lasCheck < 2) {
                        lasFormatError = 'THIS IS NOT LAS FILE, MISSING WELL SECTION';
                        return rl.close();
                    }
                    else lasCheck++;
                }

                if (sectionName == asciiTitle || new RegExp(dataTitle).test(sectionName)) {
                    if (lasCheck < 3) {
                        lasFormatError = 'THIS IS NOT LAS FILE, MISSING DEFINITION SECTION';
                        return rl.close();
                    }
                    else lasCheck--;
                }

                if (sectionName == parameterTitle || (lasVersion == 2 && sectionName == curveTitle)) {
                    if (sectionName == parameterTitle && lasVersion == 3) logDataIndex++;
                    if (datasets[wellInfo.name + logDataIndex]) return;
                    isFirstCurve = true;
                    let dataset = {
                        name: wellInfo.name + logDataIndex,
                        curves: [],
                        top: wellInfo.STRT.value,
                        bottom: wellInfo.STOP.value,
                        step: wellInfo.STEP.value,
                        params: []
                    }
                    datasets[wellInfo.name + logDataIndex] = dataset;
                    // dataset[currentDatasetName].curves.forEach(curve=>{
                    //     fs.appendFileSync(curve.path, BUFFERS[curve.name].data);
                    // })
                    currentDatasetName = wellInfo.name + logDataIndex;
                }
                else if (new RegExp(definitionTitle).test(sectionName) || new RegExp(parameterTitle).test(sectionName)) {
                    isFirstCurve = true;
                    let datasetName = '';
                    if (new RegExp(definitionTitle).test(sectionName)) {
                        datasetName = sectionName.replace(definitionTitle, '');
                    } else {
                        datasetName = sectionName.replace('_' + parameterTitle, '');
                    }
                    // const datasetName = sectionName.substring(0, sectionName.lastIndexOf('_'));
                    if (datasets[datasetName]) return;
                    let dataset = {
                        name: datasetName,
                        curves: [],
                        top: wellInfo.STRT.value,
                        bottom: wellInfo.STOP.value,
                        step: wellInfo.STEP.value,
                        params: []
                    }
                    datasets[datasetName] = dataset;
                    // dataset[currentDatasetName].curves.forEach(curve=>{
                    //     fs.appendFileSync(curve.path, BUFFERS[curve.name].data);
                    // })
                    currentDatasetName = datasetName;
                }

                console.log('section name: ' + sectionName)
                if (sectionName == asciiTitle || new RegExp(dataTitle).test(sectionName)) {

                    if (sectionName == asciiTitle) currentDatasetName = wellInfo.name + logDataIndex;
                    datasets[currentDatasetName].curves.forEach(curve => {
                        BUFFERS[curve.name] = {
                            count: 0,
                            data: ""
                        };
                        const hashstr = importData.userInfo.username + wellInfo.name + curve.datasetname + curve.name + curve.unit + curve.step;
                        filePaths[curve.name] = hashDir.createPath(config.dataPath, hashstr, curve.name + '.txt');
                        fs.writeFileSync(filePaths[curve.name], "");
                        curve.path = filePaths[curve.name];
                    })
                }
            }
            else {
                if (sectionName != asciiTitle && !new RegExp(dataTitle).test(sectionName)
                    && sectionName != 'O' && line.indexOf(':') < 0) {
                    lasFormatError = 'WRONG FORMAT';
                    return rl.close();
                }

                if (/VERSION/.test(sectionName)) {
                    if (/VERS/.test(line)) {
                        const dotPosition = line.indexOf('.');
                        const colon = line.indexOf(':');
                        const versionString = line.substring(dotPosition + 1, colon);
                        /2/.test(versionString) ? lasVersion = 2 : lasVersion = 3;
                        if (lasVersion == 2) {
                            wellTitle = 'W';
                            curveTitle = 'C';
                            asciiTitle = 'A';
                            parameterTitle = 'P';
                        }
                        console.log('LAS VERSION: ' + lasVersion)
                    } else if (/DLM/.test(line)) {
                        const dotPosition = line.indexOf('.');
                        const colon = line.indexOf(':');
                        const dlmString = line.substring(dotPosition + 1, colon).trim();
                        delimitingChar = dlmString == 'COMMA' ? ',' : ' ';
                    }
                } else if (sectionName == wellTitle) {
                    if (importData.well) return;
                    const mnem = line.substring(0, line.indexOf('.')).trim();
                    line = line.substring(line.indexOf('.'));
                    const data = line.substring(line.indexOf(' '), line.lastIndexOf(':')).trim();
                    const description = line.substring(line.lastIndexOf(':') + 1).trim();
                    const unitSec = line.substring(line.indexOf('.') + 1);
                    let unit = unitSec.substring(0, unitSec.indexOf(' ')).trim();
                    if (unit.indexOf("00") != -1) unit = unit.substring(0, unit.indexOf("00"));
                    if ((/WELL/).test(mnem) && data) {
                        wellInfo.name = data;
                    }
                    wellInfo[mnem] = {
                        value: data,
                        description: description,
                        unit: unit
                    }
                } else if (sectionName == parameterTitle || new RegExp(parameterTitle).test(sectionName)) {
                    if (importData.well) return;
                    const mnem = line.substring(0, line.indexOf('.')).trim();
                    line = line.substring(line.indexOf('.'));
                    const paramsUnitSec = line.substring(line.indexOf('.') + 1);
                    let paramUnit = paramsUnitSec.substring(0, paramsUnitSec.indexOf(' ')).trim();
                    if (paramUnit.indexOf("00") != -1) paramUnit = paramUnit.substring(0, unit.indexOf("00"));
                    const data = line.substring(line.indexOf(' '), line.lastIndexOf(':')).trim();
                    const description = line.substring(line.lastIndexOf(':') + 1).trim();
                    if (sectionName == parameterTitle) {
                        if (mnem == 'SET') datasets[wellInfo.name + logDataIndex].name = data;
                        datasets[wellInfo.name + logDataIndex].params.push({
                            mnem: mnem,
                            value: data,
                            description: description,
                            unit: paramUnit
                        })
                    }
                    else {
                        datasets[sectionName.replace('_' + parameterTitle, '')].params.push({
                            mnem: mnem,
                            value: data,
                            description: description
                        })
                    }
                } else if (sectionName == curveTitle || new RegExp(definitionTitle).test(sectionName)) {
                    if (isFirstCurve) {
                        isFirstCurve = false;
                        return;
                    }

                    // const datasetName = sectionName == curveTitle ? wellInfo.name : sectionName.substring(0, sectionName.indexOf(definitionTitle));
                    let curveName = line.substring(0, line.indexOf('.')).trim().toUpperCase();
                    curveName = curveName.replace('/', '_');
                    let suffix = 1;
                    while (true) {
                        let rename = datasets[currentDatasetName].curves.every(curve => {
                            if (curveName.toLowerCase() == curve.name.toLowerCase()) {
                                curveName = curveName.replace('_' + (suffix - 1), '') + '_' + suffix;
                                suffix++;
                                return false;
                            }
                            return true;
                        });
                        if (rename) break;
                    }
                    line = line.substring(line.indexOf('.') + 1);

                    let unit = line.substring(0, line.indexOf(' ')).trim();
                    if (unit.indexOf("00") != -1) unit = unit.substring(0, unit.indexOf("00"));
                    let curveDescription = line.substring(line.lastIndexOf(':') + 1).trim();


                    let curve = {
                        name: curveName,
                        unit: unit,
                        datasetname: currentDatasetName,
                        wellname: wellInfo.name,
                        startDepth: datasets[currentDatasetName].top,
                        stopDepth: datasets[currentDatasetName].bottom,
                        step: datasets[currentDatasetName].step,
                        path: '',
                        description: curveDescription
                    }
                    datasets[currentDatasetName].curves.push(curve);
                } else if (sectionName == asciiTitle || new RegExp(dataTitle).test(sectionName)) {
                    // let separator = sectionName == asciiTitle ? ' ' : ',';
                    // const datasetName = sectionName == asciiTitle ? wellInfo.name : sectionName.substring(0, sectionName.indexOf(dataTitle));
                    fields = fields.concat(line.trim().split(delimitingChar));
                    if (fields.length > datasets[currentDatasetName].curves.length) {
                        if (datasets[currentDatasetName].curves) {
                            if ((sectionName == asciiTitle || /LOG/.test(sectionName)) && parseFloat(wellInfo.STEP.value) != 0) {
                                datasets[currentDatasetName].curves.forEach(function (curve, i) {
                                    writeToCurveFile(BUFFERS[curve.name], curve.path, count, fields[i + 1], wellInfo.NULL.value);
                                });
                                count++;
                            } else {
                                datasets[currentDatasetName].curves.forEach(function (curve, i) {
                                    writeToCurveFile(BUFFERS[curve.name], curve.path, fields[0], fields[i + 1], wellInfo.NULL.value);
                                });
                                count++;
                            }
                        }
                        fields = [];
                    }
                }
            }


        });

        rl.on('end', function () {
            try {
                deleteFile(inputFile.path);
                if (lasFormatError && lasFormatError.length > 0) return reject(lasFormatError);
                if (lasCheck != 2) return reject('THIS IS NOT LAS FILE, MISSING DATA SECTION');

                //reverse if step is negative
                let step = 0;
                if (wellInfo.STEP && parseFloat(wellInfo.STEP.value) < 0) {
                    step = parseFloat(wellInfo.STEP.value);
                    wellInfo.STEP.value = (-step).toString();
                    const tmp = wellInfo.STRT.value;
                    wellInfo.STRT.value = wellInfo.STOP.value;
                    wellInfo.STOP.value = tmp;
                }


                let output = [];
                wellInfo.datasets = [];
                for (var datasetName in datasets) {
                    if (!datasets.hasOwnProperty(datasetName)) continue;
                    let dataset = datasets[datasetName];
                    if (step < 0) {
                        dataset.step = (-step).toString();
                        dataset.top = wellInfo.STRT.value;
                        dataset.bottom = wellInfo.STOP.value;
                    }
                    wellInfo.datasets.push(dataset);
                    dataset.curves.forEach(curve => {
                        fs.appendFileSync(curve.path, BUFFERS[curve.name].data);
                        if (step < 0) {
                            curve.step = (-step).toString();
                            curve.startDepth = wellInfo.STRT.value;
                            curve.stopDepth = wellInfo.STOP.value;
                            reverseData(curve.path);
                        }
                        curve.path = curve.path.replace(config.dataPath + '/', '');
                    })
                }

                output.push(wellInfo);
                console.log('completely extract LAS 3')
                resolve(output);
            } catch (err) {
                console.log(err);
                reject(err);
            }
        });

        rl.on('err', function (err) {
            console.log(err);
            deleteFile(inputFile.path);
            reject(err);
        });
    })
}

function deleteFile(inputURL) {
    fs.unlink(inputURL, function (err) {
        if (err) return console.log(err);
    });
}

async function reverseData(filePath) {
    let data = fs.readFileSync(filePath, 'utf8').trim().split('\n');
    data.reverse();
    data = data.map(function (line, index) {
        line = index.toString() + ' ' + line.trim().split(' ').pop();
        return line;
    })
    fs.writeFileSync(filePath, data.join('\n'));
}