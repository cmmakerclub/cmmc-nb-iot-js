const BC95 = require('./BC95');

const bc95 = new BC95({port: '/dev/tty.usbmodem1411', baudRate: 9600});
// const bc95 = new BC95({port: '/dev/tty.usbserial-DO01E4MX', baudRate: 9600});
const startMs = new Date().getTime();

setTimeout(() => {
  bc95.call('AT').then(({cmd, resp}) => {
    console.log(resp);
  });
  bc95.resetModule((err, result) => {
    if (err) {
      console.log('error reset module.');
    }
    else {
      console.log('module rebooted.');
      bc95.begin();
    }
  });
}, 1000);

bc95.on('connected', function() {
  console.log(`nb connected with ip=${bc95.ipAddr}, rssi=${bc95.rssi}`);
  let sockets = [];

  bc95.createUDPSocket(parseInt(Math.random(2000, 5000) * 10000), 1).
      then(result => {
        const sockId = result.resp[0].toString();
        sockets.push(parseInt(sockId));
        var buffer = Buffer.from('aabbcc', 'hex');
        // setInterval(() => {
        //   bc95.sendUDPMessage(0, '103.212.181.167', '3002', buffer);
        //   bc95.call('AT+NQMGR').then(({cmd, resp}) => {
        //     console.log(resp);
        //   });
        // }, 5000);
        console.log(sockets);
      }).
      catch(err => {
        console.log(`catch error = `, err);
      });

  bc95.createUDPSocket(11224, 1).then(result => {
    const sockId = result.resp[0].toString();
    sockets.push(parseInt(sockId));
    console.log(sockets);
  }).catch(err => {
    console.log(`catch error = `, err);
  });

  //103.212.181.167

});

bc95.on('connecting', function() {
  console.log('attaching NB-IoT network.');
});
