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
    buffer.data = '';
  }
}

function customSplit(str, delimiter) {
  let words;
  if (str.includes('"')) {
    str = str.replace(/"[^"]+"/g, function(match, idx, string) {
      let tmp = match.replace(/"/g, '');
      return '"' + Buffer.from(tmp).toString('base64') + '"';
    });
    words = str.split(delimiter);
    words = words.map(function(word) {
      if (word.includes('"')) {
        return (
          '"' + Buffer.from(word.replace(/"/g, ''), 'base64').toString() + '"'
        );
      } else return word;
    });
  } else {
    words = str.split(delimiter);
  }
  return words;
}

function extractFromCSV(inputURL, importData) {
  return new Promise((resolve, reject) => {
    // let firstLine = firstline(inputURL);
    let rl = new readline(inputURL);
    let fieldsName = importData.titleFields;
    let filePathes = new Object();
    let BUFFERS = new Object();
    let count = 0;
    let datasets = {};
    let wellInfo = importData.well;
    let logDataIndex = 0;
    let units = importData.units || [];

    // firstLine.then(function (data) {
    // BUFFERS = new Object();
    // count = 0;
    rl.on('line', function(line) {
      line = line.trim();
      if (count == 0) {
        // fieldsName = line.split(',');
        fieldsName.forEach(function(fieldName) {
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
        // let units = line.split(',');
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
        }
      } else {
        // line = line.split(',');
        line = customSplit(line, ',');
        fieldsName.forEach(function(fieldName, i) {
          if (count < 7) {
            console.log(datasets[wellInfo.dataset].curves[i].type);
						console.log(datasets[wellInfo.dataset].curves[i].type != 'TEXT')
          }
          if (
            datasets[wellInfo.dataset].curves[i].type != 'TEXT' &&
            parseFloat(line[i + 1]) != parseFloat(wellInfo.NULL.value)
          ) {
            let _format = 'NUMBER';
            if (isNaN(line[i+1])) {
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
              wellInfo.NULL.value
            );
          } else {
            writeFromCsv(
              BUFFERS[fieldName],
              filePathes[fieldName],
              line[i + 1],
              count - 2,
              wellInfo.NULL.value
            );
          }
        });
      }
      count++;
    });

    rl.on('end', function() {
      console.log(filePathes);
      if (fieldsName) {
        fieldsName.forEach(function(fieldName) {
          fs.appendFileSync(
            filePathes[fieldName],
            BUFFERS[fieldName].data,
            function(err) {
              reject('WRONG FORMAT');
            }
          );
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
  });
}

module.exports.extractFromCSV = extractFromCSV;
