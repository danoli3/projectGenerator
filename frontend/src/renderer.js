//nodeRequire is used instead of require due to clash with node and jquery
//see section - I can not use jQuery/RequireJS/Meteor/AngularJS in Electron : https://www.electronjs.org/docs/latest/faq/
const { contextBridge, ipcRenderer, MessageChannelMain } = nodeRequire('electron');
const path = nodeRequire('path');
const fs = nodeRequire('fs'); 

// const { contextBridge } = window.contextBridge;
// const { MessageChannelMain } = window.MessageChannelMain;
// const { ipcRenderer} = window.ipcRenderer;
// const { path } = window.path;
// const { fs } = window.fs;

let platforms;
let templates;

// var platforms = {
//     "osx": "OS X (Xcode)",
//     "vs": "Windows (Visual Studio)",
//     "ios": "iOS (Xcode)",
//     "linux": "Linux 32-bit (Code::Blocks)",
//     "linux64": "Linux 64-bit (Code::Blocks)",
//     "linuxarmv6l": "Linux ARMv6 (Makefiles)",
//     "linuxarmv7l": "Linux ARMv7 (Makefiles)"
// };

let defaultSettings;
let addonsInstalled;
let isOfPathGood = false;
let isFirstTimeSierra = false;
let bVerbose = false;
let localAddons = [];

let numAddedSrcPaths = 1;

let portRenderer = null;

window.onmessage = (event) => {
  if (event.source === window) {
    if (event.data === 'portRenderer') {
      [portRenderer] = event.ports;
      setupPorts();
    }
  }
};

function setupPorts() {
    if(!portRenderer) return;
    portRenderer.onmessage = (event) => {
        const { type, data } = event.data;
        console.log('from main world:', event.data);
        if(type === "setup") {
            setup();
        } else if (type === 'setOfPath') {
            setOFPath(data);
        } else if (type === 'consoleMessage') {
            displayConsoleMessage(data);
        } else if (type === 'cwd') {
            console.log(data);
        } else if (type === 'setUpdatePath') {
            updateInputValue("updateMultiplePath", data);
        } else if (type === 'isUpdateMultiplePathOk') {
           handleUpdateMultiplePathValidation(data);
        } else if (type === 'setDefaults') {
           applyDefaultSettings(data);
        } else if (type === 'setStartingProject') {
            setStartingProject(data);
        } else if (type === 'setProjectPath') {
            setProjectPath(data);
        } else if (type === 'setSourceExtraPath') {
            const [path, index] = data;
            setSourceExtraPath(path, index);
        } else if (type === 'setGenerateMode') {
            switchGenerateMode(data);
        } else if (type === 'importProjectSettings') {
            importProjectSettings(data);
        } else if (type === 'setAddons') {
            updateAddonsList(data);
        } else if (type === 'setPlatforms') {
            updatePlatformList(data);
        } else if (type === 'setTemplates') {
            updateTemplateList(data);
        } else if (type === 'enableTemplate') {
            enableTemplate(data);
        } else if (type === 'selectAddons') {
            handleSelectAddons(data);
        } else if (type === 'showUIMessage') {
            displayUIMessage(data);
        } 

        
      };
}

/**
 * Sends a message through portRenderer to the main process.
 * @param {string} type - The type of the message to send.
 * @param {*} data - The data to send with the message.
 */
function sendMessageToMain(type, data = null) {
  if (portRenderer && portRenderer.postMessage) {
    portRenderer.postMessage({ type, data });
  } else {
    console.error('portRenderer is not available or not initialized.');
  }
}



/**
 * update input element by id to value
 * @param {string} elementId - The ID of the HTML input element.
 * @param {string} value - The value to set for the input element.
 */
function updateInputValue(elementId, value) {
  /** @type {HTMLInputElement} */
  const elem = document.getElementById(elementId);
  if (elem) {
    elem.value = value;
    $(elem).change();
  } else {
    console.error(`Element with ID ${elementId} not found.`);
  }
}

/**
 * Updates the UI based on the validity of the update multiple path.
 * @param {boolean} isValid - Indicates whether the update multiple path is valid.
 */
function handleUpdateMultiplePathValidation(isValid) {
  if (isValid) {
    $("#updateMultipleWrongMessage").hide();
    $("#updateMultipleButton").removeClass("disabled");
  } else {
    $("#updateMultipleWrongMessage").show();
    $("#updateMultipleButton").addClass("disabled");
  }
}

/**
 * Applies the default settings 
 * @param {Object} settings 
 * @param {string} settings.defaultOfPath 
 * @param {boolean} settings.advancedMode 
 */
function applyDefaultSettings(settings) {
  setOFPath(settings.defaultOfPath);
  enableAdvancedMode(settings.advancedMode);
}

/**
 * Sets the starting project details in the UI.
 * @param {Object} project - The project details object.
 * @param {string} project.path - The path of the project.
 * @param {string} project.name - The name of the project.
 */
function setStartingProject(project) {
  $("#projectPath").val(project.path);
  $("#projectName").val(project.name);
}

/**
 * Sets the project path in the UI.
 * @param {string} path - The path of the project.
 */
function setProjectPath(path) {
  $("#projectPath").val(path);
  //defaultSettings['lastUsedProjectPath'] = path;
  //saveDefaultSettings(); // Uncomment if saving settings is needed
  $("#projectName").trigger('change'); // Checks if we need to be in update or generate mode
}

/**
 * Sets the extra source path in the UI for a given index.
 * @param {string} path - The extra source path.
 * @param {number} index - The index of the extra source path input.
 */
function setSourceExtraPath(path, index) {
  checkAddSourcePath(index);
  $("#sourceExtra-" + index).val(path);
}

/**
 * Switches the generate mode in the UI.
 * @param {string} mode - The generate mode (e.g., 'updateMode' or 'createMode').
 */
function switchGenerateMode(mode) {
  // Implement the logic to switch generate mode
  // This could involve updating the UI to reflect the mode
}

