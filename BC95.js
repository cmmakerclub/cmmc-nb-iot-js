const Modem = require('./Modem');
const EventEmitter = require('events').EventEmitter;
const util = require('util');

function BC95({port, baudRate}) {
  this.neverConnected = true;
  this.ipAddress;
  this.imei = null;
  this.imsi = null;
  this.rssi = 0;
  this.rssi_percent = 0;
  let _buffer = [];

  let _modem = new Modem({port, baudRate}, {
    onSerialData: (args) => {
      let {
        resolve, reject, cmd, resp,
      } = args;
      resp = resp.toString();
      if (resp === 'OK') {
        let payload = {cmd, resp: _buffer};
        console.log(`being resolve with `, payload);
        resolve().with(payload);
        _buffer = [];
      }
      else if (resp === 'ERROR') {
        reject().with({cmd, resp: _buffer});
        _buffer = [];
      }
      else if (/^\+/.test(resp)) {
        const e = resp.match(/^\+(\w+):/);
        const event = e[1];
        const processors = {
          'NSONMI': /^\+NSONMI:(\d+),(\d+)$/,
          'CSQ': /^\+CSQ:(\d+),(\d+)$/,
          'CGATT': /^\+CGATT:(\d)$/,
        };
        console.log(`> EVENT=${e[1]}`);
        if (event === 'NSONMI') {
          const [match, socketId, len] = resp.match(processors.NSONMI);
          console.log(`found +NSONMI socket=${socketId}, len=${len}`);
          _modem.call(`AT+NSORF=${socketId},${len}`).then(response => {
            const d = response.resp[0].split(',');
            // <socket>,<ip_addr>,<port>,<length>,<data>,<remaining_ length>
            // 0,192.168.5.1,1024,2,ABAB,0
            // const matcher = /^(\d+),(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}),(\d+),(\d+),(\w+),(\d+)/;
            // const matched = response.resp[0].match(matcher);
            // console.log(matcher);
            let [socket, ip_addr, port, length, data, remaining_length] = d;
            //     response.resp[0].match(
            //         /^(\d+),(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}),(\d+),(\d+),(\w+),(\d+)/g);
            let args = {socket, ip_addr, port, length, data, remaining_length};
            console.log(args);
            this.emit('data', args);
          });
        }
        else if (event === 'CSQ') {
          let [match, raw_rssi, ber] = resp.match(processors.CSQ);
          const map = (x, in_min, in_max, out_min, out_max) => (x - in_min) *
              (out_max - out_min) / (in_max - in_min) + out_min;
          let rssi = (2 * raw_rssi) - 113;
          rssi_percent = map(raw_rssi, 0, 31, 0, 100).toFixed(2);
          _buffer.push(match, {raw_rssi, rssi_percent, rssi, ber});
        }
        else if (event === 'CGATT') {
          let [match, status] = resp.match(processors.CGATT);
          status = parseInt(status) === 1;
          _buffer.push(match, {status});
        }
        else {
          console.log(`${event} is NOT IMPLEMENTED EVENT`);
          _buffer.push(resp);
        }
      }
      else {
        _buffer.push(resp);
      }
    },
    onOpen: function() {
      // console.log('cb onOpen');
    },
  });

  EventEmitter.call(this);

  this.queryIpAddress = () => {
    return _modem.call('AT+CGPADDR').then(result => {
      let splittedArray = result.resp.toString().split(',');
      return {ip: splittedArray[1]};
    });
  };

  this.queryFirmwareVersion = () => {
    return _modem.call('AT+CGMR');
  };

  this.queryRSSI = () => {
    return _modem.call('AT+CSQ');
  };

  this.createUDPSocket = (port, enableRecv = 1) => {
    enableRecv = enableRecv ? 1 : 0;
    return _modem.call(`AT+NSOCR=DGRAM,17,${port},${enableRecv}`);
  };

  this.sendUDPMessage = (socketId, ip, port, payload) => {
    const seq = 1;
    const payloadHex = payload.toString('hex');
    // console.log(
    //     `AT+NSOST=${socketId},${ip},${port},${payload.length},${payloadHex}`);

    return _modem.call(
        `AT+NSOST=${socketId},${ip},${port},${payload.length},${payloadHex}`);
  };

  this.call = (cmd) => _modem.call(cmd);

  this.begin = () => {
    console.log('begin.');

    this.queryFirmwareVersion().then(result => {
      console.log('fw = ', result);
    });

    this.queryIMEI().then((result) => {
      let t = /\+CGSN:(\d+)/;
      let str = result.resp[0];
      let matched = result.resp[0].match(t);
      if (matched) {
        console.log(`IMEI = ${matched[1]}`);
        this.imei = matched[1];
      }
    });

    const intervalId = setInterval(() => {
      this.isAttachedNB().then(isConnected => {
        if (isConnected) {
          this.updateNBAttributes().then(() => {
            this.neverConnected = false;
            clearInterval(intervalId);
            this.emit('connected');
            this.queryIMSI().then((result) => {
              console.log(`IMSI = ${result.resp[0]}`);
              this.imsi = result.resp[0];
            });
          });
        } else {
          this.emit('connecting');
        }
      });
    }, 2000);

    // this.mainInterval = setInterval(() => {
    //   if (this.neverConnected) return;
    //   Promise.all([this.updateNBAttributes()]).
    //       then(results => {
    //         this.emit('update');
    //       });
    // }, 1 * 1000);
    //
    // setInterval(() => {
    //   if (this.neverConnected) return;
    //   // Promise.all([this.processIncommingData()]).
    //   //     then(results => {
    //   //       this.emit('update');
    //   //     });
    // }, 1 * 1000);
  };

  this.queryIMEI = () => {
    return _modem.call('AT+CGSN=1');
  };

  this.queryIMSI = () => {
    return _modem.call('AT+CIMI');
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
            console.log('rssi = ', args);
            let {rssi, percent} = args;
            this.rssi = rssi;
            this.rssi_percent = percent;
            return args;
          }),
        ],
    ).then((args) => {
      // console.log('done all promises.', args);
    });
  };

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