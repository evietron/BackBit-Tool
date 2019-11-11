const version = require('../package').version;
const bbt = require('./bbt');
const fileref = require('./fileref');
const fs = require('fs');

let handlers = {};

let details = bbt.parse();

// fix mac application menu title in production build
if (process.versions['nw-flavor'] === 'normal') {
    if (process.platform === 'darwin') {
        var mb = new nw.Menu({type: 'menubar'});
        mb.createMacBuiltin('BackBit Tool');
        nw.Window.get().menu = mb;
    }
}

let $ = function (selector) {
    return document.querySelector(selector);
}

nw.Window.get().on('loaded', function() {
    $('.version').innerHTML = "Tool v" + version;
    nw.Window.get().show();
})

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
    return !details.program && !details.mounts.length && !details.data;
}

function isValid() {
    return details.program || details.mounts.length;
}

function updateButtonStates() {
    $('#buttonNew').disabled = isEmpty();
    $('#buttonSaveAs').disabled = !isValid();
    $('#divAddProgram').style.display = details.program ? 'none' : 'flex';
    $('#buttonRemoveProgram').style.display = details.program ? 'flex' : 'none';
    $('#pathProgram').style.display = details.program ? 'flex' : 'none';
    $('#divAddMount').style.display = (details.mounts.length === 8) ? 'none' : 'flex';
    for (let i = 1; i <= 8; i++) {
        $('#buttonRemoveMount' + i).style.display =
            $('#pathMount' + i).style.display = (details.mounts.length >= i) ? 'flex' : 'none';
    }
    $('#buttonAddData').style.display = details.data ? 'none' : 'flex';
    $('#buttonRemoveData').style.display =
        $('#pathData').style.display = details.data ? 'flex' : 'none';
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
        details.program = null;
        details.mounts = [];
        details.data = null;
        updateButtonStates();
    }
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
            updateRefs();
            updateButtonStates();
        });
    }
}

function addProgram() {
    chooseFile('#prgFileDialog', function(path) {
        details.program = fileref.generate(path);
        updateRefs();
        updateButtonStates();
    });
}

function removeProgram() {
    details.program = null;
    updateButtonStates();
}

function updateRefs() {
    $('#pathProgram').innerHTML = shortenPath(details.program);
    for (let i = 0; i < details.mounts.length; i++) {
        $('#pathMount' + (i + 1)).innerHTML = (8 + i) + ': ' + shortenPath(details.mounts[i]);
    }
    $('#pathData').innerHTML = shortenPath(details.data);
}

function addMount() {
    chooseFile('#d64FileDialog', function(path) {
        details.mounts.push(fileref.generate(path));
        updateRefs();
        updateButtonStates();
    });
}

function removeMount(index) {
    details.mounts.splice(index, 1);
    updateRefs();
    updateButtonStates();
}

function addData() {
    chooseFile('#binFileDialog', function(path) {
        details.data = fileref.generate(path);
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

document.addEventListener('DOMContentLoaded', function() {
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
    updateButtonStates();
});
