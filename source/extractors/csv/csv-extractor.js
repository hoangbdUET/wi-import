'use strict';

let readline = require('line-by-line');
let fs = require('fs');
let csv = require('fast-csv');
let firstline = require('firstline');

function extractCSV(inputURL) {
    let stream = fs.createReadStream(inputURL);
    let firstLine = firstline(inputURL);
    firstLine.then(function (data) {
        console.log('data la', data);
    }, function (err) {
        if(err) console.log(err);
    });
    csv.fromStream(stream).on('data', function (data) {
        console.log('data la ', data);
    })
        .on('end', function() {
            console.log('read finished');
        });
}
let url = './ExportTopsToColumns.csv';
extractCSV(url);