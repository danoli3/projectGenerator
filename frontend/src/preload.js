const { contextBridge, ipcRenderer, MessageChannelMain} = require('electron');
const path = require('path');
const fs = require('fs'); 

window.ipcRenderer = require('electron').ipcRenderer;
window.MessageChannelMain = require('electron').MessageChannelMain;
window.contextBridge = require('electron').contextBridge;
window.path = path;
window.fs = fs;


contextBridge.exposeInMainWorld('ipcWrapper', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  send: (channel, data) => ipcRenderer.send(channel, data),
  sendSync: (channel, data) => ipcRenderer.sendSync(channel, data),
  on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
  path: {
    join: (...args) => path.join(...args),
    isAbsolute: (p) => path.isAbsolute(p),
    relative: (from, to) => path.relative(from, to),
    resolve: (...args) => path.resolve(...args),
    normalize: (...args) => path.normalize(...args),
  },
  fs: {
    existsSync: (p) => fs.existsSync(p),
    readFileSync: (filePath) => fs.readFileSync(filePath, 'utf8'),
  },
  readFile: (filePath) => {
        return fs.readFileSync(filePath, 'utf8');
    },
    receive: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
  openExternal: (url) => ipcRenderer.sendSync('openExternal', url),
  showItemInFolder: (p) => ipcRenderer.sendSync('showItemInFolder', p),
});

// Include additional scripts
// require(path.join(__dirname, 'src/main.js'));
require(path.join(__dirname, 'static/js/jquery.dragbetter.js'));
require(path.join(__dirname, 'static/js/jquery.min.js'));
require(path.join(__dirname, 'static/js/semantic.min.js'));
// require(path.join(__dirname, 'src/app.js'));
