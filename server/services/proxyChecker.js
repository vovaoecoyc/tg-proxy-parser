import net from 'net';
import crypto from 'crypto';

const TCP_TIMEOUT = 5000;
const MTPROTO_TIMEOUT = 10000;

export function checkTcp(server, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(TCP_TIMEOUT);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, server);
  });
}

export async function checkMtproto(server, port, secret) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;
    
    socket.setTimeout(MTPROTO_TIMEOUT);
    
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
      }
    };
    
    socket.on('connect', () => {
      const secretBuffer = Buffer.from(secret, 'hex');
      const padding = crypto.randomBytes(56);
      const handshake = Buffer.concat([secretBuffer, padding]);
      
      socket.write(handshake);
      
      socket.once('data', (data) => {
        cleanup();
        resolve(data.length >= 64);
      });
    });
    
    socket.on('timeout', () => {
      cleanup();
      resolve(false);
    });
    
    socket.on('error', () => {
      cleanup();
      resolve(false);
    });
    
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