/**
 * Imports project settings and updates the UI.
 * @param {Object} settings - The project settings object.
 * @param {string} settings.projectPath - The path of the project.
 * @param {string} settings.projectName - The name of the project.
 */
function importProjectSettings(settings) {
  $("#projectPath").val(settings.projectPath);
  $("#projectName").val(settings.projectName).trigger('change'); // Change triggers addon scanning
}

/**
 * Updates the addons list in the UI.
 * @param {Array<string>} addons - The list of installed addons.
 */
function updateAddonsList(addons) {
  console.log("got set addons:", addons);

  addonsInstalled = addons;

  const select = document.getElementById("addonsList");
  select.innerHTML = "";

  if (addonsInstalled !== null && addonsInstalled.length > 0) {
    // Add each addon to the dropdown list
    for (let i = 0; i < addonsInstalled.length; i++) {
      $('<div/>', {
        "class": 'item',
        "data-value": addonsInstalled[i]
      }).html(addonsInstalled[i]).appendTo(select);
    }

    $("#ofPathWrongMessage").hide();
    isOfPathGood = true;
  } else {
    if (isFirstTimeSierra) {
      $("#ofPathSierraMessage").show();
    } else {
      $("#ofPathWrongMessage").show();
    }
    isOfPathGood = false;
    $('#settingsMenuButton').click();
  }

  $('#addonsDropdown')
    .dropdown({
      allowAdditions: false,
      fullTextSearch: 'exact',
      match: "text"
    });
}

/**
 * Updates the platform list in the UI.
 * @param {Object} platforms - The object containing platform keys and display names.
 */
function updatePlatformList(platforms) {
  console.log("got set platforms");
  console.log(platforms);

  const platformKeys = Object.keys(platforms);
  
  let select = $("#platformList");
  select.empty();
  platformKeys.forEach(platform => {
    $('<div/>', {
      "class": 'item',
      "data-value": platform
    }).html(platforms[platform]).appendTo(select);
  });

  $('#platformsDropdown')
    .dropdown({
      allowAdditions: false
    });

  $('#platformsDropdown').dropdown('set exactly', defaultSettings.defaultPlatform);

  select = $("#platformListMulti");
  platformKeys.forEach(platform => {
    $('<div/>', {
      "class": 'item',
      "data-value": platform
    }).html(platforms[platform]).appendTo(select);
  });

  $('#platformsDropdownMulti')
    .dropdown({
      allowAdditions: false
    });

  $('#platformsDropdownMulti').dropdown('set exactly', defaultSettings.defaultPlatform);
}

/**
 * Updates the templates list in the UI.
 * @param {Object} templates - An object containing template keys and display names.
 */
function updateTemplateList(templates) {
  console.log("----------------");
  console.log("got set templates");
  console.log(templates);

  // Populate single template selection dropdown
  let select = $("#templateList");
  select.empty(); // Clear previous entries
  for (const i in templates) {
    $('<div/>', {
      "class": 'item',
      "data-value": i
    }).html(templates[i]).appendTo(select);
  }

  // Initialize the single template dropdown
  $('#templatesDropdown').dropdown({
    allowAdditions: false,
    fullTextSearch: 'exact',
    match: "text",
    maxSelections: 1
  });

  // Populate multi template selection dropdown
  select = $("#templateListMulti");
  select.empty(); // Clear previous entries
  for (const i in templates) {
    $('<div/>', {
      "class": 'item',
      "data-value": i
    }).html(templates[i]).appendTo(select);        
  }

  // Initialize the multi template dropdown
  $('#templatesDropdownMulti').dropdown({
    allowAdditions: false,
    maxSelections: 1
  });
}

/**
 * Enables or disables template items based on their validity.
 * @param {Object} arg - The argument object containing template validation data.
 * @param {boolean} arg.bMulti - Indicates if multiple templates are allowed.
 * @param {Array<string>} arg.invalidTemplateList - A list of invalid templates.
 */
function enableTemplate(arg) {
  console.log('enableTemplate');
  
  // Select items based on whether multi-select is enabled
  const items = arg.bMulti === false
    ? $('#templatesDropdown .menu .item')
    : $('#templatesDropdownMulti .menu .item');

  // Enable all items initially
  items.removeClass("disabled");

  // Disable invalid templates
  for (const template of arg.invalidTemplateList) {
    items.each(function() {
      if ($(this).attr('data-value') === template) {
        $(this).addClass("disabled");
      }
    });
  }
}

/**
 * Handles the selection and validation of addons in the UI.
 * @param {Array<string>} selectedAddons - The list of selected addons.
 */
function handleSelectAddons(selectedAddons) {
  // Deal with local addons
  const addonsAlreadyPicked = $("#addonsDropdown").val().split(',');
  console.log(addonsAlreadyPicked);
  console.log(selectedAddons);
  console.log(addonsInstalled);

  const neededAddons = [];
  const localAddons = [];

  // Iterate through selected addons
  for (let i = 0; i < selectedAddons.length; i++) {
    const addon = selectedAddons[i].trim();

    // Check if the addon is already picked
    if (addonsAlreadyPicked.indexOf(addon) >= 0) {
      console.log("already picked");
    } else {
      // If not picked, check if it's installed
      if (addonsInstalled.indexOf(addon) >= 0) {
        $('#addonsDropdown').dropdown('set selected', addon);
      } else {
        // Check for local addons
        const neededAddonPathRel = path.resolve($("#projectPath").val(), $("#projectName").val(), addon);
        if (fs.existsSync(neededAddonPathRel) || fs.existsSync(addon)) {
          localAddons.push(addon);
        } else {
          neededAddons.push(addon);
        }
      }
    }
  }

  // Handle missing addons
  if (neededAddons.length > 0) {
    console.log("missing addons");
    $('#missingAddonList').empty().append("<b>" + neededAddons.join(", ") + "</b>");
    $("#missingAddonMessage").show();
    $("#adons-refresh-icon").show();
  } else {
    $("#adons-refresh-icon").hide();
    $("#missingAddonMessage").hide();
  }

  // Handle local addons
  if (localAddons.length > 0) {
    $('#localAddonList').empty().append("<b>" + localAddons.join(", ") + "</b>");
    $("#localAddonMessage").show();
  } else {
    $("#localAddonMessage").hide();
  }
}

