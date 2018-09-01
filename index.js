const BC95 = require('./BC95');

const bc95 = new BC95({port: '/dev/tty.usbmodem1411', baudRate: 9600});
// const bc95 = new BC95({port: '/dev/tty.usbserial-DO01E4MX', baudRate: 9600});

const startMs = new Date().getTime();

setTimeout(() => {
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
  const port = (new Date().getTime()) % 10000;

  bc95.createUDPSocket(port + 8000, 1).
      then(result => {
        const sockId = result.resp[0].toString();
        sockets.push(parseInt(sockId));
        var buffer = Buffer.from(
            `HELLO WORLD: ${new Date().getTime() - startMs}`);
        setInterval(() => {
          bc95.sendUDPMessage(0, '103.212.181.167', '3002', buffer).
              then(res => {
                console.log(`send ok with `, res);
              }).
              catch(err => {
                console.log(`send error with`, err);
              });
        }, 2000);
      }).
      catch(err => {
        console.log(`catch error = `, err);
      });

  console.log(`port=${port + 8000}`);
});

bc95.on('connecting', function() {
  console.log('attaching NB-IoT network.');
});

bc95.on('data', payload => {
  console.log(payload);
  console.log(`bc95 on_data = `,
      Buffer.from(payload.data, 'HEX').toString());
});

bc95.on('update', (args) => {
  console.log(`rssi =${bc95.rssi} rssi_percent=${bc95.rssi_percent}%`);
});

