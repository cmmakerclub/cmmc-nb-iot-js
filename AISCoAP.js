const host = '103.20.205.85';
const port = 5683;
let ct = 1;

function AISMagellan(token, modem) {
  let _token = token;
  let _modem = modem;

  this.getHexString = () => {
    /*
    Message Format
    0                   1                   2                   3
    0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |Ver| T |  TKL  |      Code     |          Message ID           |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |   Token (if any, TKL bytes) ...
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |   Options (if any) ...
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |1 1 1 1 1 1 1 1|    Payload (if any) ...
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

    +------+--------+-----------+
    | Code | Name   | Reference |
    +------+--------+-----------+
    | 0.01 | GET    | [RFC7252] |
    | 0.02 | POST   | [RFC7252] |
    | 0.03 | PUT    | [RFC7252] |
    | 0.04 | DELETE | [RFC7252] |
    +------+--------+-----------+
    */

    let msgId = Buffer.alloc(2);
    let byte1 = Buffer.alloc(1);
    let byte2 = Buffer.alloc(1);

    const confirmable = 0b00;
    const non_confirmable = 0b01;
    const acknowledgement = 0b10;
    const reset = 0b11;

    const version = 0b01 << 6;
    const type = confirmable << 4;

    byte1.writeUInt8(version | type);
    byte2.writeUInt8(0b00000000 | 2);
    msgId.writeInt16LE(ct);

    const b = Buffer.concat([
      Buffer.from(byte1),
      Buffer.from(byte2),
      Buffer.from(msgId),
      Buffer.from('b5', 'hex'),
      Buffer.from('4e42496f54', 'hex'),
      Buffer.from('0d', 'hex'),
      Buffer.from('17', 'hex'),
      Buffer.from(_token),
      Buffer.from('ff', 'hex'),
      Buffer.from(JSON.stringify({
        a: new Date().getTime(),
        ct: ct,
      })),
    ]);
    // p3 += String("40");
    // p3 += String("02");
    // p3 += String(msgId);
    // p3 += String("b5");
    // p3 += String("4e42496f54"); // NB-IoT
    // p3 += String("0d");
    // p3 += String("17");
    // p3 +=  String(tokenHex);
    // p3 += String("ff");
    console.log(`- sent payload=${b.toString('hex')}`);
    console.log(`- sent msgId=${ct++}`);
    return b.toString('hex');
  };
};

module.exports = AISMagellan;