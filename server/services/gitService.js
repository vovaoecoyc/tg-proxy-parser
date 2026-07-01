import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';

const REPO_URL = 'https://github.com/SoliSpirit/mtproto.git';
const REPO_DIR = path.join(process.cwd(), 'mtproto-repo');
const PROXY_FILE = 'all_proxies.txt';

let git = simpleGit();

export async function initRepo() {
  if (!fs.existsSync(REPO_DIR)) {
    console.log('Cloning mtproto repository...');
    await simpleGit().clone(REPO_URL, REPO_DIR);
    console.log('Repository cloned successfully.');
  } else {
    console.log('Repository already exists.');
  }
  
  git = simpleGit(REPO_DIR);
  await git.pull();
  console.log('Repository updated.');
}

export async function updateRepo() {
  git = simpleGit(REPO_DIR);
  await git.pull();
  console.log('Repository pulled latest changes.');
}

export async function getNewProxies() {
  git = simpleGit(REPO_DIR);
  
  const log = await git.log({ file: PROXY_FILE, maxCount: 2 });
  if (log.all.length < 2) {
    return [];
  }
  
  const latestHash = log.all[0].hash;
  const previousHash = log.all[1].hash;
  
  const diff = await git.diff([previousHash, latestHash, '--', PROXY_FILE]);
  
  const newLines = diff
    .split('\n')
    .filter(line => line.startsWith('+') && !line.startsWith('+++'))
    .map(line => line.substring(1).trim())
    .filter(line => line.length > 0);
  
  return newLines;
}
