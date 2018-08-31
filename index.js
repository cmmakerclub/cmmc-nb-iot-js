const BC95 = require('./BC95');
const bc95 = new BC95();

bc95.resetModule((err, result) => {
  if (err) {
    console.log('error reset module.');
  }
  else {
    console.log('module rebooted.');
  }
});

bc95.on('connected', function() {
  console.log('nb connected');
});

bc95.on('connecting', function() {
  console.log('connecting');
});
