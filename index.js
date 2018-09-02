const BC95 = require('./BC95');
const AISCoAP = require('./AISCoAP');

const aisNBIoTAdapter = new AISCoAP('a29c9710-ae53-11e8-8e2c-19a3b7904cb9');

console.log(aisNBIoTAdapter);

const bc95 = new BC95({port: '/dev/tty.usbmodem1411', baudRate: 9600});
// const bc95 = new BC95({port: '/dev/tty.usbserial-DO01E4MX', baudRate: 9600});

const startMs = new Date().getTime();
let counter = 0;

bc95.resetModule((err, result) => {
  if (err) {
    console.log('error reset module.');
  }
  else {
    console.log('module rebooted.');
    bc95.begin();
  }
});

bc95.on('connected', function() {
  console.log(`NB-IoT connected.`);
  console.log(`ip=${bc95.ipAddr}, rssi=${bc95.rssi}(${bc95.rssi_percent}%)`);
  let sockets = [];
  const port = 10000;
  bc95.createUDPSocket(port + 8000, 1).
      then(result => {
        setInterval(() => {
          const msg = Buffer.from(aisNBIoTAdapter.getHexString(), 'hex');
          bc95.sendUDPMessage(0, '103.20.205.85', '5683', msg).
              then(result => { }).
              catch(err => { });
        }, 2 * 1000);
      }).
      catch(err => {
        console.log(`- create socket error with`, err);
      });
});

bc95.on('connecting', function() {
  console.log('attaching NB-IoT network.');
});

bc95.on('data', payload => {
  const lowerCodeMask = 0b111111;
  const coapPayload = Buffer.from(payload.data, 'hex');
  const a = coapPayload.slice(0, 2);
  const msgId = coapPayload.slice(2, 4);
  const c = coapPayload.slice(5, 8);

  console.log(`> recv msgId=${msgId.readUInt16LE()}`);
  console.log(`> recv payload=${payload.data}`);

  var byte = a.readUInt8(1)
      , code = (byte >> 5).toString();
  byte = byte & lowerCodeMask;

  console.log(`> type=${coapPayload.slice(0, 1).
      toString('hex')}, code=${code}.${byte} p=${c.toString()}`);
  console.log('-------------------------------------------------------');

  // console.log(`---`, a, c, c.slice(1).toString());
  /*
  +------+------------------------------+-----------+
  | Code | Description                  | Reference |
  +------+------------------------------+-----------+
  | 2.01 | Created                      | [RFC7252] |
  | 2.02 | Deleted                      | [RFC7252] |
  | 2.03 | Valid                        | [RFC7252] |
  | 2.04 | Changed                      | [RFC7252] |
  | 2.05 | Content                      | [RFC7252] |
  | 4.00 | Bad Request                  | [RFC7252] |
  | 4.01 | Unauthorized                 | [RFC7252] |
  | 4.02 | Bad Option                   | [RFC7252] |
  | 4.03 | Forbidden                    | [RFC7252] |
  | 4.04 | Not Found                    | [RFC7252] |
  | 4.05 | Method Not Allowed           | [RFC7252] |
  | 4.06 | Not Acceptable               | [RFC7252] |
  | 4.12 | Precondition Failed          | [RFC7252] |
  | 4.13 | Request Entity Too Large     | [RFC7252] |
  | 4.15 | Unsupported Content-Format   | [RFC7252] |
  | 5.00 | Internal Server Error        | [RFC7252] |
  | 5.01 | Not Implemented              | [RFC7252] |
  | 5.02 | Bad Gateway                  | [RFC7252] |
  | 5.03 | Service Unavailable          | [RFC7252] |
  | 5.04 | Gateway Timeout              | [RFC7252] |
  | 5.05 | Proxying Not Supported       | [RFC7252] |
  +------+------------------------------+-----------+
  */
  // console.log(`bc95 on_data = `,
  //     Buffer.from(payload.data, 'HEX').toString());
  // 6041 2300 FF323030
});

bc95.on('update', (args) => {
  // console.log(`rssi =${bc95.rssi} rssi_percent=${bc95.rssi_percent}%`);
});

