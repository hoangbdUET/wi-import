'use strict';
let readline = require('line-by-line');
let hashDir = require('../hash-dir');
let fs = require('fs');
let config = require('../common-config');
let os = require('os');
const detectCharacterEncoding = os.type() === "Windows_NT" ? null : require('detect-character-encoding');

function writeToCurveFile(buffer, index, value, defaultNull) {
    let data = "";
    if (parseFloat(value) === parseFloat(defaultNull)) {
        data += index + " null" + "\n";
    }
    else {
        data += index + " " + value + "\n";
    }
    buffer.writeStream.write(data);
}
function customSplit(str, delimiter){
    let words;
    if(str.includes('"')){
        str = str.replace(/"[^"]+"/g, function (match, idx, string){
            let tmp = match.replace(/"/g, '');
            return '"' + Buffer.from(tmp).toString('base64') + '"';
        })
        words = str.split(delimiter);
        words = words.map(function(word){
            if(word.includes('"')){
                return Buffer.from(word.replace(/"/g, ''), 'base64').toString();
            }
            else return word;
        })
    }else {
        words = str.split(delimiter);
    }
    return words;
}

module.exports = async function (inputFile, importData) {
    return new Promise((resolve, reject) => {
        const fileBuffer = fs.readFileSync(inputFile.path);
    const fileEncoding = detectCharacterEncoding ? detectCharacterEncoding(fileBuffer).encoding == 'ISO-8859-1' ? 'latin1' : 'utf8' : 'utf8';
    let rl = new readline(inputFile.path, {encoding: fileEncoding, skipEmptyLines: true});
    let sectionName = "";
    let datasets = {};
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
    let logDataIndex = '';
    let lastDepth = 0;

    rl.on('line', function (line) {
        try {
            line = line.trim();
            line = line.replace(/\s+\s/g, " ");
            if (line.length < 1 || /^#/.test(line) || lasFormatError.length > 0) {
                //skip the line if it's empty or commented
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
                        top: 0,
                        bottom: 0,
                        step: 0,
                        params: [],
                        unit: 0,
                        count: 0
                    }
                    datasets[wellInfo.name + logDataIndex] = dataset;
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
                        top: 0,
                        bottom: 0,
                        step: 0,
                        params: [],
                        unit: '',
                        count: 0
                    }
                    datasets[datasetName] = dataset;
                    currentDatasetName = datasetName;
                }

                console.log('section name: ' + sectionName)
                if (sectionName == asciiTitle || new RegExp(dataTitle).test(sectionName)) {

                    if (sectionName == asciiTitle) currentDatasetName = wellInfo.name + logDataIndex;
                    datasets[currentDatasetName].curves.forEach(curve => {
                        const hashstr = importData.userInfo.username + wellInfo.name + curve.datasetname + curve.name + curve.unit + curve.step;
                    filePaths[curve.name] = hashDir.createPath(config.dataPath, hashstr, curve.name + '.txt');
                    fs.writeFileSync(filePaths[curve.name], "");
                    curve.path = filePaths[curve.name];
                    BUFFERS[curve.name] = {
                        writeStream: fs.createWriteStream(filePaths[curve.name])
                    };
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
                    if (mnem.localeCompare("WELL") == 0 && data) {
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
                        line = line.substring(line.indexOf('.') + 1);
                        let unit = line.substring(0, line.indexOf(' ')).trim();
                        datasets[currentDatasetName].unit = unit;
                        return;
                    }

                    // const datasetName = sectionName == curveTitle ? wellInfo.name : sectionName.substring(0, sectionName.indexOf(definitionTitle));
                    let curveName = line.substring(0, line.indexOf('.')).trim().toUpperCase();
                    curveName = curveName.replace('/', '_');
                    let suffix = 1;
                    while (true) {
                        let rename = datasets[currentDatasetName].curves.every(curve => {
                            if(curveName.toLowerCase() == curve.name.toLowerCase()
                    )
                        {
                            curveName = curveName.replace('_' + (suffix - 1), '') + '_' + suffix;
                            suffix++;
                            return false;
                        }
                        return true;
                    })
                        ;
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
                        startDepth: 0,
                        stopDepth: 0,
                        step: 0,
                        path: '',
                        description: curveDescription
                    }
                    datasets[currentDatasetName].curves.push(curve);
                } else if (sectionName == asciiTitle || new RegExp(dataTitle).test(sectionName)) {

                    fields = fields.concat(customSplit(line.trim(), delimitingChar));
                    const currentDataset = datasets[currentDatasetName];
                    if (fields.length > currentDataset.curves.length) {
                        const count = currentDataset.count;
                        if (count == 0) {
                            currentDataset.top = fields[0];
                        } else if (count == 1) {
                            if (lasVersion == 2 && wellInfo.STEP.value == 0) {
                                currentDataset.step = 0;
                            }
                            else {
                                currentDataset.step = (fields[0] - lastDepth).toFixed(4);
                            }
                        } else {
                            if (currentDataset.step != 0 && !isFloatEqually(fields[0] - lastDepth, currentDataset.step)) {
                                currentDataset.step = 0;
                            }
                        }
                        currentDataset.curves.forEach(function (curve, i) {
                            writeToCurveFile(BUFFERS[curve.name], fields[0], fields[i + 1], wellInfo.NULL.value);
                        });
                        currentDataset.bottom = fields[0];
                        currentDataset.count++
                        lastDepth = fields[0]; //save last depth
                        fields = [];
                    }
                }
            }
        }
        catch (err){
            lasFormatError = "extract failed: " + err;
            rl.close();
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
                const datasetStep = dataset.step;
                dataset.unit = dataset.unit || wellInfo['STRT'].unit;
                if (dataset.step < 0) {
                    dataset.step = (-step).toString();
                    const tmp = dataset.top;
                    dataset.top = dataset.bottom;
                    dataset.bottom = tmp;
                }
                updateWellDepthRange(wellInfo, dataset);
                wellInfo.datasets.push(dataset);
                dataset.curves.forEach(curve => {
                    BUFFERS[curve.name].writeStream.end();
                curve.step = dataset.step;
                curve.startDepth = dataset.top;
                curve.stopDepth = dataset.bottom;
                if (datasetStep < 0) {
                    reverseData(curve.path);
                }
                curve.path = curve.path.replace(config.dataPath + '/', '');
            });
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

function updateWellDepthRange(well, dataset){
    if(dataset.top == 0 && dataset.bottom == 0)
        return 0;
    if(parseFloat(well.STRT.value) > parseFloat(dataset.top)){
        well.STRT.value = dataset.top;
    }
    if(parseFloat(well.STOP.value) < parseFloat(dataset.bottom)){
        well.STOP.value = dataset.bottom;
    }
}

function isFloatEqually(float1, float2){
    const epsilon = 10 ** -7;
    let rFloat1 = Math.round(float1 * 10 ** 6)/10**6;
    let rFloat2 = Math.round(float2 * 10 ** 6)/10**6;
    var delta = Math.abs(rFloat1 - rFloat2);
    return delta < epsilon;
}
