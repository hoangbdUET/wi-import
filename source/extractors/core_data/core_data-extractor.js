'use strict'

const readline = require('line-by-line');
const fs = require('fs');
let hashDir = require('../hash-dir');
const config = require('config');

function writeToCurveFile(buffer, curveFilePath, index, value, defaultNull) {
    buffer.count ++;
    if (value == defaultNull) {
        buffer.data += index + " null" + "\n";
    }
    else {
        buffer.data += index + " " + value + "\n";
    }
    if (buffer.count >= 1000) {
        fs.appendFileSync(curveFilePath, buffer.data);
        buffer.count = 0;
        buffer.data = "";
    }
}

module.exports = function(inputFile, importData, cb) {
    //importData.isUnitsRow
    const fileName = inputFile.originalname.substring(0, inputFile.originalname.lastIndexOf('.'));
    const fileFormat = inputFile.originalname.substring(inputFile.originalname.lastIndexOf('.') + 1);
    console.log('======> ' + importData.isUnitsRow)

    const rl = new readline(inputFile.path, {skipEmptyLines : true});
    let curveNames = [];
    let units = [];
    let wells = [];
    let currentWell = importData.well? importData.well : { name : ''};
    let lineIndex = 0;
    let count = 1;
    let BUFFERS = new Object();
    let lastDepth = '';

    rl.on('line', line => {
        lineIndex++;
        line = line.trim();
        const lineSplited = line.split(',');

        if(lineIndex == 1){
            curveNames = lineSplited.slice(2);
            curveNames.forEach((name, i) => {
                name.replace('/', '_');
                let suffix = 0;
                while (true){
                    let rename = curveNames.every((curveName, idx) => {
                        if(curveName.toLowerCase() == name.toLowerCase() && i != idx){
                            name = name.replace('_' + suffix, '');
                            suffix++;
                            name = name + '_' + suffix;
                            return false;
                        }
                        return true;
                    });
                    if(rename) break;
                }
                curveNames[i] = name;
            })
            console.log(curveNames.join(','));
        }
        else if(importData.isUnitsRow && lineIndex == 2){
            units = lineSplited;
            console.log(units.join('/'))
        }
        else {
            if(lineSplited[0] != currentWell.name){
                wells.forEach(well=>{
                    if(well.name == currentWell.name){
                        well.STOP = lastDepth;
                        well.STEP = (well.STOP - well.STRT)/well.datasets[0].curves.length;
                        well.datasets.forEach(dataset=> {
                            dataset.bottom = lastDepth;
                            dataset.step = well.STEP;
                            dataset.curves.forEach(curve => {
                                curve.step = well.STEP;
                                curve.stopDepth = lastDepth;
                            })
                        })
                    }
                })
                currentWell = {
                    name: lineSplited[0],
                    filename: fileName,
                    STRT: lineSplited[1],
                    STOP: '',
                    STEP: '',
                    datasets: []
                }
                let dataset = {
                    name: lineSplited[0],
                    top: lineSplited[1],
                    bottom: '',
                    step: '',
                    curves: []
                }
                curveNames.forEach((curveName, idx) => {
                    const path = hashDir.createPath(config.dataPath, importData.userInfor.username + currentWell.name + dataset.name + curveName, curveName + '.txt');
                    fs.writeFileSync(path, '');
                    let curve = {
                        name: curveName,
                        unit : units.length > 0 ? units[idx + 2] : '',
                        datasetname : dataset.name,
                        wellname: currentWell.name,
                        startDepth : lineSplited[1],
                        stopDepth : '',
                        step : '',
                        path: path
                    }
                    BUFFERS[curve.name] = {
                        count: 0,
                        data: ""
                    };
                    dataset.curves.push(curve);
                })

                currentWell.datasets.push(dataset)
                wells.push(currentWell);
                count = 1;
            }
            else {
                currentWell.datasets[0].curves.forEach((curve, i) => {
                    writeToCurveFile(BUFFERS[curve.name], curve.path, count, lineSplited[i + 2], '-9999');
                })
                count++;
            }
        }
        lastDepth = lineSplited[1];
    })

    rl.on('end', () => {
        wells.forEach(well=> {
            well.datasets.forEach(dataset => {
                dataset.curves.forEach(curve=> {
                    fs.appendFileSync(curve.path, BUFFERS[curve.name].data);
                    curve.path = curve.path.replace(config.dataPath + '/', '');
                })
            })
        })
        cb(null, wells);
    })
}