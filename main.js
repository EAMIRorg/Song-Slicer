// const { app, BrowserWindow } = require('electron/main')
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn, exec } = require('child_process');
const net = require('net');
const fs = require('fs');
const fspromises = require('fs/promises')

let pythonProcess
let mainWindow = null;
let filePath = '';
const PY_SERVER_PORT = parseInt(process.env.PY_SERVER_PORT || '5001', 10);
const DEFAULT_WINDOW_STATE = { width: 800, height: 600 };
let windowStateSaveTimeout = null;

function getWindowStatePath() {
    return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
    try {
        const statePath = getWindowStatePath();
        if (!fs.existsSync(statePath)) return { ...DEFAULT_WINDOW_STATE };
        const data = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        if (Number.isFinite(data.width) && Number.isFinite(data.height)) {
            return { width: data.width, height: data.height };
        }
    } catch (error) {
        console.warn('Unable to load window state:', error.message);
    }
    return { ...DEFAULT_WINDOW_STATE };
}

function queueWindowStateSave(win) {
    if (!win || win.isDestroyed() || win.isMinimized()) return;
    if (windowStateSaveTimeout) clearTimeout(windowStateSaveTimeout);
    windowStateSaveTimeout = setTimeout(() => {
        try {
            const { width, height } = win.getBounds();
            const statePath = getWindowStatePath();
            fs.writeFileSync(statePath, JSON.stringify({ width, height }));
        } catch (error) {
            console.warn('Unable to save window state:', error.message);
        }
    }, 300);
}

function isPortInUse(port, host = '127.0.0.1') {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const onError = () => resolve(false);
        socket.setTimeout(500);
        socket.once('error', onError);
        socket.once('timeout', onError);
        socket.connect(port, host, () => {
            socket.end();
            resolve(true);
        });
    });
}

// Gets appdata environment variable
ipcMain.handle('get-appdata', () => {
    // Return a cross-platform user data directory
    return app.getPath('userData');
});

// Gets the directory contents
ipcMain.handle('get-directory-contents', async (event, dirPath) => {
    try {
        const files = await fs.promises.readdir(dirPath);
        return files;
    } catch (error) {
        throw new Error('Unable to read directory: ' + error.message);
    }
});

ipcMain.handle('create-directory', async (event, dirPath) => {
    try {
        // Check if the directory exists
        const directoryExists = await fs.promises.access(dirPath, fs.constants.F_OK)
        .then(() => true) // Directory exists
        .catch(() => false); // Directory doesn't exist

        if (!directoryExists) {
            // Create the directory if it doesn't exist
            await fs.promises.mkdir(dirPath, { recursive: true }); // `recursive: true` ensures parent dirs are also created if needed
            console.log(`Directory created at: ${dirPath}`);
        } else {
            console.log(`Directory already exists: ${dirPath}`);
        }
    } catch (error) {
        console.error('Error creating directory:', error);
        throw error
    }
});

