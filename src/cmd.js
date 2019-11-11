//
// Command-Line Implementation for BackBit Tool
//

const version = require('../package').version;
const bbt = require('./bbt');
const fileref = require('./fileref');

let details = bbt.parse();

if (process.argv.length < 4) {
    console.log("BackBitTool " + version);
    console.log("Usage: BackBitTool <output.bbt> <input files...>");
    console.log("Supported input files include: PRG,D64,D71,D81,SID,KLA")
    console.log("Use any unsupported extension to add extended data");
    process.exit();
}

let output = process.argv[2];
let input = process.argv.slice(3);

while (input.length) {
    let s = input.shift();

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
                details.program = fileref.generate(s);
            } else {
                console.error("Too many program files (only 1 is allowed)");
                process.exit(1);
            }
            break;
        case 'd64':
        case 'd71':
        case 'd81':
            if (details.mounts.length < 8) {
                details.mounts.push(fileref.generate(s));
            } else {
                console.error("Too many disk images (only 8 are allowed)");
                process.exit(1);
            }
            break;
        case 'sid':
        case 'kla':
            console.error("not supported yet");
            process.exit(1);
            break;
        default:
            if (!details.data) {
                details.data = fileref.generate(s);
            } else {
                console.error("Too many unknown extensions (first is used for extended data)");
                process.exit(1);
            }
            break;
    }
}

try {
    bbt.build(output, details);
}
catch (e) {
    console.error(e.toString());
    process.exit(1);
}
