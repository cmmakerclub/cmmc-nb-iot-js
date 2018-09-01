const Modem = require('./Modem');
const EventEmitter = require('events').EventEmitter;
const util = require('util');

function BC95({port, baudRate}, cb) {
  this.neverConnected = true;
  this.ipAddress;
  this.firstConect = true;
  let _buffer = [];

  let _modem = new Modem({port, baudRate}, {
    onData: (args) => {
      let {
        resolve, reject, cmd, resp,
      } = args;
      resp = resp.toString();
      _buffer.push(resp);
      if (resp === 'OK') {
        resolve().with({cmd, resp: _buffer});
        _buffer = [];
      }
      else if (resp === 'ERROR') {
        reject().with({cmd, resp: _buffer});
        _buffer = [];
      }
      else {
        // console.log('ELSE: ' + cmd);
        // console.log('>>>', _buffer[0]);
      }
    },
    onOpen: function() {
      console.log('cb onOpen');
    },
  });

  EventEmitter.call(this);

  this.queryIpAddress = () => {
    return _modem.call('AT+CGPADDR').then(result => {
      let splittedArray = result.resp.toString().split(',');
      return {ip: splittedArray[1]};
    });
  };

  this.queryRSSI = () => {
    const map = (x, in_min, in_max, out_min, out_max) => (x - in_min) *
        (out_max - out_min) / (in_max - in_min) + out_min;
    return _modem.call('AT+CSQ').then(result => {
      let splittedArray = result.resp.toString().split(',');
      let rssi = splittedArray[0].split(':')[1];
      const percent = map(rssi, 0, 31, 0, 100).toFixed(2);
      rssi = (2 * rssi) - 113;
      console.log(`rssi ${rssi} ${percent}%`);
      return {rssi, percent};
    });
  };

  this.createUDPSocket = (port, enableRecv = 1) => {
    enableRecv = enableRecv ? 1 : 0;
    return _modem.call(`AT+NSOCR=DGRAM,17,${port},${enableRecv}`);
  };

  this.sendUDPMessage = (socketId, ip, port, payload) => {
    const seq = 1;
    const payloadHex = payload.toString('hex');
    console.log('at', payloadHex);
    console.log(`AT+NSOST=${socketId},${ip},${port},2,${payloadHex}`);

    return _modem.call(
        `AT+NSOST=${socketId},${ip},${port},${payload.length},${payloadHex}`);
  };

  this.call = (cmd) => {
    return _modem.call(cmd);
  };

  this.begin = () => {
    console.log('begin called');
    const intervalId = setInterval(() => {
      this.isAttachedNB().then(isConnected => {
        if (isConnected) {
          this.updateNBAttributes().then(() => {
            this.neverConnected = false;
            clearInterval(intervalId);
            this.emit('connected');
          });
        } else {
          this.emit('connecting');
        }
      });
    }, 2000);

    this.mainInterval = setInterval(() => {
      if (this.neverConnected) return;
      this.updateNBAttributes().then((results) => {
        console.log('main interval.');
      });
    }, 30 * 1000);
  };

  this.isAttachedNB = () => {
    return _modem.call('AT+CGATT?').
        then(result => {
          return result.resp[0].toString() === '+CGATT:1';
        });
  };

  this.updateNBAttributes = () => {
    return Promise.all(
        [
          this.queryIpAddress().then(args => {
            let {ip} = args;
            this.ipAddr = ip;
            return args;
          }),
          this.queryRSSI().then(args => {
            let {rssi, percent} = args;
            this.rssi = rssi;
            return args;
          }),
        ],
    ).then((args) => {
      // console.log('done all promises.', args);
    });
  };

  const firstConnect = () => {
  };

  // firstConnect();

  // setInterval(() => {
  //   if (this.nbConnected) {
  //     // _modem.call('AT+CGPADDR').then(result => {
  //     //   let splittedArray = result.resp.toString().split(',');
  //     //   this.ipAddr = splittedArray[1];
  //     // });
  //     // _modem.call('AT+CSQ').then(resp => { }).catch(err => {
  //     // });
  //   }
  //
  // }, 2 * 1000);

  this.resetModule = (cb) => {
    return _modem.call('AT+NRB').
        then(result => {
          console.log('NRB result');
          if (cb) {
            cb(false, result);
          }
        }).catch(err => {
          console.log('catch');
          cb(err, null);
        });
  };

}

util.inherits(BC95, EventEmitter);

module.exports = BC95;