'use strict'

const readline = require('line-by-line');
const fs = require('fs');
let hashDir = require('../hash-dir');
const config = require('config');
const s3 = require('../../server/s3');

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

function extractCurves(file, importData, cb) {

    //importData.well
    //importData.well.datasets
    //importData.columnFormat = 1/2/3/4
    //importData.curveNameStartAt
    //importData.curveUnitStartAt
    //importData.curveDataStartAt
    //importData.userInfo.username
    //importData.datasetsStartAt
    console.log('===extractCurves: ' + JSON.stringify(importData));

    const fileName = file.originalname.substring(0, file.originalname.lastIndexOf('.'));
    const fileFormat = file.originalname.substring(file.originalname.lastIndexOf('.') + 1);

    if(fileFormat != 'csv' && fileFormat != 'asc') return cb('This is not csv or asc file');
    const isAddToWell = importData.well ? true : false ;
    const isAddToDataset = isAddToWell && importData.well.datasets && importData.well.datasets.length > 0;
    let wells = {};
    let currentWell = null;
    if(isAddToWell) {
        wells[importData.well.name] = Object.assign({}, importData.well);
        wells[importData.well.name].datasets = {};
        if(isAddToDataset) wells[importData.well.name].datasets[importData.well.datasets[0].name] = importData.well.datasets[0];
    }
    let datasets = isAddToDataset ? [importData.well.datasets[0].name] : [];
    let curves = [];

    let rl = new readline(file.path);
    let lineNumber = 0;
    let count = 0;
    let buffers = {};

    let startColumn = 1;
    switch (importData.columnFormat){
        case '1':
            startColumn = 1;
            break;
        case '2':
        case '3':
            startColumn = 2;
            break;
        case '4':
            startColumn = 3;
            break;
    }

    let separator = fileFormat == 'csv' ? ',' : /\s|,/;


    rl.on('line', line => {
        lineNumber++;
        line = line.trim();
        // line = line.replace(/\s+\s/g, " ");
        if(lineNumber >= importData.curveDataStartAt){
            count ++;
            let curvesData = line.split(separator);
            const wellname = isAddToWell? importData.well.name : importData.columnFormat == 1 ? fileName : curvesData[0];
            if(wellname != currentWell){
                if(!wells[wellname]) wells[wellname] = {
                    name : wellname,
                    datasets : {},
                    filename: file.originalname
                };
                // console.log('============================' + JSON.stringify(wells));
                curves.forEach((curve, i) => {
                    const datasetname = isAddToDataset ? datasets[0] : (datasets && datasets.length > 0 ? datasets[i] : wellname);
                    if(currentWell) {
                        fs.appendFileSync(curve.path, buffers[curve.name].data);
                    }
                    buffers[curve.name] = {
                        count: 0,
                        data: ""
                    }
                    curve.wellname = wellname;
                    curve.datasetname = datasetname;
                    let filePath = hashDir.createPath(config.dataPath,importData.userInfo.username + wellname + curve.datasetname + curve.name, curve.name + '.txt');
                    fs.writeFileSync(filePath, "");
                    curve.path = filePath;
                    if(wells[wellname].datasets[datasetname]) {
                        if(wells[wellname].datasets[datasetname].curves)
                            wells[wellname].datasets[datasetname].curves.push(Object.assign({}, curve));
                        else {
                            wells[wellname].datasets[datasetname].curves = [Object.assign({}, curve)];
                        }
                    }
                    else wells[wellname].datasets[datasetname] = {
                        name: datasetname,
                        curves: [Object.assign({}, curve)]
                    };
                })
                currentWell = wellname;
            }
            curves.forEach((curve, i) => {
                writeToCurveFile(buffers[curve.name], curve.path, count, curvesData[i + startColumn], -9999);
            })
        }
        else if (lineNumber >= importData.curveUnitStartAt){
            let curvesUnit = line.split(separator);
            curvesUnit.splice(0, startColumn);
            for(let i = 0; i < curves.length; i++){
                curves[i].unit = curvesUnit[i];
            }
        }
        else if(lineNumber >= importData.curveNameStartAt) {
            let curvesName = line.split(separator);
            curvesName.splice(0, startColumn);
            curvesName.forEach(( curveName) => {
                let curve = {
                    name: curveName,
                    datasetname: null,
                    wellname: null,
                    path: '',
                    startDepth: 0,
                    stopDepth: 0,
                    step: 0
                }
                curves.push(curve);
            })
        }
        else if(!isAddToDataset && importData.datasetsStartAt && importData.datasetsStartAt > 0 && lineNumber >= importData.datasetsStartAt ){
            datasets = line.split(separator);
            datasets.splice(0, startColumn);
        }
    })

    rl.on('end', () => {
        if (curves) {
            curves.forEach(function (curve) {
                fs.appendFileSync(curve.path, buffers[curve.name].data);
            });
        }
        let output = Object.keys(wells).map((wellname) => {
            const datasets = Object.keys(wells[wellname].datasets).map((key) => {
                wells[wellname].datasets[key].curves.forEach(curve => {
                    curve.path = curve.path.replace(config.dataPath + '/', '');
                })
                return wells[wellname].datasets[key]
            });
            wells[wellname].datasets = datasets;
            return wells[wellname];
        });

        // console.log(JSON.stringify(output));

        cb(null, output);
        //
        // let well = importData.well ? importData.well : { name : wellName};
        // if(well.datasets && well.datasets.length > 0){
        //     well.datasets[0].curves = curves;
        // }
        // else {
        //     well.datasets = [{
        //         name : datasetName,
        //         curves: curves
        //     }];
        // }
        // cb(null, well);

        // console.log(JSON.stringify(wells));
    })
}


module.exports = {
    extractCurves: extractCurves
}