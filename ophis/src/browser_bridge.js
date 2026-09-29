/*
 * browser_bridge.js — the browser build's replacement for Electron.
 *
 * The desktop build of Ophis v12 is the renderer you see in this folder wrapped in Electron.
 * Electron contributes exactly three things, all of which live in main.js / preload.js:
 *
 *   1. window.electronBridge — the IPC surface the renderer calls (open / save / quit / log).
 *   2. The native application menu (File / Edit / View) whose items call renderer functions
 *      by name through webContents.executeJavaScript().
 *   3. Calling init() once the page has loaded, plus close interception and file association.
 *
 * This file provides all three with browser APIs and nothing else. The renderer's own code is
 * untouched: because window.electronBridge exists, isRunningElectron() returns true and every
 * Electron-mode code path in the renderer (Save / Save As / Open, the "(Saved)" reminder,
 * options-only localStorage, no autosave) runs exactly as it does in the .exe.
 *
 * Mapping of the Electron bridge to the browser:
 *
 *   openFileExplorer   showOpenFilePicker()   (fallback: <input type=file accept=.oph>)
 *   saveFileAs         showSaveFilePicker()   (fallback: prompt for a name, then download)
 *   autoSaveToFile     write to the remembered file handle (fallback: download)
 *   openOphFile        read a dropped file or a remembered handle
 *   confirmCloseApp    window.close(), with a note if the browser refuses
 *   resetProgram       location.reload()
 *   onSignedIn / refreshMenuOptions   enable menu items / tick the checkbox items
 *   logToCli / closeAppWithHeadless*  console only (headless mode is a CLI feature)
 */
