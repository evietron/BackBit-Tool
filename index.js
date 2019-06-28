// fix mac application menu title in production build
if (process.versions['nw-flavor'] === 'normal') {
    if (process.platform === 'darwin') {
        var mb = new nw.Menu({type: 'menubar'});
        mb.createMacBuiltin('BackBit Tool');
        nw.Window.get().menu = mb;
    }
}

// document.write("HEY... ", process.platform, " HOO!")

// console.log("stuff!!!!")