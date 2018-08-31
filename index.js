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

_modem.send('AT+NRB');

