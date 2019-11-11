const version = require('../package').version;
const bbt = require('./bbt');

let handlers = {};

let details = {
    pathProgram: null,
    pathsMount: [],
    pathData: null
}

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

function shortenPath(path) {
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
    return !details.pathProgram && !details.pathsMount.length && !details.pathData;
}

function isValid() {
    return details.pathProgram || details.pathsMount.length;
}

function updateButtonStates() {
    $('#buttonNew').disabled = isEmpty();
    $('#buttonSaveAs').disabled = !isValid();
    $('#divAddProgram').style.display = details.pathProgram ? 'none' : 'flex';
    $('#buttonRemoveProgram').style.display = details.pathProgram ? 'flex' : 'none';
        $('#pathProgram').style.display = details.pathProgram ? 'flex' : 'none';
    $('#divAddMount').style.display = (details.pathsMount.length === 8) ? 'none' : 'flex';
    for (let i = 1; i <= 8; i++) {
        $('#buttonRemoveMount' + i).style.display =
            $('#pathMount' + i).style.display = (details.pathsMount.length >= i) ? 'flex' : 'none';
    }
    $('#buttonAddData').style.display = details.pathData ? 'none' : 'flex';
    $('#buttonRemoveData').style.display =
        $('#pathData').style.display = details.pathData ? 'flex' : 'none';
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

function newFile() {
    if (confirm("This will destroy all changes. Are you sure?")) {
        details.pathProgram = null;
        details.pathsMount = [];
        details.pathData = null;
        updateButtonStates();
    }
}

function saveAsFile() {
    chooseFile('#bbtFileDialog', function(path) {
       bbt.build(path, details);
    });
}

function addProgram() {
    chooseFile('#prgFileDialog', function(path) {
        details.pathProgram = path;
        $('#pathProgram').innerHTML = shortenPath(details.pathProgram);
        updateButtonStates();
    });
}

function removeProgram() {
    details.pathProgram = null;
    updateButtonStates();
}

function updateMounts() {
    for (let i = 0; i < details.pathsMount.length; i++) {
        $('#pathMount' + (i + 1)).innerHTML = (8 + i) + ': ' + shortenPath(details.pathsMount[i]);
    }
}

function addMount() {
    chooseFile('#d64FileDialog', function(path) {
        details.pathsMount.push(path);
        updateMounts();
        updateButtonStates();
    });
}

function removeMount(index) {
    details.pathsMount.splice(index, 1);
    updateMounts();
    updateButtonStates();
}

function addData() {
    chooseFile('#binFileDialog', function(path) {
        details.pathData = path;
        $('#pathData').innerHTML = shortenPath(details.pathData);
        updateButtonStates();
    });
}

function removeData() {
    details.pathData = null;
    updateButtonStates();
}

function setupRemoveMount(index) {
    return () => {
        return removeMount(index);
    };
}

document.addEventListener('DOMContentLoaded', function() {
    $('#buttonNew').addEventListener('click', newFile);
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
