import net from 'net';
import crypto from 'crypto';

const TCP_TIMEOUT = 8000;
const MTPROTO_TIMEOUT = 10000;

const FORBIDDEN_PATTERNS = [
  0xefefefef,
  0xeeeeeeee,
  0xdddddddd,
];

export function checkTcp(server, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const done = (result) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(killTimer);
      socket.destroy();
      resolve(result);
    };

    const killTimer = setTimeout(() => done(false), TCP_TIMEOUT);

    socket.on('connect', () => done(true));

    socket.on('error', () => done(false));

    socket.connect(port, server);
  });
}

function createObfuscated2Handshake(secret) {
  const secretBuf = Buffer.from(secret, 'hex');
  const plain = crypto.randomBytes(64);

  plain.writeUInt32LE(0xdddddddd, 56);
  plain.writeInt16LE(0, 60);
  plain.writeUInt16LE(0, 62);

  const keyMaterial = plain.subarray(8, 40);
  const writeKey = crypto
    .createHash('sha256')
    .update(Buffer.concat([keyMaterial, secretBuf]))
    .digest();

  const writeIV = plain.subarray(40, 56);

  const cipher = crypto.createCipheriv('aes-256-ctr', writeKey, writeIV);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);

  const first4 = encrypted.readUInt32LE(0);
  if (
    FORBIDDEN_PATTERNS.includes(first4) ||
    encrypted[0] === 0xef ||
    (encrypted[0] === 0x16 && encrypted[1] === 0x03)
  ) {
    return createObfuscated2Handshake(secret);
  }

  return encrypted;
}

export async function checkMtproto(server, port, secret) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;
    let openTimer = null;

    const done = (result) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(killTimer);
      if (openTimer) clearTimeout(openTimer);
      socket.destroy();
      resolve(result);
    };

    const killTimer = setTimeout(() => done(false), MTPROTO_TIMEOUT);

    socket.on('connect', () => {
      const handshake = createObfuscated2Handshake(secret);
      socket.write(handshake);

      openTimer = setTimeout(() => done(true), 500);

      socket.on('close', () => {
        if (!resolved) done(false);
      });

      socket.on('error', () => done(false));
    });

    socket.on('error', () => done(false));

    socket.connect(port, server);
  });
}

export async function checkProxy(proxy) {
  const tcpResult = await checkTcp(proxy.server, proxy.port);
  
  if (!tcpResult) {
    return {
      ...proxy,
      status: 'offline',
      lastChecked: new Date().toISOString(),
    };
  }
  
  const mtprotoResult = await checkMtproto(proxy.server, proxy.port, proxy.secret);
  
  return {
    ...proxy,
    status: mtprotoResult ? 'online' : 'offline',
    lastChecked: new Date().toISOString(),
  };
}
