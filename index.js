// const Buffer = require('safe-buffer').Buffer

const Modem = require('./Modem');

const _modem = new Modem({port: '/dev/tty.usbserial-DO01E4MX', baudRate: 9600});

let busy = 0;
let buffer = [];

const AT = {
  reset: 'AT+NRB',
  cgatt: 'AT+CGATT',
  hello: 'AT',
};

_modem.send('AT');


let nbConnected = false;
const CMD_LIST = [];

const BC95 = function() {
  const CMD_LIST = [];
  let connected = false;

};

const isConnected = function() {
  call('AT+CGATT?');
  return nbConnected;
};

const call = function(command) {
  CMD_LIST.push(command);
};

// setInterval(function () {
//   console.log(`attachNB? = ${isConnected()}`)
// }, 1000)
//
// setInterval(function () {
//   const cmd = CMD_LIST.shift()
//   if (cmd && !busy) {
//     // console.log(`queue size = ${CMD_LIST.length}`)
//     send(cmd)
//   }
// }, 500)