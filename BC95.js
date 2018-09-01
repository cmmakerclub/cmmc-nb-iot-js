const Modem = require('./Modem');
const EventEmitter = require('events').EventEmitter;
const util = require('util');

function BC95({port, baudRate}, cb) {
  this.neverConnected = true;
  this.ipAddress;
  this.imei;
  this.imsi;
  let _buffer = [];

  let _modem = new Modem({port, baudRate}, {
    onData: (args) => {
      let {
        resolve, reject, cmd, resp,
      } = args;
      resp = resp.toString();
      _buffer.push(resp);

      // console.log(`____ ${resp}`);
      if (resp === 'OK') {
        resolve().with({cmd, resp: _buffer});
        _buffer = [];
      }
      else if (resp === 'ERROR') {
        reject().with({cmd, resp: _buffer});
        _buffer = [];
      }
      else {
        const matcher = {
          'NSONMI': /^\+NSONMI:(\d),(\d)$/,
        };

        if (matcher.NSONMI.test(resp)) {
          console.log(resp);
          const [match, socket, len] = resp.match(matcher.NSONMI);
          console.log(`found NSONMI socket=${socket}, len=${len}`);
          _modem.call(`AT+NSORF=${socket},${len}`).then(response => {
            // '0,103.212.181.167,50056,3,AABBCC,0',
            let [socket, ip_addr, port, length, data, remaining_length] =
                response.resp[1].split(',');
            console.log(socket, ip_addr, port, length, data, remaining_length);
            console.log(Buffer.from(data).toString());
          });
        }
        // else {
        //   console.log('ELSE.. ' + resp);
        // }
      }
    },
    onOpen: function() {
      console.log('cb onOpen');
    },
  });

  EventEmitter.call(this);

  this.processIncommingData = () => {
    return this.call(`AT+NSORF=${0},${512}`).
        then(response => {
          if (response.resp[0] !== 'OK') {
            // console.log(response.resp);
            let [socket, ip_addr, port, length, data, remaining_length] =
                response.resp[0].split(',');
            let payload = Buffer.from(data, 'HEX');
            console.log(
                `incomming payload = ${payload} from ${ip_addr}:${port}`);
            // console.log(payload.toString());
          }
        });
  };

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
    console.log(
        `AT+NSOST=${socketId},${ip},${port},${payload.length},${payloadHex}`);

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
              console.log(result);
            });
          });
        } else {
          this.emit('connecting');
        }
      });
    }, 2000);

    this.mainInterval = setInterval(() => {
      if (this.neverConnected) return;
      this.updateNBAttributes();
      this.processIncommingData();
    }, 10 * 1000);

    setInterval(() => {
      if (this.neverConnected) return;
    }, 10 * 1000);

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