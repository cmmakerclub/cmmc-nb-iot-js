const Modem = require('./Modem');
const EventEmitter = require('events').EventEmitter;
const util = require('util');

function BC95({port, baudRate}, cb) {
  this.nbConnected = false;
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
      console.log('> ON DATA..', cmd);
      if (resp === 'OK') {
        console.log('got ok');
        resolve().with({cmd, resp: _buffer});
        _buffer = [];
      }
      else if (resp === 'ERROR') {
        reject().with({cmd, resp: _buffer});
        _buffer = [];
      }
      else {
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
      return this.ipAddr = splittedArray[1];
    });
  };

  this.queryRSSI = () => {
    const map = (x, in_min, in_max, out_min, out_max) => {
      return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    };
    return _modem.call('AT+CSQ').then(result => {
      let splittedArray = result.resp.toString().split(',');
      let rssi = splittedArray[0].split(':')[1];
      console.log(`rssi =${map(rssi, 0, 31, 0, 100)}%`);
      rssi = (2 * rssi) - 113;
      return rssi;
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
    firstConnect();
  };

  const firstConnect = () => {
    const intervalId = setInterval(() => {
      _modem.call('AT+CGATT?').
          then(result => result.resp[0].toString()).
          then(response => response === '+CGATT:1').
          then(connected => {
            if (this.nbConnected !== connected) {
              this.nbConnected = connected;
              if (connected) {
                const afterConnectedPromises = [
                  this.queryIpAddress().then(ip => {
                    this.ipAddr = ip;
                  }),
                  this.queryRSSI().then(rssi => {
                    this.rssi = rssi;
                  }),
                ];
                Promise.all(afterConnectedPromises).then(results => {
                  this.emit('connected');
                  clearInterval(intervalId);
                });
              }
              else
                this.emit('disconnected');
            }
            else {
              if (!this.nbConnected) {
                this.emit('connecting');
              }
            }
          });
    }, 2000);
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