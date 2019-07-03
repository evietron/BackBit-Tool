let handlers = {};
let pathProgram = null;
let pathsMount = [];
let pathData = null;
let isModified = false;

// fix mac application menu title in production build
if (process.versions['nw-flavor'] === 'normal') {
    if (process.platform === 'darwin') {
        var mb = new nw.Menu({type: 'menubar'});
        mb.createMacBuiltin('BackBit Tool');
        nw.Window.get().menu = mb;
    }
}

nw.Window.get().on('loaded', function() {
    nw.Window.get().show();
})

let $ = function (selector) {
    return document.querySelector(selector);
}

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

function updateButtonStates() {
    $('#buttonNew').disabled = !isModified;
    $('#buttonSaveAs').disabled = !isModified;
    $('#buttonAddProgram').style.display = pathProgram ? 'none' : 'flex';
    $('#buttonRemoveProgram').style.display = pathProgram ? 'flex' : 'none';
        $('#pathProgram').style.display = pathProgram ? 'flex' : 'none';
    $('#buttonAddMount').style.display = (pathsMount.length === 8) ? 'none' : 'flex';
    for (let i = 1; i <= 8; i++) {
        $('#buttonRemoveMount' + i).style.display =
            $('#pathMount' + i).style.display = (pathsMount.length >= i) ? 'flex' : 'none';
    }
    $('#buttonAddData').style.display = pathData ? 'none' : 'flex';
    $('#buttonRemoveData').style.display =
        $('#pathData').style.display = pathData ? 'flex' : 'none';
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
        pathProgram = null;
        pathsMount = [];
        pathData = null;
        isModified = false;
        updateButtonStates();
    }
}

function saveAsFile() {
}

function addProgram() {
    chooseFile('#prgFileDialog', function(path) {
        pathProgram = path;
        $('#pathProgram').innerHTML = shortenPath(pathProgram);
        isModified = true;
        updateButtonStates();
    });
}

function removeProgram() {
    isModified = true;
    pathProgram = null;
    updateButtonStates();
}

function updateMounts() {
    for (let i = 0; i < pathsMount.length; i++) {
        $('#pathMount' + (i + 1)).innerHTML = (8 + i) + ': ' + shortenPath(pathsMount[i]);
    }
}

function addMount() {
    chooseFile('#d64FileDialog', function(path) {
        pathsMount.push(path);
        updateMounts();
        isModified = true;
        updateButtonStates();
    });
}

function removeMount(index) {
    isModified = true;
    pathsMount.splice(index, 1);
    updateMounts();
    updateButtonStates();
}

function addData() {
    chooseFile('#binFileDialog', function(path) {
        pathData = path;
        $('#pathData').innerHTML = shortenPath(pathData);
        isModified = true;
        updateButtonStates();
    });
}

function removeData() {
    isModified = true;
    pathData = null;
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
