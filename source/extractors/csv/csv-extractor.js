'use strict';

let readline = require('line-by-line');
let fs = require('fs');
let firstline = require('firstline');
let hashDir = require('../hash-dir');
let config = require('../common-config');

function writeFromCsv(buffer, fileName, data, index, defaultNULL) {
    buffer.count += 0;
    if (parseFloat(data) == parseFloat(defaultNULL)) {
        buffer.data += index + ' null' + '\n';
    } else {
        buffer.data += index + ' ' + data + '\n';
    }
    if (buffer.count >= 1000) {
        fs.appendFileSync(fileName, buffer.data);
        buffer.count = 0;
        buffer.data = "";
    }
}

function extractFromCSV(inputURL, importData) {
    return new Promise((resolve, reject) => {
        // let firstLine = firstline(inputURL);
        let rl = new readline(inputURL);
        let fieldsName;
        let filePathes = new Object();
        let BUFFERS = new Object();
        let count = 0;
        let datasets = {};
        let wellInfo = importData.well;
        let logDataIndex = 0;

        // firstLine.then(function (data) {
        // BUFFERS = new Object();
        // count = 0;
        rl.on('line', function (line) {
            line = line.trim();
            if (count == 0) {
                fieldsName = line.split(',');
                fieldsName.forEach(function (fieldName) {
                    BUFFERS[fieldName] = {
                        count: 0,
                        data: ""
                    };
                });
            } else if (count == 1) {
                let dataset = {
                    name: wellInfo.name + logDataIndex,
                    curves: [],
                    top: wellInfo.STRT.value,
                    bottom: wellInfo.STOP.value,
                    step: wellInfo.STEP.value,
                    params: []
                }
                datasets[dataset.name] = dataset;
                let units = line.split(',');
                for (let i = 0; i < units.length; i++) {
                    let curve = {
                        name: fieldsName[i],
                        unit: units[i],
                        datasetname: dataset.name,
                        wellname: wellInfo.name,
                        startDepth: wellInfo.STRT.value,
                        stopDepth: wellInfo.STOP.value,
                        step: wellInfo.STEP.value,
                        path: ''
                    }
                    const hashstr = importData.userInfo.username + wellInfo.name + curve.datasetname + curve.name + curve.unit + curve.step;
                    filePathes[curve.name] = hashDir.createPath(config.dataPath, hashstr, curve.name + '.txt');
                    curve.path = filePathes[curve.name];
                    fs.writeFileSync(filePathes[curve.name], "");
                    datasets[dataset.name].curves.push(curve);
                }
            } else {
                line = line.split(',');
                fieldsName.forEach(function (fieldName, i) {
                    writeFromCsv(BUFFERS[fieldName], filePathes[fieldName], line[i], count - 2, wellInfo.NULL.value);
                });
            }
            count++;
        });

        rl.on('end', function () {
            if (fieldsName) {
                fieldsName.forEach(function (fieldName) {
                    fs.appendFileSync(filePathes[fieldName], BUFFERS[fieldName].data, function (err) {
                        reject('WRONG FORMAT');
                    });
                });
            }

            let output = [];
            wellInfo.datasets = [];
            for (var datasetName in datasets) {
                let dataset = datasets[datasetName];
                wellInfo.datasets.push(dataset);
            }

            output.push(wellInfo);
            resolve(output);

            console.log('Read finished');
            fs.unlinkSync(inputURL);
        });
        // }
        // else {
        //     BUFFERS = "";
        //     rl.on('line', function (line) {
        //         line = line.trim();
        //         let commaPosition = line.indexOf(',');
        //         let fieldName = line.substring(0, commaPosition);
        //         line = line.substring(commaPosition + 1, line.length);
        //         line = line.trim();
        //         line = line.split(',');
        //         line.forEach(function (item, index) {
        //             BUFFERS += index + ' ' + item + '\n';
        //         });
        //         filePathes[fieldName] = hashDir.createPath(config.dataPath, importData.userInfo.username + wellInfo.name + curve.datasetname + curve.name + curve.unit + curve.step, curve.name + '.txt');
        //         fs.writeFileSync(filePathes[fieldName], BUFFERS);
        //         BUFFERS = "";
        //     });

        //     rl.on('end', function () {
        //         console.log('Read finished');
        //     });

        //     rl.on('error', function (err) {
        //         if (err) console.log('ExtractCSV has error', err);
        //         reject(err);
        //     })
        //     // }
        // }, function (err) {
        //     if (err) console.log(err);
        //     reject(err);
        // });
    })
}

module.exports.extractFromCSV = extractFromCSV;