/**
 * Displays a UI message in a modal.
 * @param {Object} message - The message object to display.
 */
function displayUIMessage(message) {
  displayModal(message);
}

/**
 * Displays a message in the console area.
 * @param {string} msg - The message to display.
 */
function displayConsoleMessage(msg) {
  consoleMessage(msg);
}

/**
 * Handles the completion of the generate process.
 * @param {boolean} isSuccessful - Indicates if the generation was successful.
 */
function handleGenerateCompletion(isSuccessful) {
  if (isSuccessful) {
    // Trigger change to switch to update mode
    $("#projectName").trigger('change');
  }
}

/**
 * Handles the completion of the update process.
 * @param {boolean} isSuccessful - Indicates if the update was successful.
 */
function handleUpdateCompletion(isSuccessful) {
  if (isSuccessful) {
    // Eventual callback after update completion
  }
}

/**
 * Sets a randomized sketch name in the UI.
 * @param {string} newName - The new name to set.
 */
function setRandomisedSketchName(newName) {
  $("#projectName").val(newName);
}

/**
 * Handles the result of a command execution.
 * @param {Object} result - The result object containing success status and message.
 */
function handleCommandResult(result) {
  if (result.success) {
    console.log('Command executed successfully:', result.message);
  } else {
    console.error('Command execution failed:', result.message);
  }
}

/**
 * Handles the result of retrieving the OF path.
 * @param {Object} result - The result object containing success status and message.
 */
function handleOFPathResult(result) {
  if (result.success) {
    console.log('ofPath:', result.message);
    document.getElementById('ofPath').textContent = result.message;
    setOFPath(result.message);
    $("#updateMenuButton").triggerHandler('click');
  } else {
    console.error('ofPath: failed:', result.message);
  }
}

/**
 * Handles the result of retrieving the OF platform.
 * @param {Object} result - The result object containing success status and message.
 */
function handleOFPlatformResult(result) {
  if (result.success) {
    console.log('ofPlatform:', result.message);
    document.getElementById('platformDisplay').textContent = result.message;
    setPGPlatform(result.message);
    $("#updateMenuButton").triggerHandler('click');
  } else {
    console.error('ofPlatform: failed:', result.message);
  }
}

/**
 * Handles the result of retrieving the OF version.
 * @param {Object} result - The result object containing success status and message.
 */
function handleOFVersionResult(result) {
  if (result.success) {
    console.log('ofVersionResult:', result.message);
    document.getElementById('versionDisplay').textContent = result.message;
    setPGVersion(result.message);
    $("#updateMenuButton").triggerHandler('click');
  } else {
    console.error('ofVersionResult: failed:', result.message);
  }
}



function typeText(element, text, speed = 50) {
    let index = 0;
    element.textContent = '';

    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, speed);
        }
    }
    type();
}

function typeTextJ($element, text, speed = 50) {
    let index = 0;
    $element.text(''); // Clear previous text

    function type() {
        if (index < text.length) {
            $element.text($element.text() + text.charAt(index));
            index++;
            setTimeout(type, speed);
        }
    }
    type();
}

//-----------------------------------------------------------------------------------
// IPC
//-----------------------------------------------------------------------------------

//-------------------------------------------
ipcRenderer.on('setOfPath', (event, arg) => {
    setOFPath(arg);
});

ipcRenderer.on('cwd', (event, arg) => {
    console.log(arg);
});

ipcRenderer.on('setUpdatePath', (event, arg) => {
    /** @type {HTMLInputElement} */
    updateInputValue("updateMultiplePath", arg);
});


ipcRenderer.on('isUpdateMultiplePathOk', (event, arg) => {
    handleUpdateMultiplePathValidation(arg);
});

//-------------------------------------------
ipcRenderer.on('setup', (event, arg) => {
    setup();
});

//-----------------------------------------
// this is called from main when defaults are loaded in:
ipcRenderer.on('setDefaults', (event, arg) => {
    applyDefaultSettings(arg);
});

//-------------------------------------------
ipcRenderer.on('setStartingProject', (event, arg) =>  {
    setStartingProjectDetails(arg);
});

//-------------------------------------------
ipcRenderer.on('setProjectPath', (event, arg) => {
    setProjectPath(arg);
});

//-------------------------------------------
ipcRenderer.on('setSourceExtraPath', (event, [arg, index]) => { // TODO:
    setSourceExtraPath(arg, index);
});

//-------------------------------------------
ipcRenderer.on('setGenerateMode', (event, arg) => {
    switchGenerateMode(arg);
});

//-------------------------------------------
ipcRenderer.on('importProjectSettings', (event, settings) => {
    importProjectSettings(settings);
});

//-------------------------------------------
ipcRenderer.on('setAddons', (event, arg) => {
    updateAddonsList(arg);
});


ipcRenderer.on('setPlatforms', (event, arg) => {
    updatePlatformList(arg);
});


ipcRenderer.on('setTemplates', (event, arg) => {
    updateTemplateList(arg);
});

ipcRenderer.on('enableTemplate', (event, arg) => {
    enableTemplate(arg);
});

//-------------------------------------------
// select the list of addons and notify if some aren't installed
ipcRenderer.on('selectAddons', (event, arg) => {
   handleSelectAddons(arg);
});

//-------------------------------------------
// allow main to send UI messages
ipcRenderer.on('sendUIMessage', (event, arg) => {
  displayUIMessage(arg);
});

ipcRenderer.on('consoleMessage', (event, msg) => {
  displayConsoleMessage(msg);
});

