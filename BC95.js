const Modem = require('./Modem');
const EventEmitter = require('events').EventEmitter;
const util = require('util');

const _modem = new Modem({
  port: '/dev/tty.usbserial-DO01E4MX',
  baudRate: 9600,
}, {
  onData: function(data) {
    // console.log(data.resp.map(v => v.toString()));
  },
});

function BC95() {
  this.nbConnected = false;
  this.ipAddress;
  EventEmitter.call(this);

  setInterval(() => {
    _modem.call('AT+CGATT?').
        then(result => result.resp[0].toString()).
        then(response => response === '+CGATT:1').
        then(connected => {
          if (this.nbConnected !== connected) {
            this.nbConnected = connected;
            if (connected)
              this.emit('connected');
            else
              this.emit('disconnected');
          }
          else {
            if (!this.nbConnected) {
              this.emit('connecting');
            }
          }
        });

    _modem.call('AT+CGPADDR').then(result => {
      let splittedArray = result.resp.toString().split(',');
      this.ipAddr = splittedArray[1];
    });

    if (this.nbConnected)
      _modem.call('AT+CSQ').then(resp => {
      }).catch(err => {

      });

  }, 2 * 1000);

  this.resetModule = (cb) => {
    return _modem.call('AT+NRB').
        then(result => {
          if (cb) {
            cb(false, result);
          }
        }).catch(err => {
          cb(err, null);
        });

  };

}

util.inherits(BC95, EventEmitter);

module.exports = BC95;