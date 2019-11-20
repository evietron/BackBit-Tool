//
// This is the main code for the NW.js application (gets loaded by the index.html)
//
const version = require('../package').version;
const bbt = require('./bbt');
const dataref = require('./dataref');
const fs = require('fs');

let details = bbt.parse();
let handlers = {};

let $ = function (selector) {
    return document.querySelector(selector);
}

function shortenPath(ref) {
    let path = '';
    if (ref) {
        if (ref.offset) {
            return "predefined";
        }
        path = ref.path;
    }
    let i = path.lastIndexOf('/');
    if (i === -1) {
        i = path.lastIndexOf('\\');
    }
    if (i !== -1) {
        path = path.substr(i + 1);
    }
    return path;
}

function isEmpty() {
    return !details.program &&
        !details.cart &&
        !details.mounts.length &&
        !details.data &&
        !details.music &&
        !details.images.length &&
        $('#txtTitle').value === '' &&
        $('#txtVersion').value === '' &&
        $('#txtCopyright').value === '' &&
        $('#txtCategory').value === '' &&
        $('#txtController').value === '' &&
        $('#txtRelease').value === '' &&
        $('#txtManual').value === '';
    }

function isValid() {
    return details.program || details.cart || details.mounts.length;
}

function updateButtonStates() {
    $('#buttonNew').disabled = isEmpty();
    $('#buttonSaveAs').disabled = !isValid();
    $('#divAddProgram').style.display = (details.program || details.cart) ? 'none' : 'flex';
    $('#buttonRemoveProgram').style.display = (details.program || details.cart) ? 'flex' : 'none';
    $('#pathProgram').style.display = (details.program || details.cart) ? 'flex' : 'none';
    $('#divAddMount').style.display = (details.mounts.length === 8) ? 'none' : 'flex';
    for (let i = 1; i <= 8; i++) {
        $('#buttonRemoveMount' + i).style.display =
            $('#pathMount' + i).style.display = (details.mounts.length >= i) ? 'flex' : 'none';
    }
    $('#buttonAddData').style.display = details.data ? 'none' : 'flex';
    $('#buttonRemoveData').style.display =
        $('#pathData').style.display = details.data ? 'flex' : 'none';
    $('#divAddMusic').style.display = details.music ? 'none' : 'flex';
    $('#buttonRemoveMusic').style.display = details.music ? 'flex' : 'none';
    $('#pathMusic').style.display = details.music ? 'flex' : 'none';
    $('#divAddImage').style.display = (details.images.length === 10) ? 'none' : 'flex';
    for (let i = 1; i <= 10; i++) {
        $('#buttonRemoveImage' + i).style.display =
            $('#pathImage' + i).style.display = (details.images.length >= i) ? 'flex' : 'none';
    }
}

function chooseFile(dialog, onSelect) {
    let chooser = $(dialog);
    if (handlers[dialog]) {
        chooser.removeEventListener('change', handlers[dialog])
    }
    chooser.value = '';
    handlers[dialog] = function(e) {
        if (this.value) {
            onSelect(this.value);
        }
    };
    chooser.addEventListener('change', handlers[dialog], false);
    chooser.click();
}

function confirmOverwrite() {
    return confirm("This will destroy all changes. Are you sure?");
}

function newFile() {
    if (confirmOverwrite()) {
        details = bbt.parse();
        interpretTextFields();
        updateRefs();
        updateButtonStates();
    }
}

function textToRef(text) {
    return dataref.generateFromBuf(Buffer.from(text));
}

function compileTextFields() {
    details.text.title = textToRef($('#txtTitle').value);
    details.text.version = textToRef($('#txtVersion').value);
    details.text.copyright = textToRef($('#txtCopyright').value);
    details.text.category = textToRef($('#txtCategory').value);
    details.text.controller = textToRef($('#txtController').value);
    details.text.release = textToRef($('#txtRelease').value);
    details.text.manual = textToRef($('#txtManual').value);
}

function refToText(ref) {
    if (!ref) {
        return '';
    }
    return bbt.stripContent(dataref.read(ref));
}

function interpretTextFields() {
    $('#txtTitle').value = refToText(details.text.title);
    $('#txtVersion').value = refToText(details.text.version);
    $('#txtCopyright').value = refToText(details.text.copyright);
    $('#txtCategory').value = refToText(details.text.category);
    $('#txtController').value = refToText(details.text.controller);
    $('#txtRelease').value = refToText(details.text.release);
    $('#txtManual').value = refToText(details.text.manual);
}

function saveAsFile() {
    chooseFile('#saveFileDialog', function(path) {
        try {
            if (!path.toLowerCase().endsWith('.bbt')) {
                path += '.bbt';
            }
            let ok = true;
            if (fs.existsSync(path)) {
                ok = confirm("REALLY overwrite " + path + "?");
            }
            if (ok) {
                compileTextFields();
                bbt.build(path, details);
            }
        } catch (e) {
            alert(e.toString());
        }
    });
}

function openFile() {
    if (isEmpty() || confirmOverwrite()) {
        chooseFile('#bbtFileDialog', function(path) {
            try {
                details = bbt.parse(path);
            } catch (e) {
                alert(e.toString());
            }
            interpretTextFields();
            updateRefs();
            updateButtonStates();
        });
    }
}

function addProgram() {
    chooseFile('#prgFileDialog', function(path) {
        if (path.toLowerCase().endsWith('.prg')) {
            details.program = dataref.generateFromPath(path);
        } else if (path.toLowerCase().endsWith('.crt')) {
            details.cart = dataref.generateFromPath(path);
        } else {
            alert("Invalid file format");
        }
        updateRefs();
        updateButtonStates();
    });
}

