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

  const log = await git.log({ file: PROXY_FILE, maxCount: 10 });
  if (log.all.length < 2) {
    return [];
  }

  const latestHash = await findLatestNonEmptyCommit(log.all);
  if (!latestHash) {
    return [];
  }

  const previousHash = await findLatestNonEmptyCommit(
    log.all.filter((entry, index) => {
      const targetIndex = log.all.findIndex(e => e.hash === latestHash);
      return index > targetIndex;
    })
  );
  if (!previousHash) {
    return [];
  }

  const diff = await git.diff([previousHash, latestHash, '--', PROXY_FILE]);

  const added = new Set();
  const removed = new Set();

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    const trimmed = line.substring(1).trim();
    if (!trimmed) continue;
    if (line.startsWith('+')) added.add(trimmed);
    else if (line.startsWith('-')) removed.add(trimmed);
  }

  return [...added].filter(link => !removed.has(link));
}

async function findLatestNonEmptyCommit(logEntries) {
  for (const entry of logEntries) {
    try {
      const content = await git.show([`${entry.hash}:${PROXY_FILE}`]);
      const trimmed = content.trim();
      if (trimmed.length > 0) {
        return entry.hash;
      }
    } catch (error) {
      continue;
    }
  }
  return null;
}
