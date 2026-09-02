const { execFile } = require('child_process');
const { createWriteStream } = require('fs');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const GITHUB_REPO = process.env.GITHUB_REPO || 'mat-tgn/backupper';
const GIT_BRANCH = process.env.GIT_BRANCH || 'main';
const APP_ROOT = process.env.APP_ROOT || path.resolve(__dirname, '..');
const VERSION_FILE = path.join(APP_ROOT, '.app-version.json');

const localPackage = require(path.join(__dirname, 'package.json'));

let updateStatus = {
  state: 'idle',
  message: null,
  error: null,
  startedAt: null,
  finishedAt: null
};

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      cwd: options.cwd || APP_ROOT,
      env: { ...process.env, ...(options.env || {}) },
      timeout: options.timeout || 120000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true
    }, (error, stdout, stderr) => {
      if (error) {
        const err = new Error((stderr || stdout || error.message || '').trim());
        err.code = error.code;
        reject(err);
        return;
      }
      resolve({ stdout: (stdout || '').trim(), stderr: (stderr || '').trim() });
    });
  });
}

function readStoredVersion() {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    }
  } catch {
    // file assente o non valido
  }
  return null;
}

function writeStoredVersion(info) {
  fs.writeFileSync(VERSION_FILE, JSON.stringify(info, null, 2));
}

function getLocalIdentity() {
  const stored = readStoredVersion();
  const sha = (stored && stored.sha)
    || (process.env.APP_GIT_SHA && process.env.APP_GIT_SHA !== 'unknown'
      ? process.env.APP_GIT_SHA
      : null);
  return {
    version: (stored && stored.version) || localPackage.version,
    sha,
    shortSha: sha ? sha.slice(0, 7) : null
  };
}

async function fetchGithubJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'backupper-updater'
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function getRemoteLatest() {
  const commit = await fetchGithubJson(
    `https://api.github.com/repos/${GITHUB_REPO}/commits/${encodeURIComponent(GIT_BRANCH)}`
  );
  return {
    sha: commit.sha,
    shortSha: commit.sha.slice(0, 7),
    message: (commit.commit && commit.commit.message || '').split('\n')[0],
    date: commit.commit && commit.commit.committer && commit.commit.committer.date,
    htmlUrl: commit.html_url,
    author: commit.commit && commit.commit.author && commit.commit.author.name
  };
}

async function checkUpdate() {
  const current = getLocalIdentity();
  const remote = await getRemoteLatest();
  const updateAvailable = Boolean(remote.sha && current.sha !== remote.sha);
  const canApply = fs.existsSync('/.dockerenv') || process.env.ALLOW_IN_CONTAINER_UPDATE === 'true';

  return {
    updateAvailable,
    current,
    latest: remote,
    repo: GITHUB_REPO,
    branch: GIT_BRANCH,
    canApply,
    applyHint: canApply
      ? 'L\'aggiornamento viene scaricato da GitHub e applicato solo dentro questo container. Dati, backup e log restano sui volumi.'
      : 'L\'auto-aggiornamento è disponibile solo nel container Docker.',
    status: updateStatus
  };
}

function setStatus(partial) {
  updateStatus = { ...updateStatus, ...partial };
}

async function downloadTarball(destFile, sha) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/tarball/${encodeURIComponent(sha)}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'backupper-updater'
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Download sorgente fallito (${res.status}): ${body.slice(0, 200)}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destFile));
}

async function findExtractedRoot(extractDir) {
  const entries = await fs.readdir(extractDir);
  const dirs = [];
  for (const entry of entries) {
    const full = path.join(extractDir, entry);
    if ((await fs.stat(full)).isDirectory()) {
      dirs.push(full);
    }
  }
  if (dirs.length === 1) {
    return dirs[0];
  }
  throw new Error('Archivio GitHub in formato inatteso');
}

