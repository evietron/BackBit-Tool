//
// File references used in composing BBT file content
//
// This allows for the following use cases:
// - Reference an actual file in the filesystem
// - Reference content already built into an existing BBT file
//
// An object referred to as a "ref" contains these fields:
// - path: absolute or relative path to the content OR container
// - offset: zero indicates this is content;
//           positive indicates the byte position of the content's header in the container
// - bytes: -1 indicates to use remainder of file, otherwise # of bytes
//
// It is important to note that content living a container contains a header not found in the original content.
// Therefore, a header needs to be added to standalone content, but not content from a container.
//

const fs = require('fs');

// Returns a new "ref"
function generate(path, offset = 0, bytes = -1) {
    // if offset > 0, assume pre-rendered content with block header
    return {
        path,
        offset,
        bytes };
}

// Returns a byte buffer loaded from a ref
// Note: It is not recommended to use this helper for the "extended data" field,
//       since it can be up to 4GB (instead, read in chunks).
function read(ref) {
    let fd = fs.openSync(ref.path, "r");

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
