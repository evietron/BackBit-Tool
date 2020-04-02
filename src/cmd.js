#!/usr/bin/env node

//
// Command-Line Implementation for BackBit Tool
//

const version = require('../package').version;
const fs = require('fs');
const os = require('os');
const path = require('path');
const bbt = require('./bbt');
const dataref = require('./dataref');

let details = bbt.parse();

if (process.argv.length < 4) {
    console.log("BackBitTool " + version);
    console.log("Usage: BackBitTool [options] <output.bbt> <input files...>");
    console.log("Supported input files include: PRG,CRT,D64,D71,D81,D8B,SID,KLA")
    console.log("Use any unsupported extension to add extended data");
    console.log("Options: -c64, -c128, -v20 (assigns platform, default=c64)")
    process.exit();
}

let input = process.argv.slice(2);

function addImage(s) {
    if (details.images.length < 10) {
        details.images.push(dataref.generateFromPath(s));
    } else {
        console.error("Too many images (only 10 are allowed)");
        process.exit(1);
    }
}

function parseOption(s) {
    if (s === 'c64' || s === 'c128' || s === 'v20') {
        details.platform = s;
    } else {
        console.error("Invalid option: " + s);
        process.exit(1);
    }
}

function parseFilename(s) {
    let extIndex = s.lastIndexOf('.');
    let name = s;
    let ext = '';
    if (extIndex !== -1) {
        name = s.substr(0, extIndex);
        ext = s.substr(extIndex + 1);
    }
    switch (ext.toLowerCase()) {
        case 'prg':
            if (!details.program) {
                details.program = dataref.generateFromPath(s);
            } else {
                console.error("Too many program files (only 1 is allowed)");
                process.exit(1);
            }
            break;
        case 'crt':
            if (!details.cart && !details.v20) {
                details.cart = dataref.generateFromPath(s);
            } else {
                console.error("Too many cartridge images (only 1 is allowed)");
                process.exit(1);
            }
            break;
        case '20':
        case '40':
        case '60':
        case '70':
        case 'a0':
        case 'b0':
            if (!details.cart && !details.v20) {
                details.v20 = dataref.generateFromPath(s);
            } else {
                console.error("Too many cartridge images (only 1 is allowed)");
                process.exit(1);
            }
            break;
        case 'd64':
        case 'd71':
        case 'd81':
        case 'd8b':
            if (details.mounts.length < 8) {
                details.mounts.push(dataref.generateFromPath(s));
            } else {
                console.error("Too many disk images (only 8 are allowed)");
                process.exit(1);
            }
            break;
        case 'sid':
            if (!details.music) {
                details.music = dataref.generateFromPath(s);
            } else {
                console.error("Too many SID files (only 1 is allowed)");
                process.exit(1);
            }
            break;
        case 'kla':
        case 'koa':
            addImage(s);
            break;
        default:
            if (!details.data) {
                details.data = dataref.generateFromPath(s);
            } else {
                console.error("Too many unknown extensions (first is used for extended data)");
                process.exit(1);
            }
            break;
    }
}

let output = '';
while (input.length) {
    let s = input.shift();

    if (s.startsWith('-')) {
        parseOption(s.substr(1));
    } else if (output.length === 0) {
        output = s;
    } else {
        parseFilename(s);
    }
}

try {
    bbt.build(output, details);
}
catch (e) {
    console.error(e.toString());
    process.exit(1);
}