// Open the directory in the file explorer (Windows Explorer, Finder, etc.)
ipcMain.handle('open-directory', async (event, dirPath) => {
  try {
    await shell.openPath(dirPath); // This will open the directory in the default file explorer
    return { success: true };
  } catch (error) {
    console.error('Error opening directory:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-file', async (event, filePath) => {
  try {
    const fileContents = await fs.promises.readFile(filePath, 'utf-8');
    return { success: true, content: fileContents }; // Return the file content
  } catch (error) {
    console.error('Error reading file:', error);
    return { success: false, error: error.message }; // Return error message if something goes wrong
  }
});

ipcMain.handle('write-to-file', async (event, filePath, data) => {
  try {
    // Open the file (will create it if it doesn't exist, 'wx' flag will fail if it exists)
    const fileHandle = await fs.promises.open(filePath, 'w'); // 'w' flag means "write", creates the file if not exists
    await fileHandle.writeFile(data, 'utf-8'); // Write the data to the file
    await fileHandle.close(); // Close the file after writing
    console.log(`File created or written to: ${filePath}`);
    return { success: true }; // Return success
  } catch (error) {
    console.error('Error creating or writing to file:', error);
    return { success: false, error: error.message }; // Return error if something goes wrong
  }
});

ipcMain.handle('copy-song-file', async (event, currentFilePath, newPath) => {
    fs.copyFile(currentFilePath, newPath, (err) => {
        if (err) {
            console.error("Error moving file:", err);
        } else {
            console.log('File moved successfully from ' + currentFilePath + ' to ' + newPath);
        }
    });
});

ipcMain.handle('delete-dir', async (event, dirPath) => {
    try {
        const resolvedPath = path.resolve(dirPath);
        console.log('Deleting directory:', resolvedPath);

        await fspromises.rm(resolvedPath, { recursive: true, force: true });

        console.log('Successfully deleted:', resolvedPath);
        return { success: true };
    } catch (err) {
        console.error('Error deleting directory:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('delete-file', async (event, filePath) => {
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error("Error deleting file:", err);
        } else {
            console.log('File ' + filePath + ' deleted successfully');
        }
    });
});

ipcMain.handle('wipe-dir', async (event, dirPath) => {

    try {
        let promises = []
        await fs.promises.readdir(dirPath).then((result) => {
            let files = result
            for (let i = 0; i < files.length; i++) {
                let promise = fs.unlink(dirPath + '\\' + files[i], (err) => {
                    if (err) {
                        console.error("Error deleting file:", err);
                    } else {
                        console.log('File ' + files[i] + ' deleted successfully');
                    }
                });
                promises.push(promise)
            }
            Promise.allSettled(promises).then((results) => {
                // remove the directory
                fs.rmdir(dirPath, (err) => {
                    if (err) {
                        console.error("Error deleting directory:", err);
                    } else {
                        console.log('Directory ' + dirPath + ' deleted successfully');
                    }
                });
            })
        }).catch((err) => {
            console.error(err)
        })

    } catch (error) {
        throw new Error('Unable to read directory: ' + error.message);
    }

});

ipcMain.handle('read-file', async (event, path) => {
    const buffer = await fs.promises.readFile(path);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
});


// Function to start the Python server
async function startPythonServer() {
    console.log("STARTING PYTHON SERVER");

    if (pythonProcess) {
        console.log("Python server already running.");
        return;
    }

    const portInUse = await isPortInUse(PY_SERVER_PORT);
    if (portInUse) {
        console.log(`Python server port ${PY_SERVER_PORT} already in use; skipping spawn.`);
        return;
    }

    let pythonExecutable = process.env.PYTHON;
    if (!pythonExecutable) {
        const venvPath = process.platform === 'win32'
            ? path.join(__dirname, 'venv', 'Scripts', 'python.exe')
            : path.join(__dirname, 'venv', 'bin', 'python3');
        if (fs.existsSync(venvPath)) {
            pythonExecutable = venvPath;
        } else {
            pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
        }
    }
    const serverScript = path.join(__dirname, 'pythonServer.py');

    pythonProcess = spawn(pythonExecutable, [serverScript], { cwd: __dirname });

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        pythonProcess = null;
        restartPythonServer(); // optional: remove if not needed
    });

    pythonProcess.on('error', (error) => {
        console.error(`Failed to start Python server: ${error.message}`);
        pythonProcess = null;
    });

    pythonProcess.on('spawn', () => {
        console.log('Python server started successfully');
    });

    pythonProcess.stderr.on('data', (data) => {
        fs.appendFileSync('error.log', `Python stderr: ${data}\n`);
    });
}

// Function to stop the Python server
async function stopPythonServer() {
    if (pythonProcess) {
        try {
            console.log("Shut down begin");
    
            // Send a POST request to the Python server to shutdown
            const response = await fetch(`http://127.0.0.1:${PY_SERVER_PORT}/shutdown`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ success: true }),
            });
        } catch (error) {
            console.error('Error:', error);
        }
        pythonProcess = null;
    } else {
        console.log("No Python server is running.");
    }
}

// Function to restart the Python server with a delay
function restartPythonServer() {
    console.log("Attempting to restart Python server in 5 seconds...");
    setTimeout(() => {
        startPythonServer();
    }, 5000);
}

function createWindow() {
    const windowState = loadWindowState();
    const win = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: true,
            enableRemoteModule: true
        }
    })

    startPythonServer()

    win.loadFile('page.html')
    win.on('resize', () => queueWindowStateSave(win));
    win.on('close', () => queueWindowStateSave(win));
    mainWindow = win;
}

function initAutoUpdater() {
    if (!app.isPackaged) return;

    autoUpdater.autoDownload = false;

    autoUpdater.on('error', (error) => {
        console.error('Auto update error:', error);
    });

    autoUpdater.on('update-available', async (info) => {
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            buttons: ['Download', 'Later'],
            defaultId: 0,
            cancelId: 1,
            title: 'Update available',
            message: `Version ${info.version} is available.`,
            detail: 'Download and install the update now?',
        });

        if (result.response === 0) {
            autoUpdater.downloadUpdate();
        }
    });

    autoUpdater.on('update-not-available', () => {
        console.log('No updates available.');
    });

    autoUpdater.on('download-progress', (progress) => {
        console.log(`Update download progress: ${Math.round(progress.percent)}%`);
    });

    autoUpdater.on('update-downloaded', async () => {
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            buttons: ['Install and Relaunch', 'Later'],
            defaultId: 0,
            cancelId: 1,
            title: 'Update ready',
            message: 'Update downloaded.',
            detail: 'Install and relaunch now?',
        });

        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });

    autoUpdater.checkForUpdates();
}

app.whenReady().then(() => {
    createWindow()
    initAutoUpdater();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })

    ipcMain.handle('dialog:openFile', async () => {
        const result = await dialog.showOpenDialog({
          properties: ['openFile'] // Add 'multiSelections' if needed
        });
        return result.filePaths; // Return file paths to renderer
    });

    ipcMain.handle('dialog:save', async () => {
        const result = await dialog.showSaveDialog({
            title: 'Save File',
            defaultPath: 'segmentstats.csv',
            filters: [{ name: 'Comma Separated Values', extension: ['csv'] }],
        });
        return result.filePath;
    });
})

app.on('will-quit', () => {
    stopPythonServer();
});
