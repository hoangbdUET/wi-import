'use strict';
let extractor = require('./las2-extractor.js');
let url = '../../../sample-data/las-2.0/Las2_W4.las';
let cryptoData = require('../crypto-file/crypto-data');
let client = cryptoData.getClientHellMan();
let clientPubKey = client.clientPubKey;
const crypto = require('crypto');
const fs = require('fs');
let CONFIG = require('../crypto-file/crypto.config').CONFIG;
let cypher = CONFIG.cypher;
let formatEncrypt = CONFIG.formatEncrypt;
let hash = CONFIG.hash;
let codePublic = CONFIG.codePublic;
const cryptorFile = require('file-encryptor');
const options = {algorithm:cypher};
let path;
let serverPubKey;
extractor.setBasePath('./data');
extractor.extractWell(url, function(result) {
    console.log("Well log sections extracted:", JSON.stringify(result, null, 2));

}, {
    label:"some label"
}); //done

//extractor.extractCurves(url, 'project1', 'well1'); //done




