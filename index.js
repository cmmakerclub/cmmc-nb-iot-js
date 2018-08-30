// const Buffer = require('safe-buffer').Buffer

const SerialPort = require('serialport')
const Delimiter = SerialPort.parsers.Delimiter
let busy = 0

const CMD_LIST = []
let buffer = []
const AT = {
  reset: 'AT+NRB',
  cgatt: 'AT+CGATT',
  hello: 'AT'
}

let nbConnected = false

const isConnected = function () {
  call('AT+CGATT?')
  return nbConnected
}

const port = new SerialPort('/dev/tty.usbserial-DO01E4MX', {
  baudRate: 9600
})

const parser = port.pipe(new Delimiter({delimiter: '\r\n'}))

const send = function (cmd) {
  busy = true
  port.write(cmd)
  port.write('\r\n')
}

const call = function (command) {
  CMD_LIST.push(command)
}

parser.on('data', function (data) {
  // console.log('incoming data.. ' + data)
  if (data.toString() === 'OK') {
    if (buffer[0] === '+CGATT:1') {
      nbConnected = true
    }
    else if (buffer[0] === '+CGATT:0') {
      nbConnected = false
    }
    busy = false
    buffer = []
  }
  else {
    buffer.push(data.toString())
  }
})

call(AT.reset)
setInterval(function () {
  console.log(`attachNB? = ${isConnected()}`)
}, 1000)

setInterval(function () {
  const cmd = CMD_LIST.shift()
  if (cmd && !busy) {
    // console.log(`queue size = ${CMD_LIST.length}`)
    send(cmd)
  }
}, 500)