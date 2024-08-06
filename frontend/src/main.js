const {
    dialog,
    Menu,
    MessageChannelMain,
    crashReporter,
    shell,
    session,
    Tray
} = require('electron');

const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('node:path')
const fs = require('fs');
// const path = require('path');
const moniker = require('moniker');
const process = require('process');
const os = require("os");
const exec = require('child_process').exec;
const { URL } = require('url');



//---------------------------------------------------------
// Report crashes to our server.
crashReporter.start({
    uploadToServer: false,
    productName: 'openFrameworks ProjectGenerator frontend',
});

// Debugging: start the Electron PG from the terminal to see the messages from console.log()
// Example: /path/to/PG/Contents/MacOS/Electron /path/to/PG/Contents/Ressources/app
// Note: app.js's console.log is also visible from the WebKit inspector. (look for mainWindow.openDevTools() below )


//--------------------------------------------------------- load settings

/**
 * @typedef {{ 
 *   defaultOfPath: string, 
 *   advancedMode: boolean, 
 *   defaultPlatform: string,
 *   showConsole: boolean,
 *   showDeveloperTools: boolean, 
 *   defaultRelativeProjectPath: string, 
 *   useDictionaryNameGenerator: boolean
 * }} Settings
 */

/** @type Settings */
let settings = {};
let tray = null;


/** @type Settings */
const templateSettings = {
    defaultOfPath: "",
    advancedMode: false,
    defaultPlatform: '',
    showConsole: false,
    showDeveloperTools: true,
    defaultRelativeProjectPath: "apps/myApps",
    useDictionaryNameGenerator: true
};

const darkBackgroundColor = 'black';
const lightBackgroundColor = 'white';



/**
 * Determines the current platform based on process information.
 * @returns {string} The platform identifier.
 */
function getCurrentPlatform() {
    let platform = "unknown";

    if (/^win/.test(process.platform)) {
        platform = 'vs';
    } else if (process.platform === "darwin") {
        platform = 'osx';
    } else if (process.platform === "linux") {
        if (process.arch === 'ia32') {
            platform = 'linux'; // Linux 32-bit
        } else if (process.arch === 'x64') {
            platform = 'linux64'; // Linux 64-bit
        } else if (process.arch === 'arm' || process.arch === 'arm64') {
            const cpuModel = os.cpus()[0].model.toLowerCase();
            if (cpuModel.includes('armv6')) {
                platform = 'linuxarmv6l'; // ARMv6
            } else if (cpuModel.includes('armv7')) {
                platform = 'linuxarmv7'; // ARMv7
            } else if (process.arch === 'arm64') {
                platform = 'linuxaarch64'; // ARM 64-bit
            } else {
                platform = 'linuxarm';
            }
        } else {
            platform = 'linux';
        }
    }
    return platform;
}
const hostplatform = getCurrentPlatform();

/**
 * Determines the default template for a given platform.
 * @param {string} platformId - The platform identifier.
 * @returns {string} The default template for the platform.
 */
function getDefaultTemplateForPlatform(platformId) {
    const defaultTemplates = {
        "osx": "OS X (Xcode)",
        "vs": "Windows (Visual Studio)",
        "msys2": "Windows (msys2/mingw)",
        "ios": "iOS (Xcode)",
        "macos": "Mega iOS/tvOS/macOS (Xcode)",
        "android": "Android (Android Studio)",
        "linux64": "Linux 64 (VS Code/Make)",
        "linuxarmv6l": "Arm 32 (VS Code/Make)",
        "linuxaarch64": "Arm 64 (VS Code/Make)",
        "vscode": "VS Code"
    };

    return defaultTemplates[platformId] || "Unknown Template";
}

// Example usage:
const platformId = getCurrentPlatform();
const defaultTemplate = getDefaultTemplateForPlatform(platformId);
console.log(`Detected platform: ${platformId}`);
console.log(`Default template: ${defaultTemplate}`);


try {
    const settingsJsonString = fs.readFileSync(path.resolve(__dirname, 'settings.json'), 'utf-8');
    settings = JSON.parse(settingsJsonString);
    console.log(settings);

    if (!settings.defaultPlatform) {
        settings.defaultPlatform = getDefaultTemplateForPlatform(getCurrentPlatform());
    }

} catch (e) {
    // automatic platform detection
    let myPlatform = "Unknown";
    if (/^win/.test(process.platform)) {
        myPlatform = 'vs';
    }
    else {
        myPlatform = getCurrentPlatform();
    }
    settings = {
        defaultOfPath: "",
        advancedMode: false,
        defaultPlatform: getCurrentPlatform(),
        showConsole: false,
        showDeveloperTools: true,
        defaultRelativeProjectPath: "apps/myApps",
        useDictionaryNameGenerator: true,
    };
}

for(const key in templateSettings) {
    if(!settings.hasOwnProperty(key)) {
        settings[key] = templateSettings[key];
    }
}



console.log("detected platform: " + hostplatform + " in " + __dirname);

const randomName = moniker.choose();
console.log(`Randomly generated name: ${randomName}`);

// Get the current working directory
const currentDir = process.cwd();
console.log(`Current working directory: ${currentDir}`);

const platform = os.platform();
console.log(`Operating system platform: ${platform}`);

// Execute a shell command using exec
// exec('ls', (error, stdout, stderr) => {
//     if (error) {
//         console.error(`Error executing command: ${error.message}`);
//         return;
//     }
//     if (stderr) {
//         console.error(`Error in command output: ${stderr}`);
//         return;
//     }
//     console.log(`Command output: ${stdout}`);
// });
// hide some addons, per https://github.com/openframeworks/projectGenerator/issues/62

