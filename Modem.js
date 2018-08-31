'use strict';

const SerialPort = require('serialport');
const Delimiter = SerialPort.parsers.Delimiter;

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
  let _queue = new Queue();
  let _pending = false;
  let _buffer = [];
  let _parser = this.port.pipe(new Delimiter({delimiter: '\r\n'}));
  let _command = '';
  let _seq = 0;
  let _current_task;

  let _timer = setInterval(() => {
    if (_pending || _queue.size() === 0) return;
    _current_task = _queue.shift();
    console.log(`executing.... ${_current_task.cmd}`);
    if (_current_task)
      send(_current_task.cmd);
  }, 100);

  _parser.on('data', data => {
    const d = {cmd: _command, resp: _buffer};
    if (data.toString() === 'OK') {
      this.onData(d);
      _command = undefined;
      _buffer = [];
      _current_task.resolve(d);
    }
    else {
      _buffer.push(data);
    }
  });

  this.onData = function(data) {
    _pending = false;
    const onData = callbacks.onData;
    onData && onData(data);
  };

  let send = cmd => {
    _pending = true;
    _command = cmd;
    this.port.write(cmd);
    this.port.write('\r\n');
  };

  this.call = cmd => {
    const data = {
      promise: null,
      resolve: null,
      reject: null,
      seq: _seq++,
      cmd,
    };
    let deferred = (d => (resolve, reject) => {
      d.resolve = resolve;
      d.reject = reject;
    })(data);

    data.promise = new Promise(deferred);

    // console.log(`queue size = ${_queue.size()}`);
    _queue.push(data);

    return data.promise;
  };

}

module.exports = Modem;