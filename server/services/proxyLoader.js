import fs from 'fs';
import path from 'path';
import { createProxyObject } from '../utils/proxyParser.js';
import { getNewProxies } from './gitService.js';

const REPO_DIR = path.join(process.cwd(), 'mtproto-repo');
const PROXY_FILE = 'all_proxies.txt';

export function loadAllProxies() {
  const filePath = path.join(REPO_DIR, PROXY_FILE);
  
  if (!fs.existsSync(filePath)) {
    console.error('Proxy file not found:', filePath);
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const links = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const proxies = links
    .map(link => createProxyObject(link))
    .filter(proxy => proxy !== null);
  
  console.log(`Loaded ${proxies.length} proxies from file.`);
  return proxies;
}

export async function loadNewProxies() {
  const newLinks = await getNewProxies();
  
  const proxies = newLinks
    .map(link => createProxyObject(link))
    .filter(proxy => proxy !== null);
  
  console.log(`Found ${proxies.length} new proxies from git diff.`);
  return proxies;
}