const addonsToSkip = [
    "ofxiOS",
    "ofxMultiTouch",
    "ofxEmscripten",
    "ofxAccelerometer",
    "ofxAndroid"
];

const platforms = {
    "osx": "OS X (Xcode)",
    "vs": "Windows (Visual Studio)",
    "msys2": "Windows (msys2/mingw)",
    "ios": "iOS (Xcode)",
    "macos": "Mega iOS/tvOS/macOS (Xcode)",
    "android": "Android (Android Studio)",
    "linux64": "Linux 64 (VS Code/Make)",
    "linuxarmv6l": "Arm 32 (VS Code/Make)",
    "linuxaarch64": "Arm 64 (VS Code/Make)",
    "vscode": "VS Code"
};

const bUseMoniker = settings["useDictionaryNameGenerator"];

const templates = {
    "emscripten": "Emscripten",
    "gitignore": "Git Ignore",
    "gl3.1": "Open GL 3.1",
    "gl3.2": "Open GL 3.2",
    "gl3.3": "Open GL 3.3",
    "gl4.0": "Open GL 4.0",
    "gl4.1": "Open GL 4.1",
    "gl4.2": "Open GL 4.2",
    "gl4.3": "Open GL 4.3",
    "gl4.4": "Open GL 4.4",
    "gl4.5": "Open GL 4.5",
    "gles2": "Open GL ES 2",
    "linux": "Linux",  // !!??
    "msys2": "MSYS2/MinGW project template",
    "nofmod": "OSX application with no FMOD linking",
    "nowindow": "No window application",
    "tvOS": "Apple tvOS template",
    "unittest": "Unit test no window application",
    "vscode": "Visual Studio Code",
};

let defaultOfPath = settings["defaultOfPath"];

if (!path.isAbsolute(defaultOfPath)) {

    // todo: this needs to be PLATFORM specific b/c of where things are placed.
    // arturo, this may differ on linux, if putting ../ in settings doesn't work for the default path
    // take a look at this...

    if (hostplatform == "windows" || hostplatform == "linux" || hostplatform == "linux64" ){
    	defaultOfPath = path.resolve(path.join(path.join(__dirname, "../../../"), defaultOfPath));
    } else if(hostplatform == "osx"){
    	defaultOfPath = path.resolve(path.join(path.join(__dirname, "../../../"), defaultOfPath));
    }

    settings["defaultOfPath"] = defaultOfPath || "";
}



// now, let's look for a folder called mySketch, and keep counting until we find one that doesn't exist
const startingProject = getStartingProjectName();

//---------------------------------------------------------
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is GCed.
let mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', () => {
	console.log("window-all-closed");
    app.quit();
    process.exit();
});

app.on('render-process-gone', (event, webContents, details) => { 
	console.log("render-process-gone");
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)

    if (parsedUrl.origin !== 'index.html') {
      event.preventDefault()
    }

    if (isSafeForExternalOpen(navigationUrl)) {
      setImmediate(() => {
        shell.openExternal(navigationUrl)
      })
    }
    return { action: 'deny' }
  })
})

/**
 * @param {Date} date 
 * @returns {string}
 */
function formatDate(date){
    //get the year
    const year = date.getFullYear().toString().substring(2, 4);
    //get the month
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    //get the day
    const day = date.getDate().toString().padStart(2, '0');;
    //return the string "MMddyy"
    return month + day + year;
}

/**
 * @param {number} num
 * @returns {string}
 */
function toLetters(num) {
    const mod = num % 26;
    let pow = (num / 26) | 0;
    const out = mod ? String.fromCharCode(96 + (num % 26)) : (--pow, 'z');
    return pow ? toLetters(pow) + out : out;
}


function createWindow() {
    if(!mainWindow) {
        console.log("[mainWindow::createWindow]");
        mainWindow = new BrowserWindow({
            width: 800,
            height: 900,
            resizable: true,
            frame: false,
            show: false,
            webPreferences: {
                preload: path.join(app.getAppPath(), '/src/preload.js'),
                webSecurity: true,
                nodeIntegration: true,
                "nodeIntegrationInWorker": 1,
                contextIsolation: true,
                enableRemoteModule: false,
            }

        });

        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
        });

        mainWindow.webContents.on('render-process-gone', (event, details) => { 
            console.log("[mainWindow::render-process-gone]");
        });

        mainWindow.loadFile(path.join(app.getAppPath(), '/src/index.html'));

        if (settings["showDeveloperTools"]) {
            mainWindow.webContents.openDevTools();
        }
        
        //when the window is loaded send the defaults
        mainWindow.webContents.on('did-finish-load', () => {
            mainWindow.webContents.send('cwd', app.getAppPath());
            mainWindow.webContents.send('cwd', __dirname);
            mainWindow.webContents.send('cwd', process.resourcesPath);
            mainWindow.webContents.send('setStartingProject', getStartingProjectName());
            mainWindow.webContents.send('setDefaults', settings);
            mainWindow.webContents.send('setup', '');
            mainWindow.webContents.send('checkOfPathAfterSetup', '');
        });


        // Emitted when the window is closed.
        mainWindow.on('closed', () => {
            console.log("[mainWindow::closed]");
            mainWindow = null;
            app.quit();
            process.exit();
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
        });
    } 
}

