'use strict';

const SerialPort = require('serialport');
const Delimiter = SerialPort.parsers.Delimiter;

class Modem {
  constructor(options, callbacks = {}) {
    this.callbacks = callbacks;
    this.command = '';
    this.buffer = [];
    this.port = new SerialPort(options.port, {baudRate: options.baudRate});
    this.parser = this.port.pipe(new Delimiter({delimiter: '\r\n'}));

    this.parser.on('data', (data) => {
      if (data.toString() === 'OK') {
        this.onData({cmd: this.command, buffer: this.buffer});
        this.command = undefined;
        this.buffer = [];
      }
      else {
        this.buffer.push(data);
      }
    });
  }

  onData(data) {
    const onData = this.callbacks.onData;
    onData && onData(data);
  }

  send(cmd) {
    this.command = cmd;
    this.port.write(cmd);
    this.port.write('\r\n');
  };
}

module.exports = Modem;