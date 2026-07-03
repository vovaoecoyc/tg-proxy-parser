import net from 'net';
import crypto from 'crypto';

const TCP_TIMEOUT = 8000;
const MTPROTO_TIMEOUT = 10000;

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

export async function checkMtproto(server, port, secret) {
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

    const killTimer = setTimeout(() => done(false), MTPROTO_TIMEOUT);

    socket.on('connect', () => {
      const secretBuffer = Buffer.from(secret, 'hex');
      const padding = crypto.randomBytes(56);
      const handshake = Buffer.concat([secretBuffer, padding]);

      socket.write(handshake);

      socket.once('data', (data) => {
        done(data.length >= 64);
      });
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