//-------------------------------------------------------- window
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
    
    // Create the browser window.
    createWindow();

    const isMac = process.platform === 'darwin'
    const menuTemplate = [
        ...(isMac ? [{
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }] : []),
        {
            label: 'File',
            submenu: [
                isMac ? { role: 'close' } : { role: 'quit' }
              ]
        }, {
            label: 'View',
            submenu: [
              { role: 'reload' },
              { role: 'forceReload' },
              { role: 'toggleDevTools' },
              { type: 'separator' },
              { role: 'resetZoom' },
              { role: 'zoomIn' },
              { role: 'zoomOut' },
              { type: 'separator' },
              { role: 'togglefullscreen' }
            ]
        }, {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac ? [
                  { role: 'pasteAndMatchStyle' },
                  { role: 'delete' },
                  { role: 'selectAll' },
                  { type: 'separator' },
                  {
                    label: 'Speech',
                    submenu: [
                      { role: 'startSpeaking' },
                      { role: 'stopSpeaking' }
                    ]
                  }
                ] : [
                  { role: 'delete' },
                  { type: 'separator' },
                  { role: 'selectAll' }
                ])
            ]
        }, {
            label: 'Window',
            submenu: [
              { role: 'minimize' },
              { role: 'zoom' },
              ...(isMac ? [
                { type: 'separator' },
                { role: 'front' },
                { type: 'separator' },
                { role: 'window' }
              ] : [
                { role: 'close' }
              ])
            ]
        },
    ];
    // @ts-ignore
    const menuV = Menu.buildFromTemplate(menuTemplate); // TODO: correct this
    Menu.setApplicationMenu(menuV);

    session.fromPartition('some-partition')
      .setPermissionRequestHandler((webContents, permission, callback) => {
        const parsedUrl = new URL(webContents.getURL())

        if (permission === 'notifications') {
          // Approves the permissions request
          callback(true)
        }

        // Verify URL
        if (parsedUrl.protocol !== 'https:') {
          // Denies the permissions request
          return callback(false)
        }
    })
});

app.on('activate', () => { // fix window bugs
  if (mainWindow === null) {
    createWindow();
  }
});


/**
 * @returns {{path: string, name: string}}
 */
function getStartingProjectName() {
    const {
        defaultOfPath,
        defaultRelativeProjectPath
    } = settings;
    console.log(defaultOfPath, defaultRelativeProjectPath);
    const defaultPathForProjects = path.join(defaultOfPath, defaultRelativeProjectPath);
    const goodName = getGoodSketchName(defaultPathForProjects);
    return {
        path: defaultPathForProjects,
        name: goodName
    };
}

/**
 * @param {Electron.IpcMainEvent} event
 * @param {string} ofPathValue
 */
function refreshAddonList(event, ofPathValue) {
    try {
        console.log("in refreshAddonList " + ofPathValue);
        // Define the path to the addons directory
        const addonsPath = path.join(ofPathValue, "addons");

        // Get the list of directories in the addons folder
        let addons = getDirectories(addonsPath, "ofx");

        // Filter out any addons that are in the addonsToSkip list
        if (addons) {
            if (addons.length > 0) {
                addons = addons.filter((addon) => addonsToSkip.indexOf(addon) === -1);
            }
        }

        console.log("Reloading the addons folder, these were found:");
        console.log(addons);

        // Send the list of addons to the renderer process
        event.sender.send('setAddons', addons);
        event.returnValue = true;

    } catch (error) {
        // Log the error
        console.error("Error in refreshAddonList:", error);

        // Send an error message to the renderer process
        event.sender.send('sendUIMessage', {
            type: 'error',
            message: 'An error occurred while refreshing the addon list. Please check the console for more details.',
            error: error.message,
        });

        // Return false as the operation was unsuccessful
        event.returnValue = false;
    }
}


/**
 * @param {Electron.IpcMainEvent} event
 * @param {string} ofPathValue
 */
function refreshPlatformList(event, ofPathValue) {
    const folders = getDirectories(path.join(ofPathValue, "scripts", "templates"));
    console.log("Reloading the templates folder, these were found:");
    console.log(folders);

    const platformsWeHave = {};
    const templatesWeHave = {};

    if (folders == null) {
        //do something
    } else {
        // check all folder name under /scripts/templates
        for (const id in folders) {
            const key = folders[id];
            if (platforms[key]) {
                // this folder is for platform
                console.log("Found platform, key " + key + " has value " + platforms[key]);
                platformsWeHave[key] = platforms[key];
            } else {
                // this folder is for template
                if(templates[key]){
                    console.log("Found template folder, key " + key + " has value " + templates[key]);
                    templatesWeHave[key] = templates[key];
                } else {
                    // Unofficial folder name, maybe user's custom template? 
                    // We use folder name for both of key and value
                    console.log("Found unofficial folder, key " + key + " has value " + key);
                    templatesWeHave[key] = key;
                }
            }
        }
    }
    // saninty check...
    // for(const key in platformsWeHave){
    // 	console.log("key " + key + " has value " + platformsWeHave[key]);
    // }
    mainWindow.webContents.send('setPlatforms', platformsWeHave);
    mainWindow.webContents.send('setTemplates', templatesWeHave);
}

/**
 * @param {string} currentProjectPath 
 * @returns {string}
 */
