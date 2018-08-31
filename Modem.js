const SerialPort = require('serialport');
const Delimiter = SerialPort.parsers.Delimiter;

class Modem {
  constructor(options) {
    this.buffer = [];
    this.port = new SerialPort(options.port, {baudRate: options.baudRate});
    this.parser = this.port.pipe(new Delimiter({delimiter: '\r\n'}));

    this.parser.on('data', (data) => {
      if (data.toString() === 'OK') {
        this.onData(this.buffer);
      }
      else {
        this.buffer.push(data);
      }
    });
  }

  onData(data) {
    console.log('onData buffer=', data);
  }

  send(cmd) {
    this.port.write(cmd);
    this.port.write('\r\n');
  };
}

module.exports = Modem;