ipcRenderer.on('generateCompleted', (event, isSuccessful) => {
  handleGenerateCompletion(isSuccessful);
});

ipcRenderer.on('updateCompleted', (event, isSuccessful) => {
  handleUpdateCompletion(isSuccessful);
});

ipcRenderer.on('setRandomisedSketchName', (event, newName) => {
  setRandomisedSketchName(newName);
});

ipcRenderer.on('commandResult', (event, result) => {
  handleCommandResult(result);
});

ipcRenderer.on('ofPathResult', (event, result) => {
  handleOFPathResult(result);
});

ipcRenderer.on('ofPlatformResult', (event, result) => {
  handleOFPlatformResult(result);
});

ipcRenderer.on('ofVersionResult', (event, result) => {
  handleOFVersionResult(result);
});

//-----------------------------------------------------------------------------------
// functions
//-----------------------------------------------------------------------------------


//----------------------------------------
/**
 * @param {string} ofPathValue 
 */
function setOFPath(ofPathValue) {
    // get the element:
    /** @type {HTMLInputElement} */
    const ofPathElem = document.getElementById("ofPath");

    const $element = $('#ofPath');
    const text = ofPathValue;

    if (ofPathValue != null && !path.isAbsolute(ofPathValue)) {
        // if we are relative, don't do anything...

        ofPathElem.value = ofPathValue;
    } else {
        // else check settings for how we want this path.... make relative if we need to:
        if (defaultSettings.useRelativePath === true) {
            const relativePath = path.normalize(path.relative(path.resolve(__dirname), ofPathValue)) + "/";
            ofPathElem.value = relativePath;
        } else {
            ofPathElem.value = ofPathValue;
        }
    }

    

    $("#ofPath").trigger('change');

    typeTextJ($element, text, 150);
}

function disableButtonTemporarily(button) {
    button.prop('disabled', true); // Disable the button
    setTimeout(() => {
        button.prop('disabled', false); // Enable the button after 400ms
    }, 400);
}


function setPGVersion(ofPathValue) {
    // get the element:
    /** @type {HTMLInputElement} */
    const ofPathElem = document.getElementById("versionDisplay");

    if (ofPathValue != null) {
        ofPathElem.value = ofPathValue;
    }

    typeText(ofPathElem, ofPathElem.value, 100);

}

function setPGPlatform(ofPathValue) {
    // get the element:
    /** @type {HTMLInputElement} */
    const ofPathElem = document.getElementById("platformDisplay");

    if (ofPathValue != null) {
        ofPathElem.value = ofPathValue;
    }

    typeText(ofPathElem, ofPathElem.value, 50);

    
}

function handleOSInfoResponse(data) {
    const { release, platform } = data;
    const os_major_pos = release.indexOf(".");
    const os_major = release.slice(0, os_major_pos);
    const isSierra = (platform === 'darwin' || platform === 'osx');

    const ofpath = document.getElementById("ofPath").value;
    console.log("platform is " + platform + " isSierra is " + isSierra + " ofpath is " + ofpath);

    if (isSierra) {
        try {
            const runningOnVar = (ofpath.length >= 8 && ofpath.substring(0, 8) === '/private');
            isFirstTimeSierra = runningOnVar;
        } catch (e) {
            isFirstTimeSierra = false;
        }
    }
    
}

