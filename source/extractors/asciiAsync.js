'use strict';

let async = require('async');
let URL = require('./wlog/url.config.js').URL;
let readline = require('line-by-line');
let fs = require('fs');

let wlogConfig = require('./wlog/wlog.config');
let Settings = wlogConfig.SETTINGS;
let outDir = Settings.outputDir;

function writeToFile(buffer, fileName, index, data) {
    buffer.count += 1;
    buffer.data += index + ' la ' + data + '\n';
    if(buffer.count >= 1000) {
        fs.appendFile(fileName, buffer.data, function (err) {
            if(err) console.log(err);
        });
        buffer.count = 0;
        buffer.data = "";
    }
}

function __extractFromASCAsync(inputURL, fileName) {
    let rl = new readline(inputURL);
    let token;
    let fieldNames;
    let dataFields;
    let BUFFERS = new Object();
    let count = 0;
    let wellName;
    let countWell = 1;
    let DIR;
    let unitList;
    let unit = 'UNIT: ';
    rl.on('line', function (line) {
        DIR = outDir + countWell + fileName + '_';
        line = line.trim();
        if(/^\$ASCII/.test(line.toUpperCase())) {
            let bigToken = line.split(':');
            token = bigToken[1].trim().split(' ');
        }
        else if(/DATASET/g.test(line.toUpperCase())) {
            console.log('true');
        }
        else if(new RegExp(token[0]).test(line)) {
            line = line.replace(/\t/g, ' ');
            line = line.replace(/\s+\s/g,' ');
            fieldNames = line.split(' ');
            // fieldNames.forEach(function (fieldName) {
            //     BUFFERS[fieldName] = {
            //         count: 0,
            //         data: ""
            //     };
            //     fs.writeFileSync(DIR + fieldName, "");
            // });
        }
        else if(/^\./g.test(line)) {

            line = line.replace(/\t/g, ' ');
            line = line.replace(/\s+\s/g,' ');
            unitList = line.split(' ');
            fieldNames.forEach(function (fieldName, i) {
                BUFFERS[fieldName] = {
                    count: 0,
                    data: ""
                };
                fs.writeFile(DIR + fieldName, unit + unitList[i] + '\n', function (err) {
                    if(err) console.log(err);
                });
            });
        }
        else if (/^[A-z]|^[0-9]/g.test(line)) {
            line = line.replace(/\t/g, ' ');
            line = line.replace(/\s+\s/g, ' ')
            dataFields = line.split(' ');
            fieldNames.forEach(function (fieldName, i) {
                writeToFile(BUFFERS[fieldName], DIR + fieldName, count, dataFields[i]);
            });
            count++;
            if(wellName) {
                if(!(new RegExp(wellName)).test(dataFields[0])) {
                    fieldNames.forEach(function (fieldName) {
                        fs.appendFile(DIR + fieldName, BUFFERS[fieldName].data, function (err) {
                            if(err) console.log(err);
                        });
                    });
                    countWell++;
                    DIR = outDir + countWell + fileName + '_';
                    fieldNames.forEach(function (fieldName, i) {

                        BUFFERS[fieldName] = {
                            count:0,
                            data: ""
                        };
                        fs.writeFile(DIR + fieldName, unit + unitList[i] + '\n', function (err) {
                            if(err) console.log(err);
                        });
                    });
                    count = 0;
                }
            }
            wellName = dataFields[0];
        }
    });

    rl.on('end', function () {
        fieldNames.forEach(function (fieldName) {
            fs.appendFile(DIR + fieldName, BUFFERS[fieldName].data, function (err) {
                if(err) console.log(err);
            });
        });
        console.log('ExtractFromASC done');
        console.timeEnd('Runtime is ');
    });

    rl.on('err', function (err) {
        console.log(err);
    });
}

function extractFromASCAsync(inputURL) {
    let inFileArray = inputURL.split(/[\/]/);
    let fileName = inFileArray[inFileArray.length - 1].split('.')[0];

    fs.exists(outDir, function (exists) {
            if (exists) console.log('Folder exists');
            fs.mkdir(outDir, function (err) {
                if(err) conso
            });
    });
    __extractFromASCAsync(inputURL, fileName);

}

console.time('Runtime is ');
console.log(URL);

async.each(URL, function (url) {
    extractFromASCAsync(url.path);
}, function (err) {
    if(err) console.log(err);
});



module.exports.extractFromASCAsync = extractFromASCAsync;
