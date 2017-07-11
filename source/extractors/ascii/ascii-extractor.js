'use strict';
let readline = require('line-by-line');
let fs = require('fs');
let hashDir = require('../../hash-dir');

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

function extractFromASC(inputURL, projectId, wellId, resultCallBack) {
    console.time('Runtime is : '); //Start runtime program
    let rl = new readline(inputURL);
    let token;
    let fieldNames;
    let dataFields;
    let BUFFERS = new Object();
    let count = 0;
    let wellName;
    let countWell = 1;
    let filePathes = new Object();
    let unitList = new Array();
    let unit = 'UNIT is  ';
    let currentWell = null;
    let fieldCurve = new Array();

    rl.on('line', function (line) {
        line = line.trim();
        if (/OTHER/g.test(line.toUpperCase())) {
            rl.close();
        }
        if (/^\$ASCII/.test(line.toUpperCase())) {
            let bigToken = line.split(':');
            token = bigToken[1].trim().split(' ');
        }
        else if (/DATASET/.test(line.toUpperCase())) { //skip line Dataset
        }
        else if (new RegExp(token[0]).test(line)) {
            line = line.replace(/\t/g, ' ');
            line = line.replace(/\s+\s/g, ' ');
            let spacePosititon = line.indexOf(' ');
            currentWell = new Object();
            currentWell.fieldWell = line.substring(0, spacePosititon);
            fieldNames = line.substring(spacePosititon + 1, line.length).split(' ');
        }
        else if (/^\./g.test(line)) {
            line = line.replace(/\t/g, ' ');
            line = line.replace(/\s+\s/g, ' ');
            let spacePosition = line.indexOf(' ');
            currentWell.unitWell = line.substring(0, spacePosition);
            currentWell.data = new Array();
            unitList = line.substring(spacePosition + 1, line.length).split(' ');
            if (fieldNames) {
                fieldNames.forEach(function (fieldName, i) {
                    BUFFERS[fieldName] = {
                        count: 0,
                        data: ""
                    };

                    filePathes[fieldName] = hashDir.createPath('./data', inputURL + projectId + wellId + countWell + fieldName, fieldName + '.txt');
                    fieldCurve.push({
                        name: fieldName,
                        unit: unitList[i],
                        data: filePathes[fieldName]
                    });
                    unitList[i] = unit + unitList[i] + '\n';
                    fs.writeFileSync(filePathes[fieldName], unitList[i]);
                });
            }
        }
        else if (/^[A-z]|^[0-9]/g.test(line)) {
            line = line.replace(/\t/g, ' ');
            line = line.replace(/\s+\s/g, ' ')
            dataFields = line.split(' ');
            fieldNames.forEach(function (fieldName, i) {
                writeToFile(BUFFERS[fieldName], filePathes[fieldName], count, dataFields[i], function (err) {
                    if (err) console.log("File format is nt true", err);
                });
            });
            count++;
            if (wellName) {
                if (!(new RegExp(wellName)).test(dataFields[0])) {
                    currentWell.data.push({
                        wellName: wellName,
                        fieldsCurve: fieldCurve
                    });
                    fieldNames.forEach(function (fieldName) {
                        fs.appendFileSync(filePathes[fieldName], BUFFERS[fieldName].data);
                    });
                    countWell++;
                    fieldNames.forEach(function (fieldName, i) {
                        BUFFERS[fieldName] = {
                            count: 0,
                            data: ""
                        };

                        unitList[i] = unit + unitList[i] + '\n';
                        filePathes[fieldName] = hashDir.createPath('./data/', projectId + '_' + wellId + '_' + countWell + '_' + fieldName, fieldName + '.txt');
                        fs.writeFileSync(filePathes[fieldName], unitList[i]);
                    });
                    count = 0;
                }
            }
            wellName = dataFields[0];
        }
    });

    rl.on('end', function () {
        if (fieldNames) {
            fieldNames.forEach(function (fieldName) {
                fs.appendFileSync(filePathes[fieldName], BUFFERS[fieldName].data);
            });
        }
        if (currentWell) {
            currentWell.data.push({
                wellName: wellName,
                fieldsCurve: fieldCurve
            })
        }
        resultCallBack(JSON.stringify(currentWell, null, 2));
        console.log('ExtractFromASC done');
        console.timeEnd('Runtime is : '); // End runtime and print time process program
    });

    rl.on('err', function (err) {
        if (err) console.log('ExtractFromAsc has error', err);
    });
}


module.exports.extractFromASC = extractFromASC;