//----------------------------------------
function setup() {
    jQuery.fn.extend({
        oneTimeTooltip: function (msg) {
            return this.each(function () {
                $(this).popup({
                    content: msg,
                    position: 'bottom center',
                    on: 'manual',
                    onVisible: function (e) {
                        // hide on focus / change / onShow (for dropdowns)
                        $(e).one('focus change click', function () { $(this).popup('hide'); });
                        //console.log($(e).children('input'));
                    }
                }).popup('show')
            });
        }
    });


    $(document).ready(() => {
        sendMessageToMain('getOSInfo');

        getOFPath();
        getOFPlatform();
        getOFVersion();

        if (document.querySelector('.ui.tab[data-tab="settings"]').classList.contains('active')) {
            getOFPath();
            getOFPlatform();
            getOFVersion();
        }


        // Event listener for tab change
        document.querySelectorAll('.menu .item').forEach(item => {
        item.addEventListener('click', (e) => {
        const tab = e.target.getAttribute('data-tab');
        if (tab === 'settings') {
            getOFPath();
            getOFPlatform();
            getOFVersion();
        }
        });
        

        $('#ofPathButton').click(() => {
            disableButtonTemporarily($("#commandButton"));
            getOFPath();
        });
        
        $('#commandButton').click(() => {
            disableButtonTemporarily($("#commandButton"));
            const customArg = $('#commandInput').val();
            customArg = customArg.replace(/[`$&|<>]/g, '\\$&');
            sendMessageToMain('command', customArg);
        });
       
        console.log("App is translocated: " + isFirstTimeSierra);
 
        $('.main.menu .item').tab({
            history: false
        });

        $("#createMenuButon").tab({
            'onVisible':() => {
                if (isOfPathGood !== true){
                    $('#settingsMenuButton').click();
                     $('#ofPathError').modal({
                        onHide: () => {
                             $('#settingsMenuButton').click();
                        }
                    }).modal("show");
               }
            }
        });

        $("#updateMenuButton").tab({
            'onVisible':() => {
                if (isOfPathGood !== true) {
                    $('#settingsMenuButton').click();
                     $('#ofPathError').modal({
                        onHide: () => {
                             $('#settingsMenuButton').click();
                        }
                    }).modal("show");
               }
            }
        });

        $("#settingsMenuButton").tab({
            'onVisible': () => {
                console.log("settings!! ");
                $('#createMenuButon').removeClass('active');
                $('#updateMenuButton').removeClass('active');
                $('#settingsMenuButton').addClass('active');
        }
        });

        // $('.main.menu .item').filter('.updateMultiMenuOption').tab({
        //     'onVisible':function(){
        //         alert("wh");
        //         // if (isOfPathGood !== true){
        //         //     $('.main .ui').tab('change tab', 'settings')
        //         // }
        //     }
        // });

        // bind external URLs (load it in default browser; not within Electron)
        $('*[data-toggle="external_target"]').click((e) => {
            e.preventDefault();
            sendMessageToMain('openExternal', $(e.currentTarget).prop('href'));
        });

        $("#projectPath").on('change', () => {
        	if($("#projectPath").is(":focus") === true) {
                 return; 
            }

            $("#projectName").trigger('change'); // checks the project on the new location
        });
        $("#projectPath").on('focusout', () => {
        	$("#projectPath").trigger('change');
        });

        $("#projectName").on('change', () => {
        	if( $("#projectName").is(":focus") === true ){ return; }

            // fix "non alpha numeric characters here" as we did in the old PG
            const currentStr = $("#projectName").val();
            const stripped = currentStr.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '_');
            $("#projectName").val(stripped)

        	const project = {
                projectName: $("#projectName").val(),
                projectPath: $("#projectPath").val()
            };

        	// check if project exists
        	sendMessageToMain('isOFProjectFolder', project);

            // update link to local project files
            $("#revealProjectFiles").prop('href', 'file:///' + path.join(project.projectPath, project.projectName).replace(/^\//, '') );
        }).trigger('change');
        $('#revealProjectFiles').click(() => {
            sendMessageToMain('showItemInFolder', $('#revealProjectFiles').prop('href'));
        });

        $("#projectName").on('focusout', () => {
        	$("#projectName").trigger('change');
        });

        $("#updateMultiplePath").on('change', () => {
            sendMessageToMain('checkMultiUpdatePath', $("#updateMultiplePath").val());
        });

        $("#advancedOptions").checkbox();
        $("#advancedOptions").on("change", () => {
            if ($("#advancedOptions").filter(":checked").length > 0) {
                enableAdvancedMode(true);
            } else {
                enableAdvancedMode(false);
            }
        });

         $("#IDEButton").on("click", () => {
            disableButtonTemporarily($("#IDEButton"));
            launchInIDE();
        });

        $("#mainIDEButton").on("click", () => {
            disableButtonTemporarily($("#mainIDEButton"));
            launchInIDE();
        });

        $("#mainFolderButton").on("click", () => {
            disableButtonTemporarily($("#mainFolderButton"));
            launchFolder();
        });

        $("#FolderButton").on("click", () => {
            disableButtonTemporarily($("#FolderButton"));
            launchFolder();
        });

         $("#verboseOption").checkbox();
         $("#verboseOption").on("change", () => {
            if ($("#verboseOption").filter(":checked").length > 0) {
                 defaultSettings.verboseOutput = true;
                 bVerbose = true;
                 saveDefaultSettings();
            } else {
                 defaultSettings.verboseOutput = false;
                 bVerbose = false;
                 saveDefaultSettings();
            }
        });

        $("#ofPath").on("change", () => {
            const ofpath = $("#ofPath").val();
            defaultSettings.defaultOfPath = ofpath;
            console.log("ofPath val " + ofpath);
            if(isFirstTimeSierra) {
                //ipcRenderer.sendSync('firstTimeSierra', "xattr -r -d com.apple.quarantine " + ofpath + "/projectGenerator-osx/projectGenerator.app");
                //$("#projectPath").val(ofpath + "/apps/myApps").trigger('change');
                if( isFirstTimeSierra ){
                    $("#ofPathSierraMessage").show();
                    $('#settingsMenuButton').click();
                }
            }else{
                saveDefaultSettings();
                $("#projectPath").val(ofpath + "/apps/myApps").trigger('change');
                console.log("requesting addons");
                // trigger reload addons from the new OF path
                sendMessageToMain('refreshAddonList', $("#ofPath").val());
                sendMessageToMain('refreshPlatformList', $("#ofPath").val());
            }
        });


        if (defaultSettings.advancedMode === true){
        	$("#advancedOptions").attr('Checked','Checked');
        }

        if (defaultSettings.verboseOutput === true){
            $('#verboseOption').attr('Checked','Checked');
            bVerbose = true;
        }

        // updates ofPath when the field is manually changed
        $("#ofPath").on('blur', (e) => {
            const ofpath = $("#ofPath").val();
            setOFPath(ofpath);
            if(isFirstTimeSierra) {
                //$("#projectPath").val(ofpath + "/apps/myApps").trigger('change');
            }
        }).on('keypress', (e) => {
            if(e.which == 13){
                e.preventDefault();
                $("#ofPath").blur();
            }
        });
    
        /* Stuff for the console setting (removed from UI) */
        $("#consoleToggle").on("change", function () {
            enableConsole( $(this).is(':checked') );
        });
        // enable console? (hiddens setting)
        if(defaultSettings['showConsole']){ $("body").addClass('enableConsole'); }
        $("#showConsole").on('click', function(){ $('body').addClass('showConsole'); });
        $("#hideConsole").on('click', function(){ $('body').removeClass('showConsole'); });

        // initialise the overall-use modal
        $("#uiModal").modal({
            'show': false
        });

        $("#fileDropModal").modal({
            'show': false,
            onHide: () => {
                $('body').removeClass('incomingFile');
            },
            onShow: () => {
                $('body').addClass('incomingFile');
            }
        });


        // show default platform in GUI
        $("#defaultPlatform").html(defaultSettings.defaultPlatform);
        //$("#defaultTemplate").html(defaultSettings['defaultTemplate']);

        // Enable tooltips
        //$("[data-toggle='tooltip']").tooltip();

        // add current menu element in body tag for CSS styling
        // $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        //  		$('body').removeClass('page-create_update page-settings page-advanced').addClass( 'page-' + $(e.target).attr("href").replace('#', '') );
        // });


        // setup the multi update list as well.

        $("#ofPath").change();

        // enable tool tips
        $('.tooltip').popup();

        // Open file drop zone
        $(window).on('dragbetterenter', openDragInputModal);
        $(window).on('dragenter', openDragInputModal);

        // Close file drop zone
        $(window).on('dragbetterleave', closeDragInputModal );
        $(window).on('mouseleave', closeDragInputModal );

        // prevent dropping anywhere (dropping files loads their URL, unloading the PG)
        // note: weirdly, dragover is also needed
        $(window).on('drop dragover', blockDragEvent );
        //$(window).on('dragleave', blockDragEvent);

        $("#dropZoneOverlay").on('drop', onDropFile).on('dragend', closeDragInputModal);

        // this allows to close the drop zone if it ever stays open due to a bug.
        $("#dropZoneOverlay").on('click', closeDragInputModal);
        $(window).on('keypress', (e) => {
            if( e.which === 27 ){ // esc key
                e.stopPropagation();
                e.preventDefault();
                closeDragInputModal( e );
            } 
        });

        // listen for drag events
        // note: dragover is needed because dragleave is called pretty randomly
        $("#dropZoneUpdate")
            .on('dragenter dragover drop', onDragUpdateFile)
            .on('dragleave', (e) => {
                $("#dropZoneUpdate").removeClass("accept deny");
            });


        // reflesh template dropdown list depends on selected platforms
        $("#platformsDropdown").on('change', () => {
            const selectedPlatforms = $("#platformsDropdown input").val();
            const selectedPlatformArray = selectedPlatforms.trim().split(',');
            let arg = {
                ofPath: $("#ofPath").val(),
                selectedPlatforms: selectedPlatformArray,
                bMulti: false
            }
            console.log(arg);
            sendMessageToMain('refreshTemplateList', arg);
        })
        $("#platformsDropdownMulti").on('change', () => {
            const selectedPlatforms = $("#platformsDropdownMulti input").val();
            const selectedPlatformArray = selectedPlatforms.trim().split(',');
            let arg = {
                ofPath: $("#ofPath").val(),
                selectedPlatforms: selectedPlatformArray,
                bMulti: true
            }
            sendMessageToMain('refreshTemplateList', arg);
        })

    });
}

function blockDragEvent(e){
    //console.log('blockDragEvent via '+e.type + ' on '+ e.target.nodeName + '#' + e.target.id);

    // open drop overlay if not already open
    if( !$('body').hasClass('incomingFile') ){
        $(window).triggerHandler('dragbetterenter');
    }

    e.stopPropagation();
    e.preventDefault();
    return false;
};

function acceptDraggedFiles( e ){
     // handle file
    const files = e.originalEvent.dataTransfer.files;
    const types = e.originalEvent.dataTransfer.types;

    // this first check filters out most files
    if(files && files.length == 1 && files[0].type == "" && types[0] == "Files"){
        // this folder check is more relayable
        const file = e.originalEvent.dataTransfer.items[0].webkitGetAsEntry();
        if(file.isDirectory) {
            return true;
        }
    }
    return false;
}

function onDragUpdateFile( e ){
    e.stopPropagation();
    e.preventDefault();
    //console.log('onDragUpdateFile via '+e.type + ' on '+ e.target.nodeName + '#' + e.target.id);

    if( !$('body').hasClass('incomingFile') ){
        return false;
    }

   if( acceptDraggedFiles( e ) ){
        $("#dropZone").addClass("accept").removeClass("deny");
        return true;
    }
    // files are rejected
    else {
        $("#dropZone").addClass("deny").removeClass("accept");
    }
    return false;
}

function onDropFile( e ){
    e.stopPropagation();
    e.preventDefault();

   if( acceptDraggedFiles( e ) ){
        $("#dropZone").addClass("accept").removeClass("deny");

        if( $('body').hasClass('advanced') && false ){ // todo: if (tab multiple is open)
            // do batch import

            $("updateMenuButton").triggerHandler('click');
        }
        else {
            const files = e.originalEvent.dataTransfer.files;
            // import single project folder
            $("#projectName").val( files[0].name );
            const projectFullPath = files[0].path;
            const projectParentPath = path.normalize(projectFullPath + '/..');
            $("#projectPath").val( projectParentPath ).triggerHandler('change');

            $("createMenuButon").triggerHandler('click');
        }
        closeDragInputModal(e);
        return true;
    }
    // files are rejected
    else {
        $("#dropZone").addClass("deny").removeClass("accept");

        displayModal(
            `The file you dropped is not compatible for importing.<br>
            To import an OpenFrameworks project, drag & drop the whole project folder.`
        );
    }
    return false;
}

function closeDragInputModal(e){
    e.stopPropagation();
    e.preventDefault();

    //console.log('closeDragInputModal via '+e.type + ' on '+ e.target.nodeName + '#' + e.target.id);

    // Prevent closing the modal while still fading in
    // if( $("#fileDropModal").filter('.ui.modal:not(.fade.in)').length===0 ){
    //     return;
    // }

    $("#fileDropModal").modal('hide');
    $("#dropZone").removeClass("accept deny");

    return false;
}

function openDragInputModal(e){
    e.stopPropagation();
    e.preventDefault();

    //console.log('openDragInputModal via '+e.type + ' on '+ e.target.nodeName + '#' + e.target.id);

    if( !$('body').hasClass('incomingFile') ){
        $("#fileDropModal").modal('show');
    }

    // check filetype when entering droppable zone
    if( e.type === 'dragenter' ){
        onDragUpdateFile(e);
    }

    return false;
}

//----------------------------------------
function saveDefaultSettings() {
    if(!defaultSettings) return;
    if(isFirstTimeSierra) return;

    const defaultSettingsJsonString = JSON.stringify(defaultSettings, null, '\t');
    const result = ipcRenderer.sendSync('saveDefaultSettings', defaultSettingsJsonString);
    console.log(result);
}

//----------------------------------------
function generate() {
    // let's get all the info:
    const platformValueArray = getPlatformList();

    const templatePicked = $("#templatesDropdown .active");
    const templateValueArray = [];
    for (let i = 0; i < templatePicked.length; i++){
        templateValueArray.push($(templatePicked[i]).attr("data-value"));
    }

    const addonsPicked = $("#addonsDropdown  .active");
    const addonValueArray = [];

    for(let i = 0; i < addonsPicked.length; i++) {
        addonValueArray.push($(addonsPicked[i]).attr("data-value"));
    }

    // add any local addons
    for(let i = 0; i < localAddons.length; i++) {
        addonValueArray.push(localAddons[i]);
    }

    // extra source locations
    const srcExtraArr = [];
    for(let i = 0; i < numAddedSrcPaths; i++) {
        const srcExtra = $("#sourceExtra-" + i).val();
        if( srcExtra != '' ){
            srcExtraArr.push(srcExtra);
        }
    }
    const srcExtraList = srcExtraArr.join(',');

    const lengthOfPlatforms = platformValueArray.length;

    const gen = {
        projectName: $("#projectName").val(),
        projectPath: $("#projectPath").val(),
        sourcePath: srcExtraList,
        platformList: platformValueArray,
        templateList: templateValueArray,
        addonList: addonValueArray,  //$("#addonsDropdown").val();
        ofPath: $("#ofPath").val(),
        verbose: bVerbose
    };

    // console.log(gen);
    if (gen.projectName === '') {
        $("#projectName").oneTimeTooltip("Please name your sketch first.");
    } else if (gen.projectPath === '') {
        $("#projectPath").oneTimeTooltip("Your project path is empty...");
    } else if (gen.platformList == null || lengthOfPlatforms == 0) {
        $("#platformsDropdown").oneTimeTooltip("Please select a platform first.");
    } else {
        sendMessageToMain('generate', gen);
    }
}


//----------------------------------------
function updateRecursive() {
    // get the path and the platform list
    // platformsDropdownMulti

    const platformsPicked = $("#platformsDropdownMulti  .active");
    const platformValueArray = [];
    for (let i = 0; i < platformsPicked.length; i++){
        platformValueArray.push($(platformsPicked[i]).attr("data-value"));
    }

    const templatePicked = $("#templatesDropdownMulti .active");
    const templateValueArray = [];
    for (let i = 0; i < templatePicked.length; i++){
        templateValueArray.push($(templatePicked[i]).attr("data-value"));
    }

    const gen = {
        updatePath: $("#updateMultiplePath").val(),
        platformList: platformValueArray,
        templateList: templateValueArray,
        updateRecursive: true,
        ofPath: $("#ofPath").val(),
        verbose: bVerbose
    };

    if (gen.updatePath === '') {
        displayModal("Please set update path");
    } else if (platformValueArray.length === 0) {
        displayModal("Please select a platform first.");
    } else {
        sendMessageToMain('update', gen);
    }
}

//----------------------------------------
/**
 * 
 * @param {'createMode' | 'updateMode'} mode 
 */
function switchGenerateMode(mode) {
    // mode can be 'createMode' or 'updateMode'

    // switch to update mode
    if (mode == 'updateMode') {
        $("#generateButton").hide();
        $("#updateButton").show();
        $("#mainIDEButton").show();
        $("#mainFolderButton").show();
        $("#folderButton").show();
        $("#missingAddonMessage").hide();
        $("#localAddonMessage").hide();
        $("#nameRandomiser").hide();
        $("#revealProjectFiles").show();
        $("#adons-refresh-icon").hide();
        if(!defaultSettings.advancedMode){
            $("#consoleContainer").hide();
        }
        $("#extraContainer").hide();

        console.log('Switching GenerateMode to Update...');

        clearAddonSelection();
        clearExtraSourceList();
    }
    // [default]: switch to createMode (generate new projects)
    else {
        // if previously in update mode, deselect Addons
        if( $("#updateButton").is(":visible") ){
            clearAddonSelection();
            clearExtraSourceList();
        }

        $("#generateButton").show();
        $("#updateButton").hide();
        $("#mainIDEButton").hide();
        $("#mainFolderButton").hide();
        $("#folderButton").show();
        $("#missingAddonMessage").hide();
        $("#localAddonMessage").hide();
        $("#nameRandomiser").show();
        $("#revealProjectFiles").hide();
        $("#adons-refresh-icon").hide();
        if(!defaultSettings.advancedMode){
            $("#consoleContainer").hide();
        }
        $("#extraContainer").hide();

        console.log('Switching GenerateMode to Create...');
    }
}

//----------------------------------------
function clearAddonSelection() {
    $('#addonsDropdown').dropdown('clear');
}

//----------------------------------------
function enableAdvancedMode(isAdvanced) {
    if (isAdvanced) {
        $('#platformsDropdown').removeClass("disabled");
        $("body").addClass('advanced');
        $('a.updateMultiMenuOption').show();
        $('#sourceExtraSection').show();
        $('#templateSection').show();
        $('#templateSectionMulti').show();
         $('#commandInput').show();
        $('#commandButton').show();
        $('#ofPathButton').show();


    } else {
        $('#platformsDropdown').removeClass("disabled");
        $('#platformsDropdown').dropdown('set exactly', defaultSettings.defaultPlatform);
        $('#sourceExtraSection').hide();
//        $('#templateSection').hide();
//        $('#templateSectionMulti').hide();
//        $('#templateDropdown').dropdown('set exactly', '');
//        $('#templateDropdownMulti').dropdown('set exactly', '');
        $('#templateSection').show();
        $('#templateSectionMulti').show();

        $('#commandInput').hide();
        $('#commandButton').hide();
        $('#ofPathButton').hide();
        $("body").removeClass('advanced');
        $('a.updateMultiMenuOption').hide();
    }
    enableConsole(isAdvanced);
    defaultSettings.advancedMode = isAdvanced;
    saveDefaultSettings();
    //$("#advancedToggle").prop('checked', defaultSettings['advancedMode'] );
}

/* Stuff for the console setting (removed from UI) */

function enableConsole( showConsole ){
	if( showConsole ) {
		// this has to be in body for CSS reasons
		$("body").addClass('showConsole');
	}
	else {
		$("body").removeClass('showConsole');
	}
	defaultSettings['showConsole'] = showConsole;
	saveDefaultSettings();
    $("#consoleContainer").show();
	$("#consoleToggle").prop('checked', defaultSettings['showConsole'] );
}

//----------------------------------------
function getPlatformList() {
    const platformsPicked = $("#platformsDropdown  .active");
    const platformValueArray = [];
    for (let i = 0; i < platformsPicked.length; i++){
        platformValueArray.push($(platformsPicked[i]).attr("data-value"));
    }
    return platformValueArray;
}

function openFolder() {
    const platformsPicked = $("#platformsDropdown  .active");
    const platformValueArray = [];
    for (let i = 0; i < platformsPicked.length; i++){
        platformValueArray.push($(platformsPicked[i]).attr("data-value"));
    }
    return platformValueArray;
}

//----------------------------------------
function displayModal(message) {
    $("#uiModal .content")
        .html(message)
        .find('*[data-toggle="external_target"]')
        .click((e) => {
            e.preventDefault();
            sendMessageToMain('openExternal', $(e.currentTarget).prop("href") );
        });

    if (message.indexOf("Success!") > -1){
        $("#IDEButton").show();
        $("#FolderButton").show();
    } else {
        $("#IDEButton").hide();
        $("#FolderButton").show();
    }

    $("#uiModal").modal('show');
}

//----------------------------------------
function consoleMessage(orig_message) {
    const message = (orig_message + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + "<br>\n" + '$2'); // nl2br
    $("#console").append($("<p>").html(message));
    $("#consoleContainer").scrollTop($('#console').offset().top); // scrolls console to bottom
}

//-----------------------------------------------------------------------------------
// Button calls
//-----------------------------------------------------------------------------------

function quit(){
    sendMessageToMain('quit', '');
}
function browseOfPath() {
    sendMessageToMain('pickOfPath', ''); // current path could go here (but the OS also remembers the last used folder)
}

function browseProjectPath() {
    let projectPath = $("#projectPath").val();
    if (projectPath === ''){
        projectPath = $("#ofPath").val();
    }
    sendMessageToMain('pickProjectPath', projectPath); // current path could go here
}

function clearExtraSourceList(){
    $("#sourceExtraSection").empty();
    $("#sourceExtraSection").append("<label>Additional source folders:</label>");
    
    checkAddSourcePath(-1);
    numAddedSrcPaths = 1;
}

function checkAddSourcePath(index){
    //if we don't have another field below us - add one
    const nextFieldId = '#sourceExtra-' + (index + 1);
    if( $(nextFieldId).length == 0 ) {
        const nextIndex = index + 1;
        const extrafield = `<div class="field">
           <div class="ui icon input fluid">
               <input type="text" placeholder="Extra source path..." id="sourceExtra-${nextIndex}"> \
               <i class="search link icon" onclick="browseSourcePath(${nextIndex})"></i> \
           </div>
        </div>`;

        $("#sourceExtraSection").append(extrafield);
        numAddedSrcPaths++;
    }
}

function browseSourcePath(index) {
    const ofPath = $("#ofPath").val();
    sendMessageToMain('pickSourcePath', [ ofPath, index ]); // current path could go here
}


function browseImportProject() {
    let projectPath = $("#projectPath").val();
    if (projectPath === ''){
        projectPath = $("#ofPath").val();
    }
    sendMessageToMain('pickProjectImport', projectPath);
}

function getUpdatePath() {
    let updateMultiplePath = $("#updateMultiplePath").val();
    if (updateMultiplePath === ''){
        updateMultiplePath = $("#ofPath").val();
    }

    sendMessageToMain('pickUpdatePath', updateMultiplePath); // current path could go here
}

function rescanAddons() {
    ipcRenderer.sendSync('refreshAddonList', $("#ofPath").val());

    const projectInfo = {
        'projectName': $("#projectName").val(),
        'projectPath': $("#projectPath").val(),
    };
    sendMessageToMain('isOFProjectFolder', projectInfo);     // <- this forces addon reload
}

function getRandomSketchName(){
    const projectPath = $("#projectPath").val();
    if (projectPath === '') {
        $("#projectPath").oneTimeTooltip('Please specify a path first...');
    }
    else {
        const result = ipcRenderer.sendSync('getRandomSketchName', projectPath);
        const {
            randomisedSketchName,
            generateMode
        } = result;
        $("#projectName").val(randomisedSketchName);
        switchGenerateMode(generateMode);
    }
}

function launchInIDE(){
    const platform = getPlatformList()[0];

    const project = {
        'projectName': $("#projectName").val(),
        'projectPath': $("#projectPath").val(),
        'platform': platform,
        'ofPath': $("#ofPath").val()
    };

    sendMessageToMain('launchProjectinIDE', project );
}

function launchFolder(){
    const platform = getPlatformList()[0];

    const project = {
        'projectName': $("#projectName").val(),
        'projectPath': $("#projectPath").val()
    };

    sendMessageToMain('launchFolder', project );
}

function getOFVersion() {
    console.log('getOFVersion:sending');
    sendMessageToMain('getVersion');
}

function getOFPlatform() {
    let platform = '';
    if (navigator.platform.indexOf('Win') > -1) {
        platform = 'Windows';
    } else if (navigator.platform.indexOf('Mac') > -1) {
        platform = 'macOS';
    } else if (navigator.platform.indexOf('Linux') > -1) {
        platform = 'Linux';
    }
    document.getElementById('platformDisplay').textContent = platform;
    console.log('getOFPlatform:sending');
    sendMessageToMain('getHostType');
}

function getOFPath() {
    console.log('getOFPath:sending');
    sendMessageToMain('getOFPath');
}


