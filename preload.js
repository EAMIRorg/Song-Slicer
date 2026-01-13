const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const path = require('path');

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type])
    }
})

contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  getAppData: () => ipcRenderer.invoke('get-appdata'),
  createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
  openDirectory: (dirPath) => ipcRenderer.invoke('open-directory', dirPath),
  saveFile: () => ipcRenderer.invoke('dialog:save'),
  getDirectoryContents: (dirPath) => ipcRenderer.invoke('get-directory-contents', dirPath),
  getFile: (dirPath) => ipcRenderer.invoke('get-file', dirPath),
  writeToFile: (filePath, data) => ipcRenderer.invoke('write-to-file', filePath, data),
  copySongFile: (currentFilePath, newPath) => ipcRenderer.invoke('copy-song-file', currentFilePath, newPath),
  deleteDir: (dirPath) => ipcRenderer.invoke('delete-dir', dirPath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  wipeDir: (dirPath) => ipcRenderer.invoke('wipe-dir', dirPath),
  readFileAsArrayBuffer: (dirPath) => ipcRenderer.invoke('read-file', dirPath),
  pathJoin: (...segments) => path.join(...segments),
  pathBasename: (filePath) => path.basename(filePath || ''),
  homeDir: () => os.homedir()
});


