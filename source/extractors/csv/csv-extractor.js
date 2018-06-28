'use strict';

let readline = require('line-by-line');
let fs = require('fs');
let firstline = require('firstline');
let hashDir = require('../hash-dir');

function writeFromCsv(buffer, fileName, data, index) {
    buffer.count += 0;
    buffer.data += index + ' la ' + data + '\n';
    if (buffer.count >= 1000) {
        fs.appendFileSync(fileName, buffer.data);
        buffer.count = 0;
        buffer.data = "";
    }
}

function extractFromCSV(inputURL, projectId, wellId) {
    let firstLine = firstline(inputURL);
    let rl = new readline(inputURL);
    let fieldsName;
    let filePathes = new Object();
    let BUFFERS;
    let count;

    firstLine.then(function (data) {
        if (!/[0-9]/g.test(data)) {
            BUFFERS = new Object();
            count = 0;
            rl.on('line', function (line) {
                line = line.trim();
                if (!/[0-9]/g.test(line)) {
                    fieldsName = line.split(',');
                    fieldsName.forEach(function (fieldName) {
                        BUFFERS[fieldName] = {
                            count: 0,
                            data: ""
                        };
                        filePathes[fieldName] = hashDir.createPath('./data', inputURL + projectId + wellId + fieldName, fieldName + '.txt');
                        fs.writeFile(filePathes[fieldName], "");
                    });
                }
                else {
                    line = line.split(',');
                    fieldsName.forEach(function (fieldName, i) {
                        writeFromCsv(BUFFERS[fieldName], filePathes[fieldName], line[i], count);
                    });
                    count++;
                }
            });

            rl.on('end', function () {
                if (fieldsName) {
                    fieldsName.forEach(function (fieldName) {
                        fs.appendFileSync(filePathes[fieldName], BUFFERS[fieldName].data);
                    });
                }
                console.log('Read finished');
            });
        }
        else {
            BUFFERS = "";
            rl.on('line', function (line) {
                line = line.trim();
                let commaPosition = line.indexOf(',');
                let fieldName = line.substring(0, commaPosition);
                line = line.substring(commaPosition + 1, line.length);
                line = line.trim();
                line = line.split(',');
                line.forEach(function (item, index) {
                    BUFFERS += index + ' la ' + item + '\n';
                });
                filePathes[fieldName] = hashDir.createPath('./data', inputURL + projectId + wellId + fieldName, fieldName + '.txt');
                fs.writeFileSync(filePathes[fieldName], BUFFERS);
                BUFFERS = "";
            });

            rl.on('end', function () {
                console.log('Read finished');
            });

            rl.on('error', function (err) {
                if (err) console.log('ExtractCSV has error', err);
            })
        }
    }, function (err) {
        if (err) console.log(err);
    });
}

module.exports.extractFromCSV = extractFromCSV;