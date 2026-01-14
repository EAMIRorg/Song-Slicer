const { spawnSync } = require('child_process');

function run(cmd, args) {
    const result = spawnSync(cmd, args, { stdio: 'inherit' });
    return result.status ?? 1;
}

function resolvePython() {
    if (process.env.PYTHON) return process.env.PYTHON;
    const candidates = process.platform === 'win32'
        ? ['py', 'python', 'python3']
        : ['python3', 'python'];
    for (const candidate of candidates) {
        const check = spawnSync(candidate, ['-V'], { stdio: 'ignore' });
        if (check.status === 0) return candidate;
    }
    return null;
}

const python = resolvePython();
if (!python) {
    console.error('Python not found. Set PYTHON or install Python 3 and ensure it is on PATH.');
    process.exit(1);
}

let status = run(python, ['-m', 'pip', 'install', '--upgrade', 'pip']);
if (status !== 0) process.exit(status);
status = run(python, ['-m', 'pip', 'install', '-r', 'requirements.txt']);
process.exit(status);