async function replaceAppFromBuild(sourceRoot) {
  const clientBuildSrc = path.join(sourceRoot, 'client', 'build');
  const serverSrc = path.join(sourceRoot, 'server');
  const clientBuildDest = path.join(APP_ROOT, 'client', 'build');
  const serverDest = path.join(APP_ROOT, 'server');

  if (!fs.existsSync(clientBuildSrc)) {
    throw new Error('Build del client non trovata dopo la compilazione');
  }

  await fs.ensureDir(path.join(APP_ROOT, 'client'));
  await fs.emptyDir(clientBuildDest);
  await fs.copy(clientBuildSrc, clientBuildDest);

  const skip = new Set(['data', 'backups']);
  const entries = await fs.readdir(serverSrc);
  for (const entry of entries) {
    if (skip.has(entry)) {
      continue;
    }
    const from = path.join(serverSrc, entry);
    const to = path.join(serverDest, entry);
    await fs.remove(to);
    await fs.copy(from, to);
  }
}

async function applyUpdate() {
  const inContainer = fs.existsSync('/.dockerenv') || process.env.ALLOW_IN_CONTAINER_UPDATE === 'true';
  if (!inContainer) {
    const error = new Error('L\'auto-aggiornamento è disponibile solo nel container Docker.');
    error.code = 'NOT_IN_CONTAINER';
    throw error;
  }

  if (updateStatus.state === 'running') {
    const error = new Error('Un aggiornamento è già in corso');
    error.code = 'UPDATE_IN_PROGRESS';
    throw error;
  }

  setStatus({
    state: 'running',
    message: 'Controllo ultima revisione su GitHub…',
    error: null,
    startedAt: new Date().toISOString(),
    finishedAt: null
  });

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backupper-update-'));

  try {
    const remote = await getRemoteLatest();
    const current = getLocalIdentity();
    if (current.sha && current.sha === remote.sha) {
      setStatus({
        state: 'idle',
        message: 'Già aggiornato',
        finishedAt: new Date().toISOString()
      });
      return {
        success: true,
        restarting: false,
        message: 'Il container è già allineato all\'ultimo commit.'
      };
    }

    const tarPath = path.join(workDir, 'source.tar.gz');
    setStatus({ message: 'Download del codice da GitHub…' });
    await downloadTarball(tarPath, remote.sha);

    setStatus({ message: 'Estrazione archivio…' });
    const extractDir = path.join(workDir, 'src');
    await fs.ensureDir(extractDir);
    await runCommand('tar', ['-xzf', tarPath, '-C', extractDir], { timeout: 120000 });
    const sourceRoot = await findExtractedRoot(extractDir);

    const clientDir = path.join(sourceRoot, 'client');
    const serverDir = path.join(sourceRoot, 'server');

    setStatus({ message: 'Installazione dipendenze client…' });
    await runCommand('npm', ['install'], {
      cwd: clientDir,
      timeout: 600000,
      env: { CI: 'false' }
    });

    setStatus({ message: 'Build del frontend…' });
    await runCommand('npm', ['run', 'build'], {
      cwd: clientDir,
      timeout: 600000,
      env: { CI: 'false', NODE_ENV: 'production' }
    });

    setStatus({ message: 'Installazione dipendenze server…' });
    await runCommand('npm', ['install', '--omit=dev'], {
      cwd: serverDir,
      timeout: 600000
    });

    setStatus({ message: 'Sostituzione file applicazione…' });
    await replaceAppFromBuild(sourceRoot);

    let nextVersion = localPackage.version;
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(sourceRoot, 'server', 'package.json'), 'utf8')
      );
      if (pkg.version) {
        nextVersion = pkg.version;
      }
    } catch {
      // mantieni versione precedente
    }

    writeStoredVersion({
      sha: remote.sha,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      message: remote.message
    });

    setStatus({
      state: 'restarting',
      message: 'Aggiornamento applicato. Riavvio del processo…',
      finishedAt: new Date().toISOString()
    });

    return {
      success: true,
      restarting: true,
      message: 'Aggiornamento applicato nel container. L\'applicazione si riavvia tra pochi secondi.'
    };
  } catch (error) {
    setStatus({
      state: 'error',
      message: 'Aggiornamento non riuscito',
      error: error.message,
      finishedAt: new Date().toISOString()
    });
    throw error;
  } finally {
    await fs.remove(workDir).catch(() => {});
  }
}

function getUpdateStatus() {
  return updateStatus;
}

module.exports = {
  checkUpdate,
  applyUpdate,
  getUpdateStatus,
  GITHUB_REPO,
  GIT_BRANCH
};
