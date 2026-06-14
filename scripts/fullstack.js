const concurrently = require('concurrently');
const { execSync } = require('child_process');

const safeExec = (command, options = {}) => {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
      timeout: 3000,
      ...options,
    });
  } catch {
    return '';
  }
};

const freePortIfBusy = (port) => {
  if (process.platform !== 'win32') return;

  const output = safeExec(`cmd /d /s /c "netstat -ano | findstr :${port}"`);
  if (!output) return;

  const pids = [...new Set(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/\s+/).at(-1))
      .filter((pid) => /^\d+$/.test(pid))
      .filter((pid) => Number(pid) > 0 && Number(pid) !== process.pid)
  )];

  for (const pid of pids) {
    safeExec(`taskkill /PID ${pid} /F`, { stdio: 'ignore', timeout: 2500 });
  }
};

freePortIfBusy(5173);
freePortIfBusy(5174);
freePortIfBusy(5000);

concurrently([
  { command: 'npm run server', name: 'SERVER', prefixColor: 'blue' },
  { command: 'npm run client', name: 'CLIENT', prefixColor: 'green' }
], {
  restartTries: 0,
  killOthersOn: ['failure', 'success']
}).result.catch(err => {
  console.error('Error running fullstack:', err);
  process.exit(1);
});
