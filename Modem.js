'use strict';

const SerialPort = require('serialport');
const Delimiter = SerialPort.parsers.Delimiter;

function Modem(options, callbacks = {}) {
  this.port = new SerialPort(options.port, {baudRate: options.baudRate});
  let buffer = [];
  let parser = this.port.pipe(new Delimiter({delimiter: '\r\n'}));
  let command = '';

  parser.on('data', data => {
    if (data.toString() === 'OK') {
      this.onData({cmd: command, buffer: buffer});
      command = undefined;
      buffer = [];
    }
    else {
      buffer.push(data);
    }
  });

  this.onData = function(data) {
    const onData = callbacks.onData;
    onData && onData(data);
  };

  this.send = function(cmd) {
    command = cmd;
    this.port.write(cmd);
    this.port.write('\r\n');
  };
}

//
// const createTimer = function() {
//   const waitTimeout = 300;
//   const timerId = setInterval(function() {
//   }, waitTimeout);
//
//   return new Promise((resolve, reject) => {
//
//   });
// };

module.exports = Modem;