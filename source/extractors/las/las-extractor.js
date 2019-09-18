'use strict';
let readline = require('line-by-line');
let hashDir = require('../hash-dir');
let fs = require('fs');
let config = require('../common-config');
let os = require('os');
const detectCharacterEncoding = os.type() === "Windows_NT" ? null : require('detect-character-encoding');

function writeToCurveFile(buffer, index, value, defaultNull) {
    let data = "";
    if(buffer.count == 0){
        data += index;
    }
    if (parseFloat(value) === parseFloat(defaultNull)) {
        data += " null"
    }
    else {
        data += " " + value;
    }
    buffer.count += 1;
    if(buffer.count == buffer.curveDimension){
        data += "\n";
        buffer.count = 0;
    }
    buffer.writeStream.write(data);
}
function customSplit(str, delimiter){
    let words;
    if(str.includes('"')){
        str = str.replace(/"(.*?)"/g, function (match, idx, string){
            let tmp = match.replace(/"/g, '');
            return '"' + Buffer.from(tmp).toString('base64') + '"';
        })
        words = str.split(delimiter);
        words = words.map(function(word){
            if(word.includes('"')){
                return '"' + Buffer.from(word.replace(/"/g, ''), 'base64').toString() + '"';
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
    let wrapMode = false;

    rl.on('line', function (line) {
        try {
            line = line.trim().replace(/\s+\s/g, " ");
            if(delimitingChar != "\t"){
                line = line.replace(/\t/g, " ");
            }
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

                if (/VERSION/.test(sectionName) || sectionName == "V") {
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
                        count: 0,
                        buffers: {}
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
                        count: 0,
                        buffers: {}
                    }
                    datasets[datasetName] = dataset;
                    currentDatasetName = datasetName;
                }

                console.log('section name: ' + sectionName)
                if (sectionName == asciiTitle || new RegExp(dataTitle).test(sectionName)) {

                    if (sectionName == asciiTitle) currentDatasetName = wellInfo.name + logDataIndex;
                    const _cDataset = datasets[currentDatasetName];
                    _cDataset.curves.forEach(curve => {
                        const _cName = curve.name.replace(/\[(.*?)\]/g, "");
                    const _hashstr = importData.userInfo.username + wellInfo.name + curve.datasetname + _cName + curve.unit + curve.step;
                    const _filePath = hashDir.createPath(config.dataPath, _hashstr, _cName + '.txt');
                    curve.path = _filePath;
                    if(!_cDataset.buffers[_cName] || !_cDataset.buffers[_cName].writeStream) {
                        fs.writeFileSync(_filePath, "");
                        _cDataset.buffers[_cName] = {
                            curveDimension: 1,
                            writeStream: fs.createWriteStream(_filePath),
                            count: 0
                        };
                    }
                    else {
                        _cDataset.buffers[_cName].curveDimension += 1;
                    }
                })
                }
            }
            else {
                if (sectionName != asciiTitle && !new RegExp(dataTitle).test(sectionName)
                    && sectionName != 'O' && line.indexOf(':') < 0) {
                    lasFormatError = 'WRONG FORMAT';
                    return rl.close();
                }

                if (/VERSION/.test(sectionName) || sectionName == "V") {
                    const dotPosition = line.indexOf('.');
                    const colon = line.indexOf(':');
                    const valueStr = line.substring(dotPosition + 1, colon).trim();
                    if (/VERS/.test(line)) {
                        /2/.test(valueStr) ? lasVersion = 2 : lasVersion = 3;
                        if (lasVersion == 2) {
                            wellTitle = 'W';
                            curveTitle = 'C';
                            asciiTitle = 'A';
                            parameterTitle = 'P';
                        }
                        console.log('LAS VERSION: ' + lasVersion)
                    } else if (/DLM/.test(line)) {
                        delimitingChar = valueStr == 'COMMA' ? ',' : ' ';
                    } else if(/WRAP/.test(line)){
                        if(lasVersion == 2 && valueStr == 'YES'){
                            wrapMode = true;
                        } else {
                            wrapMode = false;
                        }
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
                        const unit = line.substring(0, line.indexOf(' ')).trim();
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

                    const idx_first_space = line.indexOf(' ');
                    const idx_last_colon = line.lastIndexOf(':');
                    const idx_left_brace = line.lastIndexOf('{');
                    const idx_right_brace = line.lastIndexOf('}');
                    const idx_bar = line.lastIndexOf('|');
                    let idx_end_description = line.length;
                    if(idx_bar > 0){
                        idx_end_description = idx_bar;
                    }
                    if(idx_left_brace > 0){
                        idx_end_description = idx_left_brace;
                    }

                    let _format = 'F';

                    let unit = line.substring(0, idx_first_space).trim();
                    if (unit.indexOf("00") != -1) unit = unit.substring(0, unit.indexOf("00"));

                    const curveDescription = line.substring(idx_last_colon + 1, idx_end_description).trim();
                    if(idx_left_brace > 0 && idx_right_brace > 0){
                        _format = line.substring(idx_left_brace + 1, idx_right_brace).trim()[0];
                    }

                    let curve = {
                        name: curveName,
                        unit: unit,
                        datasetname: currentDatasetName,
                        wellname: wellInfo.name,
                        startDepth: 0,
                        stopDepth: 0,
                        step: 0,
                        path: '',
                        description: curveDescription,
                        type: _format == 'S' || _format == 's' ? 'TEXT' : 'NUMBER',
                        dimension: 1
                    }
                    datasets[currentDatasetName].curves.push(curve);
                } else if (sectionName == asciiTitle || new RegExp(dataTitle).test(sectionName)) {
                    const currentDataset = datasets[currentDatasetName];
                    fields = fields.concat(customSplit(line.trim(), delimitingChar));
                    // stop parsing if this file is not in wrap mode and do not have enough data for every curves on each line
                    if(!wrapMode && fields.length <= currentDataset.curves.length){
                        lasFormatError = "This file do node have enough data for every curves";
                        rl.close();
                    }
                    // stop parsing if number of curves less than number of data columns
                    if(fields.length  > currentDataset.curves.length + 1){
                        lasFormatError = "number of curves less than number of data columns";
                        rl.close();
                    }
                    if (fields.length == currentDataset.curves.length + 1) {
                        const count = currentDataset.count;
                        const _depth = parseFloat(fields[0]);
                        if (count == 0) {
                            currentDataset.top = _depth;
                            currentDataset.bottom = _depth;
                        } else if (count == 1) {
                            if (lasVersion == 2 && wellInfo.STEP.value == 0) {
                                currentDataset.step = 0;
                            }
                            else {
                                currentDataset.step = (_depth - lastDepth).toFixed(4);
                            }
                        } else {
                            if (currentDataset.step != 0 && !isFloatEqually(_depth - lastDepth, currentDataset.step)) {
                                currentDataset.step = 0;
                            }
                        }
                        currentDataset.curves.forEach(function (curve, i) {
                            if(curve.type != "TEXT" && fields[i+1].includes('"')){
                                curve.type = "TEXT";
                            }
                            writeToCurveFile(currentDataset.buffers[curve.name.replace(/\[(.*?)\]/g, "")], _depth, fields[i + 1], wellInfo.NULL.value);
                        });
                        if(_depth < currentDataset.top){
                            currentDataset.top = _depth;
                        }
                        if(_depth > currentDataset.bottom){
                            currentDataset.bottom = _depth;
                        }
                        currentDataset.count++
                        lastDepth = _depth; //save last depth
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
            if (lasCheck != 2) {
                console.log('=> ' + lasFormatError)
                lasFormatError = 'THIS IS NOT LAS FILE, MISSING DATA SECTION';
            }
            if (lasFormatError && lasFormatError.length > 0) {
                for(var datasetName in datasets){
                    const dataset = datasets[datasetName];
                    dataset.curves.forEach(curve => {
                        if(dataset.buffers[curve.name] && dataset.buffers[curve.name].writeStream) {
                        dataset.buffers[curve.name].writeStream.end();
                        fs.unlinkSync(curve.path);
                    }
                })
                }
                return reject(lasFormatError);
            }

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
                    dataset.step = (-datasetStep).toString();
                }
                updateWellDepthRange(wellInfo, dataset);
                wellInfo.datasets.push(dataset);
                const _curveNames = []
                for(let i = dataset.curves.length - 1; i >= 0; i--){
                    const curve = dataset.curves[i];
                    curve.name = curve.name.replace(/\[(.*?)\]/g, "");
                    curve.dimension = dataset.buffers[curve.name].curveDimension;
                    if(curve.dimension > 1) curve.type = "ARRAY";
                    if(!_curveNames.includes(curve.name)){
                        _curveNames.push(curve.name);
                        dataset.buffers[curve.name].writeStream.end();
                        curve.step = dataset.step;
                        curve.startDepth = dataset.top;
                        curve.stopDepth = dataset.bottom;
                        if (datasetStep < 0) {
                            reverseData(curve.path);
                        }
                        curve.path = curve.path.replace(config.dataPath + '/', '');
                    }
                    else{
                        dataset.curves.splice(i, 1);
                    }
                }
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
