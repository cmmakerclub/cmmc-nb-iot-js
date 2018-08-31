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

_modem.call('AT+NRB').then(result => {
  console.log(`result = ${result}`, result);
});

_modem.call('AT+NRB').then(result => {
  console.log(`result = ${result}`, result);
});
