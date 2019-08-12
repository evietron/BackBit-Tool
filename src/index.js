let version = require('../package').version;

let fs = require('fs');

let handlers = {};
let pathProgram = null;
let pathsMount = [];
let pathData = null;
let buffer = [];

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
    return !pathProgram && !pathsMount.length && !pathData;
}

function isValid() {
    return pathProgram || pathsMount.length;
}

function updateButtonStates() {
    $('#buttonNew').disabled = isEmpty();
    $('#buttonSaveAs').disabled = !isValid();
    $('#divAddProgram').style.display = pathProgram ? 'none' : 'flex';
    $('#buttonRemoveProgram').style.display = pathProgram ? 'flex' : 'none';
        $('#pathProgram').style.display = pathProgram ? 'flex' : 'none';
    $('#divAddMount').style.display = (pathsMount.length === 8) ? 'none' : 'flex';
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
        updateButtonStates();
    }
}


function clearBuffer() {
    buffer = [];
}

function stringToBytes(s) {
    let data = [];
    for (let i = 0; i < s.length; i++) {
        data.push(s.charCodeAt(i));
    }
    return data;
}

function stringToUInt32(s) {
    return (s.charCodeAt(0) << 24) +
        (s.charCodeAt(1) << 16) +
        (s.charCodeAt(2) << 8) +
        s.charCodeAt(3);
}

function bufferAddString(s) {
    for (let i = 0; i < s.length; i++) {
        buffer.push(s.charCodeAt(i));
    }
}

function bufferAddUInt32(i) {
    buffer.push((i >> 24) & 0xff);
    buffer.push((i >> 16) & 0xff);
    buffer.push((i >> 8) & 0xff);
    buffer.push(i & 0xff);
}

function writeBuffer(fd, data) {
    fs.writeSync(fd, data ? data : Buffer.from(buffer));
}

function writePaddedBuffer(fd, data) {
    writeBuffer(fd, data);
    let byteOffset = data.length % 16;
    if (byteOffset > 0) {
        writeBuffer(fd, Buffer.alloc(16 - byteOffset, 0));
    }
}

function writeBlock(fd, name, id, data) {
    clearBuffer();
    bufferAddString(name);
    bufferAddUInt32(id);
    bufferAddUInt32(data ? data.length : 0);
    writeBuffer(fd);
    if (data) {
        writePaddedBuffer(fd, data);
    }
}

function writeHeader(fd) {
    writeBlock(fd, 'BACKBIT ', stringToUInt32('C64 '), Buffer.from(stringToBytes('VERSION ' + version)));
}

function writeFooter(fd) {
    writeBlock(fd, 'BACKBITS', stringToUInt32('BACK'));
}

function writeProgram(fd, addr, data) {
    let i = addr << 16;
    let endAddr = addr + data.length - 1;
    if (endAddr < 65536) {
        i += endAddr;
    }
    writeBlock(fd, 'STARTPRG', i, data);
}

function writeMount(fd, ext, device, data) {
    writeBlock(fd, 'MOUNT' + ext, device, data);
}

function renderData(fd) {
    let stats = fs.statSync(pathData);
    let len = stats['size'];
    clearBuffer();
    bufferAddString('EXTENDEDDATA');
    bufferAddUInt32(len);
    writeBuffer(fd);

    let fdSrc = fs.openSync(pathData);
    let data = Buffer.alloc(65536, 0);
    while (len > 0) {
        let readLen = fs.readSync(fdSrc, data, 0, Math.min(len, 65536));
        if (readLen < 65536) {
            data = data.slice(0, readLen);
        }
        writePaddedBuffer(fd, data);
        len -= readLen;
    }
}

function build(path) {
    if (!path.toLowerCase().endsWith('.bbt')) {
        path += '.bbt';
    }

    try {
        let fd = fs.openSync(path, 'w');
        if (fd) {
            writeHeader(fd);
            if (pathProgram) {
                let data = fs.readFileSync(pathProgram);
                if (data.length > 2) {
                    let addr = data[0];
                    addr += data[1] << 8;
                    writeProgram(fd, addr, data.slice(2));
                } else {
                    alert("Startup program is invalid");
                }
            }
            for (let i = 0; i < pathsMount.length; i++) {
                let data = fs.readFileSync(pathsMount[i]);
                writeMount(fd, pathsMount[i].slice(pathsMount[i].length - 3).toUpperCase(), 8 + i, data);
            }
            if (pathData) {
                renderData(fd);
            }
            writeFooter(fd);
            fs.closeSync(fd);
        } else {
            alert("Can't open " + path);
        }
    } catch (e) {
        alert("ERROR: " + e);
    }
}

function saveAsFile() {
    chooseFile('#bbtFileDialog', function(path) {
        build(path);
    });
}

function addProgram() {
    chooseFile('#prgFileDialog', function(path) {
        pathProgram = path;
        $('#pathProgram').innerHTML = shortenPath(pathProgram);
        updateButtonStates();
    });
}

function removeProgram() {
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
        updateButtonStates();
    });
}

function removeMount(index) {
    pathsMount.splice(index, 1);
    updateMounts();
    updateButtonStates();
}

function addData() {
    chooseFile('#binFileDialog', function(path) {
        pathData = path;
        $('#pathData').innerHTML = shortenPath(pathData);
        updateButtonStates();
    });
}

function removeData() {
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
