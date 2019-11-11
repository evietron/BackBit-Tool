const version = require('../package').version;
const fs = require('fs');

let buffer = [];

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

function renderData(fd, pathData) {
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

function build(path, details) {
    if (!path.toLowerCase().endsWith('.bbt')) {
        path += '.bbt';
    }

    try {
        let fd = fs.openSync(path, 'w');
        if (fd) {
            writeHeader(fd);
            if (details.pathProgram) {
                let data = fs.readFileSync(details.pathProgram);
                if (data.length > 2) {
                    let addr = data[0];
                    addr += data[1] << 8;
                    writeProgram(fd, addr, data.slice(2));
                } else {
                    alert("Startup program is invalid");
                }
            }
            for (let i = 0; i < details.pathsMount.length; i++) {
                let data = fs.readFileSync(details.pathsMount[i]);
                writeMount(fd, details.pathsMount[i].slice(details.pathsMount[i].length - 3).toUpperCase(), 8 + i, data);
            }
            if (details.pathData) {
                renderData(fd, details.pathData);
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

module.exports = {
    build
}