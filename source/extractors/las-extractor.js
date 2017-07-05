'use strict';

let readline = require('line-by-line');
let fs = require('fs');

let wlogConfig = require('./wlog/wlog.config');
let Settings = wlogConfig.SETTINGS;
let outputDir  = Settings.outputDir;


function writeToCurveFile(buffer, curveFileName, index, value){
    buffer.count += 1;
    buffer.data += index + " " + value + "\n";
    if (buffer.count >= 500) {
        fs.appendFileSync(curveFileName, buffer.data);
        buffer.count = 0;
        buffer.data = "";
    }
}

function __extractCurvesFromLAS(inputURL, fileName) {
    let rl = new readline(inputURL);
    let curveNames;
    let count = 0;
    let BUFFERS = new Object();
    let DIR = outputDir + fileName + '_';

    rl.on('line', function (line) {
        line = line.trim();
        line = line.replace(/\s+\s/g, " ");

        if (/^~A |^~ASCII/.test(line.toUpperCase())) {
            line = line.slice(3);
            curveNames = line.split(" ");
            curveNames.forEach(function (curveName) {
                BUFFERS[curveName] = {
                    count: 0,
                    data: ""
                };
                fs.writeFileSync(DIR + curveName, "");

            });
        }
        else if (/^[0-9]/.test(line)) {
            let fields = line.split(" ");
            if(curveNames) {
                curveNames.forEach(function (curveName, i) {
                    writeToCurveFile(BUFFERS[curveName], DIR + curveName, count, fields[i]);
                });
                count++;
            }

        }
    });
    rl.on('end', function () {
        if(curveNames) {
            curveNames.forEach(function(curveName) {
                //flushToCurveFile(BUFFERS[curveName], outputDir + curveName);
                fs.appendFileSync(DIR + curveName, BUFFERS[curveName].data);
            });
        }

        console.log("ExtractCurvesFromLAS done");
    });

    rl.on('error', function (err) {
        console.log("ExtractCurvesFromLAS error", err);
    });
}

function extractCurvesFromLAS(inFile) {
    let inFileArray = inFile.split(/[\/]/);

    let fileName = inFileArray[inFileArray.length - 1].split('.')[0];
    if(!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }
    __extractCurvesFromLAS(inFile, fileName);
}

function __extractWellFromLAS2(inputURL, fileName) {
    let rl = new readline(inputURL);
    let sections = new Array();
    let currentSection = null;
    let DIR = outputDir + fileName + '_';

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
        fs.writeFileSync(DIR + fileName + ".json", JSON.stringify({sections: sections}, null, 4));
        console.log("ExtractWellFromLAS done");
    });
}

function extractWellFromLAS2(inFile) {
    let inFileArray = inFile.split(/[\/]/);

    let fileName = inFileArray[inFileArray.length - 1].split('.')[0];

    if(!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    __extractWellFromLAS2(inFile, fileName);
}

function writeToWellFromLAS3(buffer, fieldsNameOfSection, index, filedData) {
    buffer.count += 1;
    buffer.data += index + ' la ' + filedData + '\n';
    if(buffer.count >= 500) {
        fs.appendFileSync(fieldsNameOfSection, buffer.data);
        buffer.count = 0;
        buffer.data = "";
    }
}

function __extractWellFromLAS3(inputURL, fileName) {
    let rl = new readline(inputURL);
    let sections = new Array();
    let currentSection = null;
    let fieldName = null;
    let BUFFER= new Object();
    let count = 0;
    let DIR = outputDir + fileName + '_';
    rl.on('line', function(line) {
        line = line.trim();
        if(/^~ASCII/.test(line.toUpperCase())) { //
            // end case and push last currentSection

            rl.close();
        }
        else if (/^&&/g.test(line)) {
            rl.close();
        }
        else if (line === '') { // skip blank line
        }
        else if (/^#/.test(line)) { // skip line with leading '#'
        }
        else if (/^~/.test(line)) { // beginning of a section
            if(fieldName) {
                if((new RegExp(fieldName.name.slice(1))).test(currentSection.name)) {
                    fieldName.content.forEach(function (data) {
                        fs.appendFileSync(DIR + fieldName.name + '_' + data.name, BUFFER[data.name].data);
                    });
                }
            }
            if (currentSection) {
                sections.push(currentSection);
                fieldName = new Object();
                fieldName = currentSection;
                count = 0;
            }

            currentSection = new Object();
            currentSection.name = line.toUpperCase();
            currentSection.content = new Array();
            if(fieldName) {
                if((new RegExp(fieldName.name.slice(1))).test(currentSection.name)) {

                    fieldName.content.forEach(function (data) {
                        BUFFER[data.name] = {
                            count : 0,
                            data : outputDir + fieldName.name + '_' + data.name + '\n'
                        };
                        fs.writeFileSync(DIR + fieldName.name + '_' + data.name, "");
                    });
                }
            }
        }
        else if (/^[0-9]/g.test(line)) {
            if((new RegExp(fieldName.name.slice(1))).test(currentSection.name)) {
                if(fieldName.content) {
                    line = line.split(',');
                    fieldName.content.forEach(function (data, i) {
                        writeToWellFromLAS3(BUFFER[data.name], DIR + fieldName.name + '_' + data.name, count, line[i]);
                    });
                    count++;
                }
            }
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
        sections.push(currentSection);
        if(fieldName) {
            if((new RegExp(fieldName.name.slice(1))).test(currentSection.name)) {
                fieldName.content.forEach(function (data) {
                    fs.appendFileSync(DIR + fieldName.name + '_' + data.name, BUFFER[data.name].data);
                });
            }
        }

        fs.writeFileSync(DIR + fileName + ".json", JSON.stringify({sections: sections}, null, 4));
        console.log("ExtractWellFromLAS done");
    });
}

function extractWellFromLAS3(inFile) {
    let inFileArray = inFile.split(/[\/]/);
    let fileName = inFileArray[inFileArray.length - 1].split('.')[0];

    if(!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    __extractWellFromLAS3(inFile, fileName);
}

module.exports.extractCurvesFromLAS = extractCurvesFromLAS;
module.exports.extractWellFromLAS2 = extractWellFromLAS2;
module.exports.extractWellFromLAS3 = extractWellFromLAS3;