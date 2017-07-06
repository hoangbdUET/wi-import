'use strict';
let readline = require('line-by-line');
let hashDir = require('../hash-dir');
let fs = require('fs');
let async = require('async');

var outputDir = './data/';

function writeToCurveFile(buffer, curveFileName, index, value){
    buffer.count += 1;
    buffer.data += index + " " + value + "\n";
    if (buffer.count >= 500) {
        fs.appendFileSync(curveFileName, buffer.data);
        buffer.count = 0;
        buffer.data = "";
    }
}
function writeToCurveFileAsync(buffer, curveFileName, index, value, callback){
    buffer.count += 1;
    buffer.data += index + " " + value + "\n";
    if (buffer.count >= 500) {
        fs.appendFile(curveFileName, buffer.data, function (err) {
            if (err) throw err;
            buffer.count = 0;
            buffer.data = "";
            callback();
        });
    }
    else {
        calback();
    }
}

function extractCurves(inputURL, projectId, wellId) {
    let rl = new readline(inputURL);
    let curveNames;
    let count = 0;

    let BUFFERS = new Object();
    let filePathes = new Object();

    rl.on('line', function (line) {
        line = line.trim();
        line = line.replace(/\s+\s/g, " ");

        if (/^~A/.test(line.toUpperCase())) {
            line = line.slice(3);
            curveNames = line.split(" ");
            curveNames.forEach(function (curveName) {
                BUFFERS[curveName] = {
                    count: 0,
                    data: ""
                };
                filePathes[curveName] = hashDir.createPath( '.', projectId + '-' + wellId + '-' + curveName, curveName + '.txt' );
                fs.writeFileSync(filePathes[curveName], "");

            });
        }
        else if (/^[0-9]/.test(line)) {
            let fields = line.split(" ");
            if(curveNames) {
                curveNames.forEach(function (curveName, i) {
                    writeToCurveFile(BUFFERS[curveName], filePathes[curveName], count, fields[i]);
                });
                count++;
                /*
                async.forEachOf(curveNames, function(curveName, i, callback) {
                    writeToCurveFileAsync(BUFFERS[curveName], filePathes[curveName], count, fields[i], function() {
                        callback();
                    });
                }, function(err) {
                    count++;
                });
                */
            }
        }
    });
    rl.on('end', function () {
        if(curveNames) {
            curveNames.forEach(function(curveName) {
                fs.appendFileSync(filePathes[curveName], BUFFERS[curveName].data);
            });
        }

        console.log("ExtractCurvesFromLAS done");
    });

    rl.on('error', function (err) {
        console.log("ExtractCurvesFromLAS error", err);
    });
}

function extractWell(inputURL, resultCallback) {
    let rl = new readline(inputURL);
    let sections = new Array();
    let currentSection = null;

    rl.on('line', function(line) {
        line = line.trim();
        if(/^~A/.test(line)) { //
            // end case
            rl.close();
        }
        else if (line === '') { // skip blank line
        }
        else if (/^#/.test(line)) { // skip line with leading '#'
        }
        else if (/^~/.test(line)) { // beginning of a section
            if (currentSection) {
                sections.push(currentSection);
            }

            currentSection = new Object();
            currentSection.name = line.toUpperCase();
            currentSection.content = new Array();
        }
        else {
            if (currentSection) {
                if (/^[A-z]/.test(line)) {
                    line = line.replace(/([0-9]):([0-9])/g, "$1=$2");
                    let dotPosition = line.indexOf('.');
                    let fieldName = line.substring(0, dotPosition);
                    let remainingString = line.substring(dotPosition, line.length).trim();
                    let firstSpaceAfterDotPos = remainingString.indexOf(' ');
                    let secondField = remainingString.substring(0, firstSpaceAfterDotPos);
                    remainingString = remainingString.substring(firstSpaceAfterDotPos, remainingString.length).trim();
                    let colonPosition = remainingString.indexOf(':');

                    if( colonPosition < 0 ) {
                        colonPosition = remainingString.length;
                    }
                    let fieldDescription = remainingString.substring(colonPosition, remainingString.length);
                    let thirdField = remainingString.substring(0, colonPosition).trim();
                    thirdField = thirdField.replace(/([0-9])=([0-9])/g, '$1:$2');
                    currentSection.content.push({
                        name: fieldName.trim(),
                        unit: secondField.trim(),
                        data: thirdField,
                        description: fieldDescription.trim()
                    });

                }
            }
        }

    });
    rl.on('end', function() {
        if (currentSection) {
            sections.push(currentSection);
        }
        resultCallback(JSON.stringify(sections, null, 2));
    });
}
module.exports.extractCurves = extractCurves;
module.exports.extractWell = extractWell;
