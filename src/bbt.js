//
// Parse and build .BBT files
//

const version = require('../package').version;
const fs = require('fs');
const os = require('os');
const path = require('path');
const dataref = require('./dataref');

//
// Anatomy of a BBT file
//

// Requirements
// - the file size is always divisible by 16 bytes
// - it is composed of chunks with 16 byte headers
// - each header starts at an offset divisible by 16 bytes
// - chunks are padded to be a length divisble by 16 bytes
// - padding is always zeroes
// - there is always a starting and ending chunk
// - all #'s are big-endian to be human readable in a hex editor

// The header for a chunk is always 16 bytes:
// - [8-char type id] [4-byte parameter] [4-byte content length]
// - note that content length does not include the length of the header
// - if there is no parameter needed, the type id can extend into the parameter area
// - (however, characters 9-12 of the type id are ignored)
const HEADER_LEN = 16;

// For easy readability in a hex editor, all fields are padded to 16 byte offsets
const PADDING_OFFSET = 16;

//
// Chunk types
//

// Starting chunk
// - type id: "BACKBIT " (ends with a space)
// - parameter: "C64 " (refers to system file is intended for: C64, C128, PLS4, V20)
// - content is the version name, i.e. "VERSION X.X.X"

// Autostart program
// - type id: "STARTPRG"
// - parameter: 16-bit start address, followed by 16-bit end address (inclusive, i.e. last byte used)
// - content is program data, excluding 2-byte start address for a PRG since it is already included

// Mounted cartridge
// - type id: "MOUNTCRT"
// - parameter: 32-bit length of physical cartridge size (i.e. 8K would be 8192)
// - content is a CRT file

// Mounted VIC 20 cartridge
// - type id: "MOUNTV20"
// - parameter: 16-bit start address
// - content is a A0/60/40/20/etc file

// Mounted disk image
// - type id: "MOUNTD64" / "MOUNTD71" / "MOUNTD81" / "MOUNTD8B"
// - parameter: the device # (typically 8-15)
// - content is a D64/D71/D81/D8B file

// Version of disk image
// - type id: "SAVESD64" / "SAVESD71" / "SAVESD81" / "SAVESD8B"
// - parameter: the device # (typically 8-15)
// - content begins with 48-byte name of this version
// - following version name is a D64/D71/D81/D8B file
// - version names MUST be grouped together and not appear out of order

// Extended data chunk
// - type id: "EXTENDEDDATA"
// - content is user-defined binary data

// Intro Music
// - type id: "INTROSID"
// - parameter: 0 (reserved for future use)
// - content is SID file

// Intro Graphics
// - type id: "INTROKLA"
// - parameter: 0 (reserved for future use)
// - content is KLA file

// Title
// - type id: "TXTTITLE"
// - content is UTF8 text

// Version
// - type id: "TXTVERSION"
// - content is UTF8 text

// Copyright
// - type id: "TXTCOPYRIGHT"
// - content is UTF8 text

// Category
// - type id: "TXTCATEGORY"
// - content is UTF8 text

// Controller
// - type id: "TXTCONTROL"
// - content is UTF8 text

// Release Note
// - type id: "TXTNOTES"
// - content is UTF8 text

// Instructions
// - type id: "TXTMANUAL"
// - content is UTF8 text

// Ending chunk
// - type id: "BACKBITS"
// - parmeter: "BACK" (does not vary)

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
    s = s.padEnd(4);
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

function getContentLenFromHeader(header) {
    return (header[12] << 24) |
        (header[13] << 16) |
        (header[14] << 8) |
        header[15];
}

