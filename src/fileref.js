const fs = require('fs');

function generate(path, offset = 0, bytes = -1) {
    // if offset > 0, assume pre-rendered content with block header
    return {
        path,
        offset,
        bytes };
}

function read(ref) {
    let fd = fs.openSync(ref.path);

    let stats = fs.statSync(ref.path);
    let len = stats['size'];
    let bytes = ref.bytes;
    if (bytes === -1) {
        bytes = len - ref.offset;
    }

    let buf = Buffer.alloc(bytes);
    let result = fs.readSync(fd, buf, 0, bytes, ref.offset);
    
    return (result === bytes) ? buf : null;
}

module.exports = {
    generate,
    read
}