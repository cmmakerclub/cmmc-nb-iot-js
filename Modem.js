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
  let _buffer = [];
  let _parser = this.port.pipe(new Delimiter({delimiter: '\r\n'}));
  let _command = '';
  let _seq = 0;
  let _current_task;

  this.port.on('open', () => {
    console.log('port openned');
    this.port.write('\r\n');
    callbacks.onOpen();
    setTimeout(() => {
      _ready = true;
    }, 500);
  });

  this.port.on('error', () => {
    console.log('error');
  });

  let _timer1 = setInterval(() => {
    if (!_ready || _pending || _queue.size() === 0) {
      return;
    }

    _current_task = _queue.shift();

    if (_current_task) {
      // console.log(`> executing... ${_current_task.cmd}`);
      // console.log(`>> Q=${_queue.tasks.length}`);
      send(_current_task.cmd);
    }
  }, 100);

  _parser.on('data', data => {
    const d = {cmd: _command, resp: _buffer};
    if (data.toString() === 'OK') {
      _pending = false;
      d.resp.push('OK');
      this.onData(d);
      _buffer = [];
      _current_task.resolve(d);
      _command = undefined;
    }
    else if (data.toString() === 'ERROR') {
      d.resp.push('ERROR');
      _pending = false;
      _current_task.reject(d);
      _buffer = [];
      _command = undefined;
      console.log('... ERROR');
    }
    else if (data.toString().indexOf('+NSONMI') !== -1) {
      _pending = false;
      d.resp.push('+NSONMI');
      this.onData(d);
      _buffer = [];
      _current_task.resolve(d);
      _command = undefined;
    }
    else {
      // _buffer.push(data);
    }
    // console.log(data.toString());
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
    // console.log(`modem.call ${cmd} q=${_queue.size()}`);
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
    _queue.push(data);
    return data.promise;
  };

}

module.exports = Modem;