function getGoodSketchName(currentProjectPath) {
    let goodName = "ofx";

    try {
        if (bUseMoniker) {
            const projectNames = new moniker.Dictionary();
            projectNames.read(path.join(__dirname, 'static', 'data', 'sketchAdjectives.txt'));

            while (true) {
                if (fs.existsSync(path.join(currentProjectPath, goodName))) {
                    console.log("«" + goodName + "» already exists, generating a new name...");
                    const adjective = projectNames.choose();
                    console.log(adjective);
                    goodName = "ofx" + adjective.charAt(0).toUpperCase() + adjective.slice(1) + "";
                } else {
                    break;
                }
            }
        } else {
            const date = new Date();
            const formattedDate = formatDate(date);
            goodName = "of" + formattedDate;
            let count = 1;

            while (true) {
                if (fs.existsSync(path.join(currentProjectPath, goodName))) {
                    console.log("«" + goodName + "» already exists, generating a new name...");
                    goodName = "ofx" + formattedDate + toLetters(count);
                    count++;
                } else {
                    break;
                }
            }
        }
    } catch (error) {
        console.error("Error in getGoodSketchName:", error);
        goodName = "ofxProjectx"; // Fallback name in case of an error
    }

    return goodName;
}

/** 
 * @param {string} srcpath
 * @param {string} [acceptedPrefix]
 * @returns {string[] | null}
 */
function getDirectories(srcpath, acceptedPrefix) {
    // because this is called at a different time, fs and path
    // seemed to be "bad" for some reason...
    // that's why I am making temp ones here.
    // console.log(path);

    try {
        return fs.readdirSync(srcpath).filter((file) => {
            //console.log(srcpath);
            //console.log(file);
            try{
                const joinedPath = path.join(srcpath, file);
                if ((acceptedPrefix == null || file.substring(0, acceptedPrefix.length) == acceptedPrefix) && joinedPath !== null) {
                    // only accept folders (potential addons)
                    return fs.statSync(joinedPath).isDirectory();
                }
            } catch(e) {

            }
        });
    } catch (e) {
        console.log(e);
        return null;
        // if (e.code === 'ENOENT') {
        // 	console.log("This doesn't seem to be a valid addons folder:\n" + srcpath);
        // 	mainWindow.webContents.send('sendUIMessage', "No addons were found in " + srcpath + ".\nIs the OF path correct?");
        // } else {
        // 	throw e;
        // }
    }
}

// todo: default directories

//----------------------------------------------------------- ipc

ipcMain.on('isOFProjectFolder', (event, project) => {
    const {
        projectPath,
        projectName
    } = project;
    const folder = path.join(projectPath, projectName);

    try {
        const tmpFiles = fs.readdirSync(folder);
        if (!tmpFiles || tmpFiles.length <= 1) {
            return false;
        } // we need at least 2 files/folders within

        // todo: also check for config.make & addons.make ?
        let foundSrcFolder = false;
        let foundAddons = false;
        let foundConfig = false;
        tmpFiles.forEach((el, i) => {
            if (el == 'src') {
                foundSrcFolder = true;
            }
            if (el == 'addons.make') {
                foundAddons = true;
            }
            if(el == 'config.make'){
                foundConfig = true;
            }
        });

        if (foundSrcFolder) {
            event.sender.send('setGenerateMode', 'updateMode');

            if (foundAddons) {
                let projectAddons = fs.readFileSync(path.resolve(folder, 'addons.make')).toString().split("\n");

                projectAddons = projectAddons.filter((el) => {
                    if (el === '' || el === 'addons') {
                        return false;
                    } // eleminates these items
                    else {
                        return true;
                    }
                });

                // remove comments
                projectAddons = projectAddons.map((element) => element.split('#')[0]);

                // console.log('addons', projectAddons);

                event.sender.send('selectAddons', projectAddons);
            } else {
                event.sender.send('selectAddons', {});
            }
            
            if(foundConfig){
                let projectExtra = fs.readFileSync(path.resolve(folder, 'config.make')).toString().split("\n");
                projectExtra = projectExtra.filter((el) => {
                    if (el === '' || el[0] === '#') {
                        return false;
                    } // eleminates these items
                    else {
                        console.log("got a good element " + el );
                        return true;
                    }
                });
                
                //read the valid lines
                let extraSrcPathsCount = 0;
                
                projectExtra.forEach((el, i) => {
                    //remove spaces
                    const line = el.replace(/ /g, '');
                    
                    //split either on = or +=
                    let splitter = "+=";
                    let n = line.indexOf(splitter);
                    let macro, value;
                    
                    if( n != -1 ){
                        macro = line.substring(0, n);
                        value = line.substring(n + splitter.length);
                    } else {
                        splitter = "=";
                        n = line.indexOf(splitter);
                        if( n != -1 ){
                            macro = line.substring(0, n);
                            value = line.substring(n + splitter.length);
                        }
                    }
                    
                    if( macro != null && value != null && macro.length && value.length) {
                        // this is where you can do things with the macro/values from the config.make file

                        console.log("Reading config pair. Macro: " + macro + " Value: " + value);
                        
                        if(macro.startsWith('PROJECT_EXTERNAL_SOURCE_PATHS')) {
                            event.sender.send('setSourceExtraPath', [value, extraSrcPathsCount]);
                            extraSrcPathsCount++;
                        }
                    }
                });
                
            }
            
        } else {
            event.sender.send('setGenerateMode', 'createMode');
        }

        /*if (joinedPath != null){
		  // only accept folders (potential addons)
		  return fs.statSync(joinedPath).isDirectory();
		}*/
    } catch (e) { // error reading dir
        event.sender.send('setGenerateMode', 'createMode');

        if (e.code === 'ENOENT') { // it's not a directory
            return false;
        } else {
            throw e;
        }
    }
});