function readBlockInfo(src, fd, offset) {
    let header = Buffer.alloc(HEADER_LEN);
    fs.readSync(fd, header, 0, HEADER_LEN, offset);
    let name = String.fromCharCode(...header.slice(0, 8));
    let param = String.fromCharCode(...header.slice(8, 12));
    let bytes = getContentLenFromHeader(header);
    let padded = bytes;
    if (bytes % PADDING_OFFSET) {
        padded += PADDING_OFFSET - (bytes % PADDING_OFFSET);
    }
    let nextOffset = offset + HEADER_LEN + padded;
    let ref = dataref.generateFromPath(src, offset, HEADER_LEN + padded);
    return {
        name,
        param,
        bytes,
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

function writeHeader(fd, platform) {
    let platformStr = 'C64 ';
    if (platform === 'v20') {
        platformStr = 'V20 ';
    } else if (platform === 'pls4') {
        platformStr = 'PLS4';
    } else if (platform === 'c128') {
        platformStr = 'C128';
    }
    writeBlock(fd, 'BACKBIT ', stringToUInt32(platformStr), Buffer.from(stringToBytes('VERSION ' + version)));
}

function writeFooter(fd) {
    writeBlock(fd, 'BACKBITS', stringToUInt32('BACK'));
}

function writeProgram(fd, program) {
    let data = dataref.read(program);
    if (program.offset) {
        // pre-rendered
        writeBuffer(fd, data);
    } else if (data.length > 2) {
        let addr = data[0];
        addr += data[1] << 8;
        
        let i = addr << 16;
        let endAddr = addr + data.length - 3;
        if (endAddr < 65536) {
            i += endAddr;
        }
        writeBlock(fd, 'STARTPRG', i, data.slice(2));
    } else {
        throw "Startup program is invalid";
    }
}

function writeCart(fd, cart) {
    let data = dataref.read(cart);
    if (cart.offset) {
        // pre-rendered
        writeBuffer(fd, data);
    } else if (data.length >= 8192) {
        let size = Math.floor(data.length / 8192) * 8192;
        writeBlock(fd, 'MOUNTCRT', size, data);
    } else {
        throw "Cartridge is invalid";
    }
}

function writeV20(fd, cart) {
    let data = dataref.read(cart);
    let extIndex = cart.path ? cart.path.lastIndexOf('.') : -1;
    if (cart.offset) {
        // pre-rendered
        writeBuffer(fd, data);
    } else if (extIndex !== -1) {
        let addr = Number("0x" + cart.path.substr(extIndex + 1) + "00");
        writeBlock(fd, 'MOUNTV20', addr, data);
    } else {
        throw "Cartridge is invalid";
    }
}

function writeMount(fd, device, mount) {
    let data = dataref.read(mount);
    if (mount.offset) {
        // pre-rendered
        writeBuffer(fd, data);
    } else {
        let ext = null;
        if (data.length === 174848 || data.length === 175531) {
            ext = "D64";
        } else if (data.length === 349696 || data.length === 351062) {
            ext = "D71";
        } else if (data.length === 819200 || data.length === 822400) {
            ext = "D81";
        } else if (data.length === 1376256 || data.length === 1381632) {
            ext = "D8B";
        } else {
            throw "Invalid disk image";
        }
        writeBlock(fd, 'MOUNT' + ext, device, data);
    }
}

// TO DO: eventually build this block parsing into dataref.js
function writeData(fd, data) {
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

function writeMusic(fd, music) {
    let data = dataref.read(music);
    if (music.offset) {
        // pre-rendered
        writeBuffer(fd, data);
    } else {
        writeBlock(fd, 'INTROSID', 0, data);
    }
}

function generateTempFile(ext) {
    n = Math.floor(Math.random() * 1000000);
    return '~backbit' + n + '.' + ext;
}

function writeImage(fd, image) {
    let data = dataref.read(image);
    if (image.offset) {
        // pre-rendered
        writeBuffer(fd, data);
    } else {
        // not pre-rendered
        if (data) {
            writeBlock(fd, 'INTROKLA', 0, data);
        }
    }
}

function writeText(fd, id, ref) {
    if (ref) {
        let data = dataref.read(ref);
        if (data && data.length) {
            writeBlock(fd, id.substr(0, 8), stringToUInt32(id.substr(8)), data);
        }
    }
}

function build(dest, details) {
    let out = dest + ".tmp";
    let fd = fs.openSync(out, 'w');

    if (fd) {
        writeHeader(fd, details.platform);
        if (details.program) {
            writeProgram(fd, details.program);
        }
        if (details.cart) {
            writeCart(fd, details.cart);
        }
        if (details.v20) {
            writeV20(fd, details.v20);
        }
        for (let i = 0; i < details.mounts.length; i++) {
            writeMount(fd, 8 + i, details.mounts[i]);
        }
        if (details.data) {
            writeData(fd, details.data);
        }
        if (details.music) {
            writeMusic(fd, details.music);
        }
        for (let i = 0; i < details.images.length; i++) {
            writeImage(fd, details.images[i]);
        }
    
        writeText(fd, 'TXTTITLE', details.text.title);
        writeText(fd, 'TXTVERSION', details.text.version);
        writeText(fd, 'TXTCOPYRIGHT', details.text.copyright);
        writeText(fd, 'TXTCATEGORY', details.text.category);
        writeText(fd, 'TXTCONTROL', details.text.controller);
        writeText(fd, 'TXTNOTES', details.text.release);
        writeText(fd, 'TXTMANUAL', details.text.manual);
    
        writeFooter(fd);
        fs.closeSync(fd);
        fs.renameSync(out, dest);
    } else {
        throw "Can't create " + dest;
    }
}

function parse(src) {
    let details = {
        platform: 'c64',
        program: null,
        cart: null,
        mounts: [],
        data: null,
        music: null,
        images: [],
        text: {}
    }

    if (src) {
        let fd = fs.openSync(src, "r");
        let offset = 0;
        let block = readBlockInfo(src, fd, 0);
        let footer = false;
        if (block.name !== "BACKBIT ") {
            throw "Invalid BBT header";
            return;
        }
        if (block.param === "V20 ") {
            details.platform = "v20";
        } else if (block.param === "PLS4") {
            details.platform = "pls4";
        } else if (block.param === "C128") {
            details.platform = "c128";
        } else if (block.param !== "C64 ") {
            throw "Invalid BBT platform";
            return;
        }
        offset = block.nextOffset;
        block = readBlockInfo(src, fd, offset);
        while (!footer && block.nextOffset !== offset) {
            switch (block.name) {
                case "STARTPRG":
                    details.program = block.ref;
                    break;
                case "MOUNTCRT":
                    details.cart = block.ref;
                    break;
                case "MOUNTV20":
                    details.v20 = block.ref;
                    break;
                case "MOUNTD64":
                case "MOUNTD71":
                case "MOUNTD81":
                case "MOUNTD8B":
                    details.mounts.push(block.ref);
                    break;
                case "SAVESD64":
                case "SAVESD71":
                case "SAVESD81":
                case "SAVESD8B":
                    // these are valid, but ignored
                    break;
                case "EXTENDED":
                    details.data = block.ref;
                    break;
                case "INTROSID":
                    details.music = block.ref;
                    break;
                case "INTROKLA":
                    details.images.push(block.ref);
                    break;
                case "TXTTITLE":
                    details.text.title = block.ref;
                    break;
                case "TXTVERSI":
                    details.text.version = block.ref;
                    break;
                case "TXTCOPYR":
                    details.text.copyright = block.ref;
                    break;
                case "TXTCATEG":
                    details.text.category = block.ref;
                    break;
                case "TXTCONTR":
                    details.text.controller = block.ref;
                    break;
                case "TXTNOTES":
                    details.text.release = block.ref;
                    break;
                case "TXTMANUA":
                    details.text.manual = block.ref;
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
            block = readBlockInfo(src, fd, offset);
        }
    }

    return details;
}

function extractProgram(name, bytes, ref) {
    let fd = fs.openSync(name, 'w');
    let data = dataref.read(ref);
    fs.writeSync(fd, data, 8, 2);
    fs.writeSync(fd, data, 16, bytes);
    fs.closeSync(fd);
}

function extractData(name, bytes, ref) {
    let fd = fs.openSync(name, 'w');
    let data = dataref.read(ref);
    fs.writeSync(fd, data, 16, bytes);
    fs.closeSync(fd);
}

function extract(src) {
    if (src) {
        let extIndex = src.lastIndexOf('.');
        let prefix = (extIndex === -1) ? src : src.substr(0, extIndex);
        extIndex = src.lastIndexOf('\\');
        if (extIndex === -1) {
            extIndex = src.lastIndexOf('/');
        }
        prefix = prefix.substr(extIndex + 1);
        let fd = fs.openSync(src, "r");
        let offset = 0;
        let block = readBlockInfo(src, fd, 0);
        let footer = false;
        if (block.name !== "BACKBIT ") {
            throw "Invalid BBT header";
            return;
        }
        offset = block.nextOffset;
        block = readBlockInfo(src, fd, offset);
        while (!footer && block.nextOffset !== offset) {
            switch (block.name) {
                case "STARTPRG":
                    extractProgram(prefix + '.prg', block.bytes, block.ref);
                    break;
                case "MOUNTCRT":
                    extractData(prefix + '.crt', block.bytes, block.ref);
                    break;
                case "MOUNTV20":
                    extractData(prefix + '.' + Number(block.param.charCodeAt(2)).toString(16), block.bytes, block.ref);
                    break;
                case "MOUNTD64":
                case "MOUNTD71":
                case "MOUNTD81":
                case "MOUNTD8B":
                    extractData(prefix + block.param.charCodeAt(3) + '.' + block.name.substr(5), block.bytes, block.ref);
                    break;
                case "EXTENDED":
                    extractData(prefix + '.bin', block.bytes, block.ref);
                    break;
                case "BACKBITS":
                    footer = true;
                    break;
            }
            offset = block.nextOffset;
            block = readBlockInfo(src, fd, offset);
        }
    }
}

function stripContent(data) {
    // strip byte buffer into just data content
    let len = getContentLenFromHeader(data);
    return data.slice(HEADER_LEN, HEADER_LEN + len);
}

module.exports = {
    build,
    extract,
    parse,
    stripContent
}