function removeProgram() {
    details.program = null;
    details.cart = null;
    updateButtonStates();
}

function addMusic() {
    chooseFile('#sidFileDialog', function(path) {
        if (path.toLowerCase().endsWith('.sid')) {
            details.music = dataref.generateFromPath(path);
        } else {
            alert("Invalid file format");
        }
        updateRefs();
        updateButtonStates();
    });
}

function removeMusic() {
    details.music = null;
    updateButtonStates();
}

function updateRefs() {
    $('#pathProgram').innerHTML = shortenPath(details.program || details.cart);
    for (let i = 0; i < details.mounts.length; i++) {
        $('#pathMount' + (i + 1)).innerHTML = (8 + i) + ': ' + shortenPath(details.mounts[i]);
    }
    $('#pathData').innerHTML = shortenPath(details.data);
    $('#pathMusic').innerHTML = shortenPath(details.music);
    for (let i = 0; i < details.images.length; i++) {
        $('#pathImage' + (i + 1)).innerHTML = shortenPath(details.images[i]);
    }
}

function addMount() {
    chooseFile('#d64FileDialog', function(path) {
        details.mounts.push(dataref.generateFromPath(path));
        updateRefs();
        updateButtonStates();
    });
}

function removeMount(index) {
    details.mounts.splice(index, 1);
    updateRefs();
    updateButtonStates();
}

function addImage() {
    chooseFile('#klaFileDialog', function(path) {
        details.images.push(dataref.generateFromPath(path));
        updateRefs();
        updateButtonStates();
    });
}

function removeImage(index) {
    details.images.splice(index, 1);
    updateRefs();
    updateButtonStates();
}

function addData() {
    chooseFile('#binFileDialog', function(path) {
        details.data = dataref.generateFromPath(path);
        updateRefs();
        updateButtonStates();
    });
}

function removeData() {
    details.data = null;
    updateButtonStates();
}

function setupRemoveMount(index) {
    return () => {
        return removeMount(index);
    };
}

function setupRemoveImage(index) {
    return () => {
        return removeImage(index);
    };
}

function initWindow() {
    nw.Window.get().show();
    nw.Window.get().focus();

    // fix mac application menu title in production build
    if (process.versions['nw-flavor'] === 'normal') {
        if (process.platform === 'darwin') {
            var mb = new nw.Menu({type: 'menubar'});
            mb.createMacBuiltin('BackBit Tool');
            nw.Window.get().menu = mb;
        }
    }
}

function initApp() {
    $('.version').innerHTML = "Tool v" + version;
    $('#buttonNew').addEventListener('click', newFile);
    $('#buttonOpen').addEventListener('click', openFile);
    $('#buttonSaveAs').addEventListener('click', saveAsFile);
    $('#buttonAddProgram').addEventListener('click', addProgram);
    $('#buttonRemoveProgram').addEventListener('click', removeProgram);
    $('#buttonAddMount').addEventListener('click', addMount);
    $('#buttonRemoveMount1').addEventListener('click', setupRemoveMount(0));
    $('#buttonRemoveMount2').addEventListener('click', setupRemoveMount(1));
    $('#buttonRemoveMount3').addEventListener('click', setupRemoveMount(2));
    $('#buttonRemoveMount4').addEventListener('click', setupRemoveMount(3));
    $('#buttonRemoveMount5').addEventListener('click', setupRemoveMount(4));
    $('#buttonRemoveMount6').addEventListener('click', setupRemoveMount(5));
    $('#buttonRemoveMount7').addEventListener('click', setupRemoveMount(6));
    $('#buttonRemoveMount8').addEventListener('click', setupRemoveMount(7));
    $('#buttonAddData').addEventListener('click', addData);
    $('#buttonRemoveData').addEventListener('click', removeData);
    $('#buttonAddMusic').addEventListener('click', addMusic);
    $('#buttonRemoveMusic').addEventListener('click', removeMusic);
    $('#buttonAddImage').addEventListener('click', addImage);
    $('#buttonRemoveImage1').addEventListener('click', setupRemoveImage(0));
    $('#buttonRemoveImage2').addEventListener('click', setupRemoveImage(1));
    $('#buttonRemoveImage3').addEventListener('click', setupRemoveImage(2));
    $('#buttonRemoveImage4').addEventListener('click', setupRemoveImage(3));
    $('#buttonRemoveImage5').addEventListener('click', setupRemoveImage(4));
    $('#buttonRemoveImage6').addEventListener('click', setupRemoveImage(5));
    $('#buttonRemoveImage7').addEventListener('click', setupRemoveImage(6));
    $('#buttonRemoveImage8').addEventListener('click', setupRemoveImage(7));
    $('#buttonRemoveImage9').addEventListener('click', setupRemoveImage(8));
    $('#buttonRemoveImage10').addEventListener('click', setupRemoveImage(9));
    $('#txtTitle').addEventListener('blur', updateButtonStates);
    $('#txtVersion').addEventListener('blur', updateButtonStates);
    $('#txtCopyright').addEventListener('blur', updateButtonStates);
    $('#txtCategory').addEventListener('blur', updateButtonStates);
    $('#txtController').addEventListener('blur', updateButtonStates);
    $('#txtRelease').addEventListener('blur', updateButtonStates);
    $('#txtManual').addEventListener('blur', updateButtonStates);
    updateButtonStates();

    // now that DOM is fully loaded init the window
    initWindow();
};

document.addEventListener('DOMContentLoaded', initApp);