ipcMain.on('refreshAddonList', refreshAddonList);

ipcMain.on('refreshPlatformList', refreshPlatformList);

ipcMain.on('refreshTemplateList', (event, arg) => {
    console.log("refreshTemplateList");
    const { selectedPlatforms, ofPath, bMulti } = arg;

    const supportedPlatforms = [];

    try {
        for (const template in templates) {
            const configFilePath = path.join(ofPath, "scripts", "templates", template, "template.config");
            if (fs.existsSync(configFilePath)) {
                const lineByLine = require('n-readlines');
                const liner = new lineByLine(configFilePath);
                let line;
                let bFindPLATOFORMS = false;

                while (line = liner.next()) {
                    let line_st = line.toString();
                    if (line_st.includes('PLATFORMS')) {
                        line_st = line_st.replace('PLATFORMS', '');
                        line_st = line_st.replace('=', '');
                        let platforms = line_st.trim().split(' ');
                        supportedPlatforms[template] = platforms;
                        bFindPLATOFORMS = true;
                        break;
                    }
                }

                if (!bFindPLATOFORMS) {
                    supportedPlatforms[template] = 'enable';
                }
            } else {
                supportedPlatforms[template] = 'enable';
            }
        }

        const invalidTemplateList = [];
        for (const template in supportedPlatforms) {
            const platforms = supportedPlatforms[template];
            if (platforms !== 'enable') {
                const bValidTemplate = selectedPlatforms.every(p => platforms.indexOf(p) > -1);
                if (!bValidTemplate) {
                    console.log("Selected platform [" + selectedPlatforms + "] does not support template " + template);
                    invalidTemplateList.push(template);
                }
            }
        }

        const returnArg = { invalidTemplateList, bMulti };
        mainWindow.webContents.send('enableTemplate', returnArg);
    } catch (error) {
        console.error("Error in processing templates:", error);
    }
}); // This closing was missing



ipcMain.on('getRandomSketchName', (event, projectPath) => {
    const goodName = getGoodSketchName(projectPath);
    event.returnValue = { randomisedSketchName: goodName, generateMode: 'createMode' };
    //event.sender.send('setRandomisedSketchName', goodName);
    // event.sender.send('setGenerateMode', 'createMode'); // it's a new sketch name, we are in create mode
});

function getPgPath() {
    let pgApp = "";
    try {
        if (hostplatform == "linux" || hostplatform == "linux64") { // ???: when appear there linux64?
            pgApp = path.join(defaultOfPath, "apps/projectGenerator/commandLine/bin/projectGenerator");
            //pgApp = "projectGenerator";
        } else {
            pgApp = path.normalize(path.join(__dirname, "app", "projectGenerator"));
        }

        if (hostplatform == 'osx' || hostplatform == 'linux' || hostplatform == 'linux64') {
            pgApp = pgApp.replace(/ /g, '\\ ');
        } else {
            pgApp = "\"" + pgApp + "\"";
        }
    } catch (error) {
        console.error("Error determining project generator path:", error);
        pgApp = ""; // Return an empty string or some default path in case of error
    }
    return pgApp;
}


/** @typedef {{
 *     updatePath: string,
 *     platformList: Array<string>,
 *     templateList: Array<string>,
 *     ofPath: string,
 *     updateRecursive: boolean,
 *     verbose: boolean
 * }} UpdateArgument */

/**
 * @param {Electron.IpcMainEvent} event
 * @param {UpdateArgument} update
 */
function updateFunction(event, update) {
    console.log(update);

    let updatePathString = "";
    let pathString = "";
    let platformString = "";
    let templateString = "";
    let recursiveString = "";
    let verboseString = "";

    const {
        updatePath,
        platformList,
        templateList,
        ofPath,
        updateRecursive,
        verbose
    } = update;

    if (updatePath != null) {
        updatePathString = `"${updatePath}"`;
    }

    if (platformList != null) {
        platformString = `-p"${platformList.join(",")}"`;
    }

    if (templateList != null) {
        templateString = `-t"${templateList.join(",")}"`;
    }

    if (ofPath != null) {
        pathString = `-o"${ofPath}"`;
    }

    if (updateRecursive == true) {
        recursiveString = "-r";
    }

    if (verbose == true) {
        verboseString = "-v";
    }

    const pgApp = getPgPath();
    
    const wholeString = [
        pgApp,
        recursiveString,
        verboseString,
        pathString,
        platformString,
        templateString,
        updatePathString
    ].join(" ");

    exec(wholeString, { maxBuffer : Infinity }, (error, stdout, stderr) => {
        if (error === null) {
            event.sender.send('consoleMessage', "<strong>" + wholeString + "</strong><br>" + stdout);
            event.sender.send('sendUIMessage',
                '<strong>Success!</strong><br>' +
                'Updating your project was successful! <a href="file:///' + updatePath + '" class="monospace" data-toggle="external_target">' + updatePath + '</a><br><br>' +
                '<button class="btn btn-default console-feature" onclick="$(\'#fullConsoleOutput\').toggle();">Show full log</button><br>' +
                '<div id="fullConsoleOutput"><br><textarea class="selectable">' + stdout + '\n\n\n(command used:' + wholeString + ')\n\n\n</textarea></div>'
            );

            //
            event.sender.send('updateCompleted', true);
        } else {
            event.sender.send('consoleMessage', "<strong>" + wholeString + "</strong><br>" + error.message);
            event.sender.send('sendUIMessage',
                '<strong>Error...</strong><br>' +
                'There was a problem updating your project... <span class="monospace">' + updatePath + '</span>' +
                '<div id="fullConsoleOutput" class="not-hidden"><br><textarea class="selectable">' + error.message + '\n\n\n(command used:' + wholeString + ')\n\n\n</textarea></div>'
            );
        }
    });

    console.log(wholeString);

    //console.log(__dirname);
}

