import crypto from 'crypto';

export function parseProxyLink(link) {
  try {
    let url;
    
    if (link.startsWith('tg://')) {
      const params = new URLSearchParams(link.replace('tg://proxy?', ''));
      return {
        server: params.get('server'),
        port: parseInt(params.get('port'), 10),
        secret: params.get('secret'),
      };
    }
    
    if (link.startsWith('https://t.me/proxy')) {
      url = new URL(link);
      return {
        server: url.searchParams.get('server'),
        port: parseInt(url.searchParams.get('port'), 10),
        secret: url.searchParams.get('secret'),
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

export function generateId(server, port, secret) {
  return crypto.createHash('md5').update(`${server}:${port}:${secret}`).digest('hex');
}

export function createProxyObject(link) {
  const parsed = parseProxyLink(link);
  if (!parsed || !parsed.server || !parsed.port || !parsed.secret) {
    return null;
  }
  
  return {
    id: generateId(parsed.server, parsed.port, parsed.secret),
    server: parsed.server,
    port: parsed.port,
    secret: parsed.secret,
    link: `https://t.me/proxy?server=${parsed.server}&port=${parsed.port}&secret=${parsed.secret}`,
    status: 'unknown',
    lastChecked: null,
  };
}
