hashDir = require('./hash-dir');
byline = require('byline');
hashDir.createJSONReadStream('.', '123-456-8765', 'someCurve.txt').pipe(process.stdout);