ipcMain.on('update', updateFunction);

/** @typedef {{
 *     projectName: string,
 *     projectPath: string,
 *     sourcePath: string,
 *     platformList: Array<string>,
 *     templateList: Array<string>,
 *     addonList: Array<string>,
 *     ofPath: string,
 *     verbose: boolean,
 * }} GenerateArgument */

/**
 * @param {Electron.IpcMainEvent} event
 * @param {GenerateArgument} generate
 */
function generateFunction(event, generate) {
    let projectString = "";
    let pathString = "";
    let addonString = "";
    let platformString = "";
    let templateString = "";
    let verboseString = "";
    let sourceExtraString = "";

    const {
        platformList,
        templateList,
        addonList,
        ofPath,
        sourcePath,
        verbose,
        projectPath,
        projectName,
    } = generate;

    if (platformList != null) {
        platformString = `-p"${platformList.join(",")}"`;
    }

    if (templateList != null) {
        templateString = `-t"${templateList.join(",")}"`;
    }

    if (addonList != null &&
        Array.isArray(addonList) &&
        addonList.length > 0)
    {
        addonString = `-a"${addonList.join(",")}"`;
    } else {
        addonString = '-a" "';
    }

    if (ofPath != null) {
        pathString = `-o"${ofPath}"`;
    }
    
    if (sourcePath != null && sourcePath.length > 0) {
        sourceExtraString = `-s"${sourcePath}"`;
    }

    if (verbose === true) {
        verboseString = "-v";
    }

    if (projectName != null && projectPath != null) {
        projectString = `"${path.join(projectPath, projectName)}"`;
    }

    const pgApp = getPgPath();
    const wholeString = [
        pgApp,
        verboseString,
        pathString,
        addonString,
        platformString,
        sourceExtraString,
        templateString,
        projectString
    ].join(' ');

    exec(wholeString, { maxBuffer : Infinity }, (error, stdout, stderr) => {
        const text = stdout; //Big text with many line breaks
        const lines = text.split(os.EOL); //Will return an array of lines on every OS node works
        const wasError = lines.some(line => (line.indexOf("Result:") > -1 && line.indexOf("error") > -1));
        
        // wasError = did the PG spit out an error (like a bad path, etc)
        // error = did node have an error running this command line app

        const fullPath = path.join(projectPath, projectName);
        if (error === null && wasError === false) {
            event.sender.send('consoleMessage', `<strong>${wholeString}</strong><br>${stdout}`);
            event.sender.send('sendUIMessage',
                '<strong>Success!</strong><br>'
                + 'Your can now find your project in <a href="file:///' + fullPath + '" data-toggle="external_target" class="monospace">' + fullPath + '</a><br><br>'
                + '<div id="fullConsoleOutput" class="not-hidden"><br>'
                + '<textarea class="selectable">' + stdout + '\n\n\n(command used: ' + wholeString + ')\n\n\n</textarea></div>'
            );
            event.sender.send('generateCompleted', true);
        } else if (error !== null) {
            event.sender.send('consoleMessage', `<strong>${wholeString}</strong><br>${error.message}`);
            // note: stderr mostly seems to be also included in error.message
            // also available: error.code, error.killed, error.signal, error.cmd
            // info: error.code=127 means commandLinePG was not found
            event.sender.send('sendUIMessage',
                '<strong>Error...</strong><br>'
                + 'There was a problem generating your project... <span class="monospace">' + fullPath + '</span>'
                + '<div id="fullConsoleOutput" class="not-hidden"><br>'
                + '<textarea class="selectable">' + error.message + '</textarea></div>'
            );
        } else if (wasError === true) {
            event.sender.send('consoleMessage', "<strong>" + wholeString + "</strong><br>" + stdout);
            event.sender.send('sendUIMessage',
                '<strong>Error!</strong><br>'
                + '<strong>Error...</strong><br>'
                + 'There was a problem generating your project... <span class="monospace">' + fullPath + '</span>'
                + '<div id="fullConsoleOutput" class="not-hidden"><br>'
                + '<textarea class="selectable">' + stdout + '\n\n\n(command used: ' + wholeString + ')\n\n\n</textarea></div>'
            );
        }
    });

    console.log(wholeString);
}

ipcMain.on('generate', generateFunction);

let dialogIsOpen = false;

ipcMain.on('pickOfPath', async () => {
    if(dialogIsOpen){
        return;
    }

    dialogIsOpen = true;
    try {
        const filenames = await dialog.showOpenDialog(mainWindow, {
            title: 'select the root of OF, where you see libs, addons, etc',
            properties: ['openDirectory'],
            filters: [],
            defaultPath: arg
        });
        if (filenames !== undefined && filenames.filePaths.length > 0) {
            defaultOfPath = filenames.filePaths[0];
            console.log('setOfPath: ', defaultOfPath);
            event.sender.send('setOfPath', defaultOfPath);
        }
    } catch(err) {
        console.error('pickOfPath', err);
    }
    dialogIsOpen = false;
});

