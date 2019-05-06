'use strict';

let readline = require('line-by-line');
let fs = require('fs');
let firstline = require('firstline');
let hashDir = require('../hash-dir');
let config = require('../common-config');

function writeFromCsv(buffer, fileName, value, index, defaultNull, type) {
    let data = "";
    if (!value || parseFloat(value) === parseFloat(defaultNull)) {
        if (type == 'TEXT') data += index + " " + "" + "\n";
        else data += index + " null" + "\n";
    }
    else {
        data += index + " " + value + "\n";
    }
    buffer.writeStream.write(data);
}

function customSplit(str, delimiter) {
    let words;
    if (str.includes('"')) {
        str = str.replace(/"[^"]+"/g, function (match, idx, string) {
            let tmp = match.replace(/"/g, '');
            return '"' + Buffer.from(tmp).toString('base64') + '"';
        })
        words = str.split(delimiter);
        words = words.map(function (word) {
            if (word.includes('"')) {
                return '"' + Buffer.from(word.replace(/"/g, ''), 'base64').toString() + '"';
            }
            else return word;
        })
    } else {
        words = str.split(delimiter);
    }
    return words;
}

function extractFromCSV(inputURL, importData) {
    return new Promise((resolve, reject) => {
        let rl = new readline(inputURL);
        let fieldsName = importData.titleFields;
        let filePathes = new Object();
        let BUFFERS = new Object();
        let count = 0;
        let datasets = {};
        let wellInfo = importData.well;
        let logDataIndex = 0;
        let units = importData.units || [];

        rl.on('line', function (line) {
            line = line.trim();
            if (count == 0) {
                fieldsName.forEach(function (fieldName) {
                    BUFFERS[fieldName] = {
                        count: 0,
                        data: ''
                    };
                });
            } else if (count == 1) {
                let dataset = {
                    name: wellInfo.dataset,
                    curves: [],
                    top: wellInfo.STRT.value,
                    bottom: wellInfo.STOP.value,
                    step: wellInfo.STEP.value,
                    params: [],
                    unit: importData.unitDepth
                };
                datasets[dataset.name] = dataset;
                for (let i = 0; i < fieldsName.length; i++) {
                    let curve = {
                        name: fieldsName[i],
                        unit: units[i] || '',
                        datasetname: dataset.name,
                        wellname: wellInfo.name,
                        startDepth: wellInfo.STRT.value,
                        stopDepth: wellInfo.STOP.value,
                        step: wellInfo.STEP.value,
                        path: ''
                    };
                    const hashstr =
                        importData.userInfo.username +
                        wellInfo.name +
                        curve.datasetname +
                        curve.name +
                        curve.unit +
                        curve.step;
                    filePathes[curve.name] = hashDir.createPath(
                        config.dataPath,
                        hashstr,
                        curve.name + '.txt'
                    );
                    curve.path = filePathes[curve.name].replace(
                        config.dataPath + '/',
                        ''
                    );
                    fs.writeFileSync(filePathes[curve.name], '');
                    datasets[dataset.name].curves.push(curve);
                    BUFFERS[curve.name] = {
                        writeStream: fs.createWriteStream(filePathes[curve.name])
                    };
                }
            } else {
                line = customSplit(line, ',');
                fieldsName.forEach(function (fieldName, i) {
                    let _format = datasets[wellInfo.dataset].curves[i].type;
                    if (
                        _format != 'TEXT' &&
                        parseFloat(line[i + 1]) != parseFloat(wellInfo.NULL.value)
                    ) {
                        if (isNaN(line[i + 1])) {
                            _format = 'TEXT';
                        }
                        datasets[wellInfo.dataset].curves[i].type = _format;
                    }
                    if (importData.coreData) {
                        writeFromCsv(
                            BUFFERS[fieldName],
                            filePathes[fieldName],
                            line[i + 1],
                            line[0],
                            wellInfo.NULL.value,
                            _format
                        );
                    } else {
                        writeFromCsv(
                            BUFFERS[fieldName],
                            filePathes[fieldName],
                            line[i + 1],
                            count - 2,
                            wellInfo.NULL.value,
                            _format
                        );
                    }
                });
            }
            count++;
        });

        rl.on('end', function () {
            if (fieldsName) {
                fieldsName.forEach(function (fieldName) {
                    BUFFERS[fieldName].writeStream.end();
                });
            }

            let output = [];
            wellInfo.datasets = [];
            delete wellInfo.dataset;
            for (var datasetName in datasets) {
                let dataset = datasets[datasetName];
                wellInfo.datasets.push(dataset);
            }

            output.push(wellInfo);
            resolve(output);

            console.log('Read finished');
            fs.unlinkSync(inputURL);
        });
    });
}

module.exports.extractFromCSV = extractFromCSV;
