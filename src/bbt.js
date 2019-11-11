//
// Parse and built .BBT files
//

const version = require('../package').version;
const fs = require('fs');
const tmp = require('tmp');
const fileref = require('./fileref');

const HEADER_LEN = 16;
const PADDING_OFFSET = 16;
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
    let byteOffset = data.length % PADDING_OFFSET;
    if (byteOffset > 0) {
        writeBuffer(fd, Buffer.alloc(PADDING_OFFSET - byteOffset, 0));
    }
}

function readBlockInfo(path, fd, offset) {
    let header = Buffer.alloc(HEADER_LEN);
    fs.readSync(fd, header, 0, HEADER_LEN, offset);
    let name = String.fromCharCode(...header.slice(0, 8));
    let param = String.fromCharCode(...header.slice(8, 12));
    let bytes =
        (header[12] << 24) |
        (header[13] << 16) |
        (header[14] << 8) |
        header[15];
    let padded = bytes;
    if (bytes % PADDING_OFFSET) {
        padded += PADDING_OFFSET - (bytes % PADDING_OFFSET);
    }
    let nextOffset = offset + HEADER_LEN + padded;
    let ref = fileref.generate(path, offset, HEADER_LEN + padded);
    return {
        name,
        param,
        ref,
        nextOffset
    };
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

function writeMount(fd, device, data) {
    let ext = null;
    if (data.length === 174848 || data.length === 175531) {
        ext = "D64";
    } else if (data.length === 349696 || data.length === 351062) {
        ext = "D71";
    } else if (data.length === 819200 || data.length === 822400) {
        ext = "D81";
    } else {
        throw "Invalid disk image";
    }
    writeBlock(fd, 'MOUNT' + ext, device, data);
    return ext;
}

function renderData(fd, data) {
    let len = data.bytes;
    if (len === -1) {
        let stats = fs.statSync(data.path);
        len = stats['size'];
        len -= data.offset;
    }

    if (!data.offset) {
        // not pre-rendered
        clearBuffer();
        bufferAddString('EXTENDEDDATA');
        bufferAddUInt32(len);
        writeBuffer(fd);
    }

    let fdSrc = fs.openSync(data.path, "r");
    let pos = data.offset;
    let chunk = Buffer.alloc(65536);
    while (len > 0) {
        let readLen = fs.readSync(fdSrc, chunk, 0, Math.min(len, 65536), pos);
        pos += readLen;
        if (readLen < 65536) {
            chunk = chunk.slice(0, readLen);
        }
        writePaddedBuffer(fd, chunk);
        len -= readLen;
    }
}

function build(path, details) {
    let out = tmp.fileSync();
    let fd = out.fd;
    if (fd) {
        writeHeader(fd);
        if (details.program) {
            let data = fileref.read(details.program);
            if (details.program.offset) {
                // pre-rendered
                writeBuffer(fd, data);
            } else if (data.length > 2) {
                let addr = data[0];
                addr += data[1] << 8;
                writeProgram(fd, addr, data.slice(2));
            } else {
                throw "Startup program is invalid";
            }
        }
        for (let i = 0; i < details.mounts.length; i++) {
            let data = fileref.read(details.mounts[i]);
            if (details.mounts[i].offset) {
                // pre-rendered
                writeBuffer(fd, data);
            } else if (!writeMount(fd, 8 + i, data)) {
                throw "Invalid disk image size";
            }
        }
        if (details.data) {
            renderData(fd, details.data);
        }
        writeFooter(fd);
        fs.closeSync(fd);
        fs.renameSync(out.name, path);
    } else {
        throw "Can't create " + path;
    }
}

function parse(path) {
    let details = {
        program: null,
        mounts: [],
        data: null
    }

    if (path) {
        let fd = fs.openSync(path, "r");
        let offset = 0;
        let block = readBlockInfo(path, fd, 0);
        let footer = false;
        if (block.name !== "BACKBIT ") {
            throw "Invalid BBT header";
            return;
        }
        offset = block.nextOffset;
        block = readBlockInfo(path, fd, offset);
        while (!footer && block.nextOffset !== offset) {
            switch (block.name) {
                case "STARTPRG":
                    details.program = block.ref;
                    break;
                case "MOUNTD64":
                case "MOUNTD71":
                case "MOUNTD81":
                    details.mounts.push(block.ref);
                    break;
                case "EXTENDED":
                    details.data = block.ref;
                    break;
                case "BACKBITS":
                    footer = true;
                    break;
                default:
                    if (block.name) {
                        throw "Invalid field: " + block.name;
                    } else {
                        throw "Invalid BBT file";
                    }
                    return;
            }
            offset = block.nextOffset;
            block = readBlockInfo(path, fd, offset);
        }
    }

    return details;
}

module.exports = {
    build,
    parse
}