ipcMain.on('pickUpdatePath', async (event, arg) => {
    if(dialogIsOpen){
        return;
    }

    dialogIsOpen = true;
    try {
        const filenames = await dialog.showOpenDialog({
            title: 'select root folder where you want to update',
            properties: ['openDirectory'],
            filters: [],
            defaultPath: arg
        });
        if (filenames !== undefined && filenames.filePaths.length > 0) {
            // defaultOfPath = filenames.filePaths[0]; // TODO: IS THIS CORRECT?
            event.sender.send('setUpdatePath', filenames.filePaths[0]);
        }
    } catch(err) {
        console.error('pickUpdatePath', err);
    }
    dialogIsOpen = false;
});

ipcMain.on('pickProjectPath', async (event, arg) => {
    if(dialogIsOpen){
        return;
    }

    dialogIsOpen = true;
    try {
        const filenames = await dialog.showOpenDialog({
            title: 'select parent folder for project, typically apps/myApps',
            properties: ['openDirectory'],
            filters: [],
            defaultPath: arg
        });
        if (filenames !== undefined && filenames.filePaths.length > 0) {
            event.sender.send('setProjectPath', filenames.filePaths[0]);
        }
    } catch(err) {
        console.error('pickProjectPath', err);
    }
    dialogIsOpen = false;
});

ipcMain.on('pickSourcePath', async (event, [ ofPath, index ]) => {
    if(dialogIsOpen){
        return;
    }

    dialogIsOpen = true;
    try {
        const filenames = await dialog.showOpenDialog({
            title: 'select extra source or include folder paths to add to project',
            properties: ['openDirectory'],
            filters: [],
            defaultPath: ofPath
        });
        if (filenames !== undefined && filenames.filePaths.length > 0) {
            event.sender.send('setSourceExtraPath', [filenames.filePaths[0], index]);
        }
    } catch(err) {
        console.error('pickSourcePath', err);
    }
    dialogIsOpen = false;
});

ipcMain.on('pickProjectImport', async (event, arg) => {
    if(dialogIsOpen){
        return;
    }

    dialogIsOpen = true;
    try {
        const filenames = await dialog.showOpenDialog({
            title: 'Select the folder of your project, typically apps/myApps/targetAppName',
            properties: ['openDirectory'],
            filters: [],
            defaultPath: arg
        });
        if (filenames != null && filenames.filePaths.length > 0) {
            // gather project information
            const projectSettings = {
                'projectName': path.basename(filenames.filePaths[0]),
                'projectPath': path.dirname(filenames.filePaths[0])
            };
            event.sender.send('importProjectSettings', projectSettings);
        }
    } catch(err) {
        console.error('pickProjectImport', err);
    }
    dialogIsOpen = false;
});

ipcMain.on('checkMultiUpdatePath', (event, arg) => {
    if (fs.existsSync(arg)) {
        event.sender.send('isUpdateMultiplePathOk', true);
    } else {
        event.sender.send('isUpdateMultiplePathOk', false);
    }
});

ipcMain.on('launchProjectinIDE', (event, arg) => {
    const {
        projectPath,
        projectName
    } = arg;
    const fullPath = path.join(projectPath, projectName);

    if( fs.statSync(fullPath).isDirectory() == false ){
        // project doesn't exist
        event.sender.send('projectLaunchCompleted', false );
        return;
    }

    // // launch xcode
    if( arg.platform == 'osx' || arg.platform == 'ios' || arg.platform == 'macos' || arg.platform == 'tvos' ){
        if(hostplatform == 'osx'){
            let osxPath = path.join(fullPath, projectName + '.xcodeproj');
            console.log( osxPath );
            osxPath = "\"" + osxPath + "\"";

            exec('open ' + osxPath, (error, stdout, stderr) => {
                return;
            });
        }
    } else if( hostplatform == 'osx' && arg.platform == 'vscode'){
        if(hostplatform == 'osx'){
            let osxPath = path.join(fullPath, projectName + '.code-workspace');
            console.log( osxPath );
            osxPath = "\"" + osxPath + "\"";

            exec('open ' + osxPath, (error, stdout, stderr) => {
                return;
            });
        }
    } else if( arg.platform == 'linux' || arg.platform == 'linux64' ){
        if(hostplatform == 'linux'){
            let linuxPath = path.join(fullPath, projectName + '.code-workspace');
            linuxPath = linuxPath.replace(/ /g, '\\ ');
            console.log( linuxPath );
            exec('xdg-open ' + linuxPath, (error, stdout, stderr) => {
                return;
            });
        }
    } else if( arg.platform == 'android'){
        console.log("Launching ", fullPath)
        exec('studio ' + fullPath, (error, stdout, stderr) => {
            if(error){
                event.sender.send('sendUIMessage',
                '<strong>Error!</strong><br>' +
                '<span>Could not launch Android Studio. Make sure the command-line launcher is installed by running <i>Tools -> Create Command-line Launcher...</i> inside Android Studio and try again</span>'
            );
            }
        });
    } else if( hostplatform == 'windows'){
        let windowsPath = path.join(fullPath, projectName + '.sln');
        
		if(arg.platform == 'vscode' ){
			windowsPath = path.join(fullPath, projectName + '.code-workspace');
		}
        
        console.log( windowsPath );
        windowsPath = "\"" + windowsPath + "\"";
        exec('start ' + "\"\"" + " " + windowsPath, (error, stdout, stderr) => {
            return;
        });
    }
});

