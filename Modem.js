'use strict';

const SerialPort = require('serialport');
const Delimiter = SerialPort.parsers.Delimiter;
const async = require('async');

function Queue() {
  this.tasks = [];
  this.shift = () => this.tasks.shift();
  this.push = function(task) {
    this.tasks.push(task);
  };

  this.size = () => this.tasks.length;

}

function Modem(options, callbacks = {}) {
  this.port = new SerialPort(options.port, {baudRate: options.baudRate});
  let _promise;
  let _queue = new Queue();
  let _pending = false;
  let _buffer = [];
  let _parser = this.port.pipe(new Delimiter({delimiter: '\r\n'}));
  let _command = '';
  let _seq = 0;

  _parser.on('data', data => {
    const d = {cmd: _command, buffer: _buffer};
    if (data.toString() === 'OK') {
      this.onData(d);
      _command = undefined;
      _buffer = [];
      const t = _queue.shift();
      t.resolve(d);
    }
    else {
      _buffer.push(data);
    }
  });

  this.onData = function(data) {
    const onData = callbacks.onData;
    onData && onData(data);
  };

  let send = cmd => {
    _command = cmd;
    this.port.write(cmd);
    this.port.write('\r\n');
  };

  this.call = cmd => {
    const data = {
      resolve: null,
      reject: null,
      seq: _seq++,
      cmd,
    };
    _queue.push(data);
    let deferred = (function(data) {
      let d = data;
      return (resolve, reject) => {
        d.resolve = resolve;
        d.reject = reject;
      };
    })(data);

    send(cmd);

    return new Promise(deferred);
  };

}

module.exports = Modem;