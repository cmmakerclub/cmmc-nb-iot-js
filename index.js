// const Buffer = require('safe-buffer').Buffer

const Modem = require('./Modem');

const _modem = new Modem({
  port: '/dev/tty.usbserial-DO01E4MX',
  baudRate: 9600,
}, {
  onData: function(data) {
    console.log(data);
    console.log(data.buffer.map(v => v.toString()));
  },
});

let busy = 0;
let buffer = [];

const AT = {
  reset: 'AT+NRB',
  cgatt: 'AT+CGATT',
  hello: 'AT',
};

_modem.send('AT+NRB');

// setInterval(function () {
//   console.log(`attachNB? = ${isConnected()}`)
// }, 1000)
//
// setInterval(function () {
//   const cmd = CMD_LIST.shift()
//   if (cmd && !busy) {
//     // console.log(`queue size = ${CMD_LIST.length}`)
//     send(cmd)
//   }
// }, 500)