ipcMain.on('launchFolder', async (event, arg) => {
    const {
        projectPath, 
        projectName } = arg;
    const fullPath = path.join(projectPath, projectName);

    try {
        if(fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
            await shell.openPath(fullPath);
            event.sender.send('launchFolderCompleted', true);
        } else {
            // project doesn't exist
            event.sender.send('launchFolderCompleted', false);
        }
    } catch (error) {
        console.error('Error opening folder:', error);
        event.sender.send('launchFolderCompleted', false);
    }
});

ipcMain.on('quit', (event, arg) => {
    app.quit();
});

ipcMain.on('saveDefaultSettings', (event, defaultSettings) => {
    fs.writeFile(
        path.resolve(__dirname, 'settings.json'),
        defaultSettings,
        (err) => {
            if (err) {
                event.returnValue = "Unable to save defaultSettings to settings.json... (Error=" + err.code + ")";
            } else {
                event.returnValue = "Updated default settings for the PG. (written to settings.json)";
            }
        }
    );
});

ipcMain.on('path', (event, [ key, args ]) => {
    // console.log('path', key, args);
    event.returnValue = path[key](... args);
    return;
});

ipcMain.on('fs', (event, [ key, args ]) => {
    // console.log('fs', key, args);
    event.returnValue = fs[key](... args);
    return;
});

ipcMain.on('getOSInfo', (event) => {
    event.returnValue = {
        release: os.release(),
        platform: os.platform(),
    };
});

const allowedUrls = [
    'https://openFrameworks.cc',
    'https://github.com/openFrameworks',
    'https://github.com/openFrameworks/openFrameworks',
    'https://github.com/openFrameworks/projectGenerator',
    'https://ofxaddons.com',
    'https://localhost',
    'http://localhost',
];

ipcMain.on('openExternal', (event, url) => {
    if (allowedUrls.includes(url)) {
        shell.openExternal(url);
    } else {
        console.warn(`Blocked attempt to open non-whitelisted URL: ${url}`);
    }
});


ipcMain.on('showItemInFolder', (event, p) => {
    shell.showItemInFolder(p);
});

ipcMain.on('firstTimeSierra', (event, command) => {
    exec(command, (error, stdout, stderr) => {
        console.log(stdout, stderr);
    });
});

ipcMain.handle('command', async (event, customArg) => {
  const pgApp = getPgPath();
  const command = `${pgApp} -c "${customArg}"`;

  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: Infinity }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          message: error.message
        });
      } else {
        resolve({
          success: true,
          message: stdout
        });
      }
    });
  });
});


ipcMain.handle('getOFPath', async () => {
    const pgApp = getPgPath();
    const command = `${pgApp} --getofpath`;

    exec(command, { maxBuffer: Infinity }, (error, stdout, stderr) => {
        if (error) {
             console.log( 'getOFPath error' );
            event.sender.send('ofPathResult', {
                success: false,
                message: error.message
            });
        } else {
            try {
                 // Assuming the JSON object is on the last line
                const lastLine = stdout.trim().split('\n').pop();
                const jsonOutput = lastLine.match(/\{.*\}/); // Extract JSON string
                if (jsonOutput) {
                    const data = JSON.parse(jsonOutput[0]); // Parse JSON
                    console.log(data);
                    event.sender.send('ofPathResult', {
                        success: true,
                        message: data.ofPath
                    });
                } else {
                    throw new Error('No JSON output found');
                }
            } catch (e) {
                console.log( 'getOFPath error' );
                event.sender.send('ofPathResult', {
                    success: false,
                    message: 'Failed to parse output.'
                });
            }
        }
    });
});

ipcMain.handle('getHostType', async () => {
    const pgApp = getPgPath();
    const command = `${pgApp} -i`;

    exec(command, { maxBuffer: Infinity }, (error, stdout, stderr) => {
        if (error) {
            console.log( 'getHostType error' );
            event.sender.send('ofPlatformResult', {
                success: false,
                message: error.message
            });
        } else {
            try {
                const lastLine = stdout.trim().split('\n').pop();
                const jsonOutput = lastLine.match(/\{.*\}/); // Extract JSON string
                if (jsonOutput) {
                    const data = JSON.parse(jsonOutput[0]); // Parse JSON
                    console.log(data);
                    event.sender.send('ofPlatformResult', {
                        success: true,
                        message: data.ofHostPlatform
                    });
                } else {
                    throw new Error('No JSON output found');
                }
            } catch (e) {
                console.log( 'getHostType error' );
                event.sender.send('ofPlatformResult', {
                    success: false,
                    message: 'Failed to parse output.'
                });
            }
        }
    });
});

ipcMain.handle('getVersion', async () => {
    const pgApp = getPgPath();
    const command = `${pgApp} -w`;

    exec(command, { maxBuffer: Infinity }, (error, stdout, stderr) => {
        if (error) {
            console.log( 'getVersion error' );
            event.sender.send('ofVersionResult', {
                success: false,
                message: error.message
            });
        } else {
            try {
                const lastLine = stdout.trim().split('\n').pop();
                const jsonOutput = lastLine.match(/\{.*\}/); // Extract JSON string
                if (jsonOutput) {
                    const data = JSON.parse(jsonOutput[0]); // Parse JSON
                    console.log(data);
                    event.sender.send('ofVersionResult', {
                        success: true,
                        message: data.version
                    });
                } else {
                    throw new Error('No JSON output found');
                }
            } catch (e) {
                console.log( 'getVersion error' );
                event.sender.send('ofVersionResult', {
                    success: false,
                    message: 'Failed to parse output.'
                });
            }
        }
    });
});
