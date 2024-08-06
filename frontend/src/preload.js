const { ipcRenderer, MessageChannelMain} = require('electron');
const path = require('path');
const fs = require('fs'); 

const { ipcRenderer } = require('electron');

const windowLoaded = new Promise(resolve => {
  window.onload = resolve;
});

ipcRenderer.on('portMain', async (event) => {
  await windowLoaded;
  window.postMessage('portMain', '*', event.ports);
});

ipcRenderer.on('portRenderer', async (event) => {
  await windowLoaded;
  window.postMessage('portRenderer', '*', event.ports);
});

ipcRenderer.on('portEmscripten', async (event) => {
  await windowLoaded;
  window.postMessage('portEmscripten', '*', event.ports);
});

// contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
// contextBridge.exposeInMainWorld('ipcWrapper', {
//   node: () => process.versions.node,
//   chrome: () => process.versions.chrome,
//   electron: () => process.versions.electron,
//   // send: (channel, data) => ipcRenderer.send(channel, data),
//   // sendSync: (channel, data) => ipcRenderer.sendSync(channel, data),
//   on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
//   path: {
//     join: (...args) => path.join(...args),
//     isAbsolute: (p) => path.isAbsolute(p),
//     relative: (from, to) => path.relative(from, to),
//     resolve: (...args) => path.resolve(...args),
//     normalize: (...args) => path.normalize(...args),
//   },
//   fs: {
//     existsSync: (p) => fs.existsSync(p),
//     readFileSync: (filePath) => fs.readFileSync(filePath, 'utf8'),
//   },
//   readFile: (filePath) => {
//         return fs.readFileSync(filePath, 'utf8');
//     },
//     receive: (channel, func) => {
//         ipcRenderer.on(channel, (event, ...args) => func(...args));
//     },
//   openExternal: (url) => ipcRenderer.sendSync('openExternal', url),
//   showItemInFolder: (p) => ipcRenderer.sendSync('showItemInFolder', p),
//   setOFPath: (callback) => ipcRenderer.on('setOfPath', callback),
//   getCurrentDirectory: () => ipcRenderer.sendSync('cwd'),
//   setUpdatePath: (callback) => ipcRenderer.on('setUpdatePath', callback),
//   isUpdateMultiplePathOk: (callback) => ipcRenderer.on('isUpdateMultiplePathOk', callback),
//   setup: () => ipcRenderer.send('setup'),
//   setDefaults: (callback) => ipcRenderer.on('setDefaults', callback),
//   setStartingProject: (callback) => ipcRenderer.on('setStartingProject', callback),
//   setProjectPath: (callback) => ipcRenderer.on('setProjectPath', callback),
//   setSourceExtraPath: (callback) => ipcRenderer.on('setSourceExtraPath', callback),
//   setGenerateMode: (callback) => ipcRenderer.on('setGenerateMode', callback),
//   importProjectSettings: (callback) => ipcRenderer.on('importProjectSettings', callback),
//   setAddons: (callback) => ipcRenderer.on('setAddons', callback),
//   setPlatforms: (callback) => ipcRenderer.on('setPlatforms', callback),
//   setTemplates: (callback) => ipcRenderer.on('setTemplates', callback),
//   enableTemplate: (callback) => ipcRenderer.on('enableTemplate', callback),
//   selectAddons: (callback) => ipcRenderer.on('selectAddons', callback),
//   sendUIMessage: (callback) => ipcRenderer.on('sendUIMessage', callback),
//   consoleMessage: (callback) => ipcRenderer.on('consoleMessage', callback),
//   generateCompleted: (callback) => ipcRenderer.on('generateCompleted', callback),
//   updateCompleted: (callback) => ipcRenderer.on('updateCompleted', callback),
//   setRandomisedSketchName: (callback) => ipcRenderer.on('setRandomisedSketchName', callback),
//   quit: () => ipcRenderer.send('quit'),
//   openExternal: (url) => ipcRenderer.invoke('openExternal', url),
//   browseOfPath: () => ipcRenderer.invoke('pickOfPath'),
//   browseProjectPath: () => ipcRenderer.invoke('pickProjectPath'),
//   browseSourcePath: (index) => ipcRenderer.invoke('pickSourcePath', index),
//   browseImportProject: () => ipcRenderer.invoke('pickProjectImport'),
//   getUpdatePath: () => ipcRenderer.invoke('pickUpdatePath'),
//   rescanAddons: () => ipcRenderer.invoke('refreshAddonList'),
//   getRandomSketchName: (projectPath) => ipcRenderer.invoke('getRandomSketchName', projectPath),
//   launchInIDE: (project) => ipcRenderer.invoke('launchProjectinIDE', project),
//   launchFolder: (project) => ipcRenderer.invoke('launchFolder', project),
//   getOFVersion: () => ipcRenderer.invoke('getVersion'),
//   getOFPlatform: () => ipcRenderer.invoke('getHostType'),
//   getOFPath: () => ipcRenderer.invoke('getOFPath')
// });

// Include additional scripts
// require(path.join(__dirname, 'src/main.js'));
require(path.join(__dirname, 'static/js/jquery.dragbetter.js'));
require(path.join(__dirname, 'static/js/jquery.min.js'));
require(path.join(__dirname, 'static/js/semantic.min.js'));
// require(path.join(__dirname, 'src/app.js'));
