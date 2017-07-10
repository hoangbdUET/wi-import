'use strict';
let readline = require('line-by-line');
let hashDir = require('../../hash-dir');
let fs = require('fs');
let async = require('async');

function writeToCurveFile(buffer, curveFileName, index, value, callback){
    try {
        buffer.count += 1;
        buffer.data += index + " " + value + "\n";
        if (buffer.count >= 500) {
            fs.appendFileSync(curveFileName, buffer.data);
            buffer.count = 0;
            buffer.data = "";
        }
    }
    catch(err) {
        callback(err);
    }

    callback();
}

/*
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
*/

function extractCurves(inputURL, projectId, wellId, pathesCallBack) {
    let rl = new readline(inputURL);
    let curveNames = new Array();
    let count = 0;

    let BUFFERS = new Object();
    let filePathes = new Object();
    let nameSection;
    rl.on('line', function (line) {
        line = line.trim();
        line = line.replace(/\s+\s/g, " ");
        if (/^~A|^~ASCII/g.test(line.toUpperCase())) {
            if(curveNames) {
                curveNames.forEach(function (curveName) {
                    BUFFERS[curveName] = {
                        count: 0,
                        data: ""
                    };
                    filePathes[curveName] = hashDir.createPath( './data', projectId + '-' + wellId + '-' + curveName, curveName + '.txt' );
                    fs.writeFileSync(filePathes[curveName], "");

                });
            }
        }
        else if(/^~/g.test(line.toUpperCase())) {
            nameSection = line.toUpperCase();
        }
        else if(/^[A-z]/g.test(line)) {
            if(/CURVE/g.test(nameSection)) {
                line = line.replace(/([0-9]):([0-9])/g, "$1=$2");
                let dotPosition = line.indexOf('.');
                let fieldName = line.substring(0, dotPosition);
                if(curveNames) {
                    curveNames.push(fieldName.trim());
                }
            }
        }

        else if (/^[0-9][0-9]/g.test(line)) {
            let fields = line.split(" ");
            if(curveNames) {
                curveNames.forEach(function (curveName, i) {
                    writeToCurveFile(BUFFERS[curveName], filePathes[curveName], count, fields[i], function (err) {
                        if(err) console.log('File khong dung format', err);
                    });
                });
                count++;
                // write to curve async
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
        pathesCallBack(filePathes, curveNames);
        console.log("ExtractCurvesFromLAS done");
    });

    rl.on('error', function (err) {
        if(err) console.log("ExtractCurveS has Error", err);
    });
}

function extractWell(inputURL, projectId, wellId, resultCallback) {
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
                if (/[A-z]/.test(line)) {
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
        if(sections) {
            sections.forEach(function (section) {
                if(/CURVE/g.test(section.name)) {
                    extractCurves(inputURL, projectId, wellId, function (pathesCurve, curvesName) {
                        if(curvesName) {
                            curvesName.forEach(function (curveName, i) {
                                section.content[i].data = pathesCurve[curveName];
                            });
                        }
                        resultCallback(JSON.stringify(sections, null, 2));
                    });


                }
            });
        }

    });
}
module.exports.extractCurves = extractCurves;
module.exports.extractWell = extractWell;