(function () {
    'use strict';

    var MENUBAR_HEIGHT_PX = 30;
    var OPH_FILE_TYPES = [{ description: 'OPH Files', accept: { 'application/json': ['.oph'] } }];

    var hasFsAccess = typeof window.showOpenFilePicker === 'function' && typeof window.showSaveFilePicker === 'function';

    var fileHandles = {};      // file name -> FileSystemFileHandle (so "Save" writes back to the same file)
    var droppedFiles = {};     // file name -> File (from drag-and-drop, when no handle is available)
    var menuState = { signedIn: false, operationsColVisible: false, prettify: false, minify: false };
    var suppressUnloadWarning = false;
    var zoomLevel = 0;
    var initCalled = false;

    // ------------------------------------------------------------------ helpers

    function log(message) {
        console.log('browser_bridge: ' + message);
    }

    // Electron reached renderer functions by name through executeJavaScript(); we do the same
    // through window, so the renderer keeps its exact entry points.
    function callRenderer(name, args) {
        var fn = window[name];
        if (typeof fn === 'function') {
            return fn.apply(window, args || []);
        }
        log('renderer function not found: ' + name);
    }

    function toast(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    function baseName(path) {
        return String(path || '').split(/[\\/]/).pop();
    }

    function currentFileName() {
        try {
            return baseName(appState.globalOptions[GLOBAL_OPTION__CURRENT_FILE_PATH]);
        } catch (e) {
            return '';
        }
    }

    function ensureOphExtension(name) {
        return /\.oph$/i.test(name) ? name : name + '.oph';
    }

    function download(fileName, contents) {
        var blob = new Blob([contents], { type: 'application/octet-stream' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    async function ensureWritable(handle) {
        if (typeof handle.queryPermission !== 'function') {
            return;
        }
        var options = { mode: 'readwrite' };
        if ((await handle.queryPermission(options)) === 'granted') {
            return;
        }
        if ((await handle.requestPermission(options)) !== 'granted') {
            throw new Error('Write permission to "' + handle.name + '" was not granted.');
        }
    }

    async function writeToHandle(handle, contents) {
        await ensureWritable(handle);
        var writable = await handle.createWritable();
        await writable.write(contents);
        await writable.close();
    }

    function reportSaveError(err) {
        console.log(String(err));
        callRenderer('onSaveToFileError', ['Got error saving json string, see above.']);
    }

    // Mirrors main.js openOphFile(): parse, re-stringify, hand the text to the renderer.
    function deliverOphText(fileName, text, checkForUnsavedChanges) {
        log('About to open file: ' + fileName);
        try {
            var parsed = JSON.parse(text);
            if (parsed) {
                callRenderer('onOphFileOpened', [fileName, JSON.stringify(parsed), checkForUnsavedChanges === true]);
            } else {
                callRenderer('onOphFileOpenError', [fileName, 'Got null parsing json string.']);
            }
        } catch (err) {
            console.log(String(err));
            callRenderer('onOphFileOpenError', [fileName, 'Got error opening file or parsing json string, see above.']);
        }
    }

    function isAbort(err) {
        return err && err.name === 'AbortError';
    }

    // ------------------------------------------------------------------ the bridge

    var hiddenFileInput = null;

    function getHiddenFileInput() {
        if (!hiddenFileInput) {
            hiddenFileInput = document.createElement('input');
            hiddenFileInput.type = 'file';
            hiddenFileInput.accept = '.oph,application/json';
            hiddenFileInput.style.display = 'none';
            hiddenFileInput.addEventListener('change', function () {
                var file = hiddenFileInput.files && hiddenFileInput.files[0];
                if (!file) {
                    return;
                }
                log('Chose file to open: ' + file.name);
                file.text().then(function (text) {
                    droppedFiles[file.name] = file;
                    deliverOphText(file.name, text, false);
                });
            });
            document.body.appendChild(hiddenFileInput);
        }
        return hiddenFileInput;
    }

    async function openFileExplorer() {
        if (hasFsAccess) {
            var handles;
            try {
                handles = await window.showOpenFilePicker({ types: OPH_FILE_TYPES, multiple: false });
            } catch (err) {
                if (!isAbort(err)) { console.log(String(err)); }
                return;
            }
            var handle = handles[0];
            var file = await handle.getFile();
            fileHandles[file.name] = handle;
            log('Chose file to open: ' + file.name);
            deliverOphText(file.name, await file.text(), false);
        } else {
            var input = getHiddenFileInput();
            input.value = '';
            input.click();
        }
    }

    async function saveFileAs(fileContents) {
        var suggested = currentFileName() || 'untitled.oph';

        if (hasFsAccess) {
            var handle;
            try {
                handle = await window.showSaveFilePicker({ suggestedName: suggested, types: OPH_FILE_TYPES });
            } catch (err) {
                if (!isAbort(err)) { console.log(String(err)); }
                return;
            }
            log('About to save to file: ' + handle.name);
            try {
                await writeToHandle(handle, fileContents);
            } catch (err) {
                reportSaveError(err);
                return;
            }
            fileHandles[handle.name] = handle;
            callRenderer('onSaveAsSuccess', [handle.name]);
        } else {
            var name = window.prompt('Save As — enter a file name:', suggested);
            if (!name) {
                return;
            }
            name = ensureOphExtension(name.trim());
            log('About to save to file: ' + name);
            download(name, fileContents);
            callRenderer('onSaveAsSuccess', [name]);
        }
    }

    async function autoSaveToFile(filePath, fileContents) {
        var name = baseName(filePath);
        var handle = fileHandles[name];
        if (handle) {
            try {
                await writeToHandle(handle, fileContents);
            } catch (err) {
                reportSaveError(err);
            }
        } else {
            download(name, fileContents);
        }
    }

    async function openOphFile(filePath) {
        var name = baseName(filePath);
        try {
            if (fileHandles[name]) {
                var file = await fileHandles[name].getFile();
                deliverOphText(name, await file.text(), false);
            } else if (droppedFiles[name]) {
                deliverOphText(name, await droppedFiles[name].text(), false);
            } else {
                callRenderer('onOphFileOpenError', [name, 'The browser has no access to that path. Use File > Open... instead.']);
            }
        } catch (err) {
            console.log(String(err));
            callRenderer('onOphFileOpenError', [name, 'Got error opening file or parsing json string, see above.']);
        }
    }

    function confirmCloseApp() {
        log('Confirmed quit.');
        suppressUnloadWarning = true;
        window.close();
        setTimeout(function () {
            suppressUnloadWarning = false;
            toast('Ophis cannot close this tab itself — close the browser tab to quit.');
        }, 400);
    }

    function resetProgram() {
        log('Resetting program');
        suppressUnloadWarning = true;
        window.location.reload();
    }

    window.electronBridge = {
        autoSaveToFile: async function (filePath, fileContents) { return autoSaveToFile(filePath, fileContents); },
        saveFileAs: async function (fileContents) { return saveFileAs(fileContents); },
        openOphFile: async function (filePath) { return openOphFile(filePath); },
        openFileExplorer: async function () { return openFileExplorer(); },
        confirmCloseApp: async function () { return confirmCloseApp(); },
        onSignedIn: async function () { menuState.signedIn = true; renderMenuState(); },
        logToCli: async function (message) { console.log(message); },
        closeAppWithHeadlessError: async function () { log('headless error exit requested (no-op in the browser)'); },
        closeAppWithHeadlessSuccess: async function () { log('headless success exit requested (no-op in the browser)'); },
        resetProgram: async function () { return resetProgram(); },
        refreshMenuOptions: async function (operationsColVisibleChecked, prettifyOphFilesChecked, minifyOphFilesChecked) {
            menuState.signedIn = true;
            menuState.operationsColVisible = operationsColVisibleChecked === true;
            menuState.prettify = prettifyOphFilesChecked === true;
            menuState.minify = minifyOphFilesChecked === true;
            renderMenuState();
        }
    };

    // ------------------------------------------------------------------ the menu bar
    //
    // Same template as refreshMenu() in main.js, minus the items a web page cannot provide
    // (Toggle Developer Tools — use F12).

    function toggleFullScreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
    }

    // Electron zooms in steps of 0.5 zoom levels; each level is a factor of 1.2.
    function setZoomLevel(level) {
        zoomLevel = Math.max(-5, Math.min(5, level));
        var factor = Math.pow(1.2, zoomLevel);
        document.documentElement.style.zoom = zoomLevel === 0 ? '' : String(factor);
        if (typeof window.onresize === 'function') {
            window.onresize();
        }
    }

    function editCommand(command) {
        return function () {
            if (command === 'paste') {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    navigator.clipboard.readText().then(function (text) {
                        document.execCommand('insertText', false, text);
                    }).catch(function () {
                        toast('Paste with Ctrl+V.');
                    });
                } else {
                    toast('Paste with Ctrl+V.');
                }
            } else {
                document.execCommand(command);
            }
        };
    }

    var MENU_TEMPLATE = [
        {
            label: 'File',
            items: [
                { id: 'new-file', label: 'New File', accelerator: 'Ctrl+N', requiresSignIn: true,
                  click: function () { callRenderer('electronBridgeIncoming_startNewFile'); } },
                { id: 'open', label: 'Open...', accelerator: 'Ctrl+O', requiresSignIn: true,
                  click: function () { callRenderer('electronBridgeIncoming_openFileExplorer'); } },
                { id: 'save', label: 'Save', accelerator: 'Ctrl+S',
                  click: function () { callRenderer('electronBridgeIncoming_onSaveClickedFromFileMenu'); } },
                { id: 'save-as', label: 'Save As...', requiresSignIn: true,
                  click: function () { callRenderer('electronBridgeIncoming_onSaveAsClickedFromFileMenu'); } },
                { id: 'quit', label: 'Quit', accelerator: 'Ctrl+Q',
                  click: function () { callRenderer('onCloseAppRequested'); } },
                { separator: true },
                { id: 'prettify', label: 'Prettify .oph Files', checkbox: 'prettify',
                  click: function () { callRenderer('togglePrettifyOphFiles'); } },
                { id: 'minify', label: 'Minify .oph Files', checkbox: 'minify',
                  click: function () { callRenderer('toggleMinifyOphFiles'); } },
                { separator: true },
                { id: 'reset-program', label: 'Reset Program',
                  click: function () { callRenderer('factoryReset'); } }
            ]
        },
        {
            label: 'Edit',
            items: [
                { id: 'cut', label: 'Cut', accelerator: 'Ctrl+X', click: editCommand('cut') },
                { id: 'copy', label: 'Copy', accelerator: 'Ctrl+C', click: editCommand('copy') },
                { id: 'paste', label: 'Paste', accelerator: 'Ctrl+V', click: editCommand('paste') },
                { id: 'delete', label: 'Delete', click: editCommand('delete') },
                { separator: true },
                { id: 'select-all', label: 'Select All', accelerator: 'Ctrl+A', click: editCommand('selectAll') }
            ]
        },
        {
            label: 'View',
            items: [
                { id: 'operations-col', label: 'Operations Col Visible', checkbox: 'operationsColVisible',
                  click: function () { callRenderer('toggleOperationsColVisible'); } },
                { separator: true },
                { id: 'reset-zoom', label: 'Actual Size', accelerator: 'Ctrl+0', click: function () { setZoomLevel(0); } },
                { id: 'zoom-in', label: 'Zoom In', accelerator: 'Ctrl+=', click: function () { setZoomLevel(zoomLevel + 0.5); } },
                { id: 'zoom-out', label: 'Zoom Out', accelerator: 'Ctrl+-', click: function () { setZoomLevel(zoomLevel - 0.5); } },
                { id: 'fullscreen', label: 'Toggle Full Screen', accelerator: 'F11', click: toggleFullScreen }
            ]
        }
    ];

    var menubarElem = null;
    var itemElems = {};
    var openMenu = null;

    function closeMenus() {
        if (openMenu) {
            openMenu.classList.remove('ophis-menu--open');
            openMenu = null;
        }
    }

    function openMenuElem(menuElem) {
        if (openMenu === menuElem) {
            return;
        }
        closeMenus();
        openMenu = menuElem;
        menuElem.classList.add('ophis-menu--open');
    }

    function renderMenuState() {
        Object.keys(itemElems).forEach(function (id) {
            var entry = itemElems[id];
            var disabled = entry.spec.requiresSignIn === true && menuState.signedIn !== true;
            entry.elem.disabled = disabled;
            entry.elem.classList.toggle('ophis-menu-item--disabled', disabled);
            if (entry.spec.checkbox) {
                var checked = menuState[entry.spec.checkbox] === true;
                entry.elem.classList.toggle('ophis-menu-item--checked', checked);
                entry.elem.setAttribute('aria-checked', checked ? 'true' : 'false');
            }
        });
    }

    function buildMenuItem(spec) {
        if (spec.separator) {
            var sep = document.createElement('div');
            sep.className = 'ophis-menu-separator';
            sep.setAttribute('role', 'separator');
            return sep;
        }
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'ophis-menu-item';
        button.setAttribute('role', spec.checkbox ? 'menuitemcheckbox' : 'menuitem');
        button.tabIndex = -1;

        var check = document.createElement('span');
        check.className = 'ophis-menu-check';
        check.textContent = '✓';
        button.appendChild(check);

        var label = document.createElement('span');
        label.className = 'ophis-menu-label';
        label.textContent = spec.label;
        button.appendChild(label);

        if (spec.accelerator) {
            var accel = document.createElement('span');
            accel.className = 'ophis-menu-accel';
            accel.textContent = spec.accelerator;
            button.appendChild(accel);
        }

        button.addEventListener('click', function (event) {
            event.stopPropagation();
            closeMenus();
            if (!button.disabled) {
                spec.click();
            }
        });

        itemElems[spec.id] = { spec: spec, elem: button };
        return button;
    }

    function buildMenubar() {
        menubarElem = document.createElement('div');
        menubarElem.id = 'ophis-menubar';
        menubarElem.setAttribute('role', 'menubar');

        MENU_TEMPLATE.forEach(function (menuSpec) {
            var menuElem = document.createElement('div');
            menuElem.className = 'ophis-menu';

            var title = document.createElement('button');
            title.type = 'button';
            title.className = 'ophis-menu-title';
            title.textContent = menuSpec.label;
            title.setAttribute('aria-haspopup', 'true');
            title.tabIndex = -1;
            title.addEventListener('click', function (event) {
                event.stopPropagation();
                if (openMenu === menuElem) {
                    closeMenus();
                } else {
                    openMenuElem(menuElem);
                }
            });
            title.addEventListener('mouseenter', function () {
                if (openMenu && openMenu !== menuElem) {
                    openMenuElem(menuElem);
                }
            });
            menuElem.appendChild(title);

            var list = document.createElement('div');
            list.className = 'ophis-menu-items';
            list.setAttribute('role', 'menu');
            menuSpec.items.forEach(function (itemSpec) {
                list.appendChild(buildMenuItem(itemSpec));
            });
            menuElem.appendChild(list);

            menubarElem.appendChild(menuElem);
        });

        var brand = document.createElement('span');
        brand.className = 'ophis-menubar-brand';
        brand.textContent = 'Ophis';
        menubarElem.appendChild(brand);

        document.body.insertBefore(menubarElem, document.body.firstChild);
        document.documentElement.style.setProperty('--ophis-menubar-height', MENUBAR_HEIGHT_PX + 'px');
        renderMenuState();

        document.addEventListener('click', closeMenus);
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeMenus();
            }
        });
    }

    // Keyboard accelerators. Ctrl+N is reserved by most browsers and cannot be intercepted;
    // the others work.
    function installAccelerators() {
        document.addEventListener('keydown', function (event) {
            if (!(event.ctrlKey || event.metaKey) || event.altKey) {
                return;
            }
            var key = event.key.toLowerCase();
            var handled = true;
            if (key === 's') {
                callRenderer('electronBridgeIncoming_onSaveClickedFromFileMenu');
            } else if (key === 'o') {
                callRenderer('electronBridgeIncoming_openFileExplorer');
            } else if (key === 'n') {
                callRenderer('electronBridgeIncoming_startNewFile');
            } else {
                handled = false;
            }
            if (handled) {
                event.preventDefault();
            }
        }, true);
    }

    // Opening a .oph by dropping it on the window: the browser's equivalent of the .oph file
    // association (app.on('open-file') / second-instance argv in main.js).
    function installDragAndDrop() {
        function ophFileFrom(dataTransfer) {
            if (!dataTransfer) {
                return null;
            }
            for (var i = 0; i < dataTransfer.files.length; i++) {
                if (/\.oph$/i.test(dataTransfer.files[i].name)) {
                    return { file: dataTransfer.files[i], item: dataTransfer.items ? dataTransfer.items[i] : null };
                }
            }
            return null;
        }
        document.addEventListener('dragover', function (event) {
            if (event.dataTransfer && Array.prototype.some.call(event.dataTransfer.items || [], function (it) { return it.kind === 'file'; })) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
            }
        });
        document.addEventListener('drop', function (event) {
            var found = ophFileFrom(event.dataTransfer);
            if (!found) {
                return;
            }
            event.preventDefault();
            droppedFiles[found.file.name] = found.file;
            if (found.item && typeof found.item.getAsFileSystemHandle === 'function') {
                found.item.getAsFileSystemHandle().then(function (handle) {
                    if (handle && handle.kind === 'file') {
                        fileHandles[found.file.name] = handle;
                    }
                }).catch(function () { /* read-only drop; Save will download instead */ });
            }
            log('Received open-file: ' + found.file.name);
            callRenderer('onOphFileOpenedFromOutsideApp', [found.file.name]);
        });
    }

    // Electron intercepts the window close and asks the renderer (onCloseAppRequested), which
    // confirms when there are unsaved changes. The browser's equivalent is beforeunload.
    function installCloseGuard() {
        window.addEventListener('beforeunload', function (event) {
            if (suppressUnloadWarning) {
                return undefined;
            }
            var unsaved = false;
            try { unsaved = appState.hasUnsavedChanges === true; } catch (e) { /* not initialised yet */ }
            if (unsaved) {
                event.preventDefault();
                event.returnValue = 'The current session is not saved to file.';
                return event.returnValue;
            }
            return undefined;
        });
    }

    // ------------------------------------------------------------------ start-up

    function callInitOnce() {
        if (initCalled) {
            return;
        }
        initCalled = true;
        if (typeof window.init === 'function') {
            log('did-finish-load; calling init()');
            window.init();
        } else {
            console.error('browser_bridge: init() is not defined — the renderer scripts did not load.');
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        buildMenubar();
        installAccelerators();
        installDragAndDrop();
        installCloseGuard();
    });

    window.ophisBrowserBridge = {
        // index.html hands us the last renderer <script> so init() runs after every module is in.
        start: function (lastScriptElem) {
            if (lastScriptElem) {
                lastScriptElem.addEventListener('load', callInitOnce);
            }
            window.addEventListener('load', callInitOnce);
        },
        hasFileSystemAccess: hasFsAccess,
        menubarHeightPx: MENUBAR_HEIGHT_PX
    };
})();
