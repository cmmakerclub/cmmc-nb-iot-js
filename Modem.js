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
    _ready = true;
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
      send(_current_task.cmd);
    }
  }, 200);

  _parser.on('data', data => {
    _current_task.resp = data;
    this.onSerialData(_current_task);
  });

  this.onSerialData = function(data) {
    const onSerialData = callbacks.onSerialData;
    onSerialData && onSerialData(data);
  };

  let send = cmd => {
    _pending = true;
    _command = cmd;
    this.port.write(cmd);
    this.port.write('\r\n');
  };

  this.call = (cmd) => {
    // console.log(`>> ${cmd} q=${_queue.size()}`,
    //     _queue.tasks.map(t => t.cmd));
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
        // console.log(`>> resolved`);
        return {with: resolve};
      };
      d.reject = () => {
        _pending = false;
        // console.log(`>> rejected`);
        return {with: reject};
      };
    })(data);

    data.promise = new Promise(deferred);

    _queue.push(data);
    return data.promise;
  };

}

module.exports = Modem;