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
  this.port = new SerialPort(
      options.port, {
        baudRate: options.baudRate,
      },
  );

  let _ready = false;
  let _queue = new Queue();
  let _pending = false;
  let _parser = this.port.pipe(new Delimiter({delimiter: '\r\n'}));
  let _command = '';
  let _seq = 0;
  let _current_task;

  this.port.on('open', () => {
    this.port.write('\r\n');
    callbacks.onOpen();
    setTimeout(() => {
      _ready = true;
    }, 20);
  });

  this.port.on('error', () => {
    console.log('error');
  });

  let _timer1 = setInterval(() => {
    // console.log(`queue size = ${_queue.size()}`)
    if (!_ready || _pending || _queue.size() === 0) {
      return;
    }
    _current_task = _queue.shift();
    if (_current_task) {
      console.log(`> executing... ${_current_task.cmd}`);
      console.log(`>> Q=${_queue.tasks.length}`);
      send(_current_task.cmd);
    }
  }, 200);

  _parser.on('data', data => {
    _current_task.resp = data;
    this.onData(_current_task);
  });

  this.onData = function(data) {
    const onData = callbacks.onData;
    onData && onData(data);
  };

  let send = cmd => {
    _pending = true;
    _command = cmd;
    this.port.write(cmd);
    this.port.write('\r\n');
  };

  this.call = (cmd) => {
    console.log(`modem.call ${cmd} q=${_queue.size()}`);
    const data = {
      promise: null,
      resolve: null,
      reject: null,
      seq: _seq++,
      cmd,
    };
    let deferred = (d => (resolve, reject) => {
      d.resolve = () => {
        _pending = false;
        return {with: resolve};
      };
      d.reject = () => {
        _pending = false;
        return {with: reject};
      };
    })(data);

    data.promise = new Promise(deferred);

    _queue.push(data);
    return data.promise;
  };

}

module.exports = Modem;