const BC95 = require('./BC95');

const bc95 = new BC95();
const startMs = new Date().getTime();

console.log('rebooting module');

bc95.resetModule((err, result) => {
  if (err) {
    console.log('error reset module.');
  }
  else {
    console.log('module rebooted.');
  }
});

bc95.on('connected', function() {
  console.log(`nb connected with ip = ${bc95.ipAddr}, rssi=${bc95.rssi}`);
  setInterval(function() {
    bc95.queryRSSI().then(rssi => {
      const elapse = (new Date().getTime()) - startMs;
      console.log(`${(elapse / 1000).toFixed(2)}s rssi = ${rssi}`);
    });
  }, 1000);
});

bc95.on('connecting', function() {
  console.log('attaching NB-IoT network.');
});
