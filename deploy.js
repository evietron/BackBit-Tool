var NwBuilder = require('nw-builder');
var nw = new NwBuilder({
  files: ['*.json', 'index.*'], // simple-glob format
  platforms: ['osx64', 'win32', 'win64', 'linux32', 'linux64'],
  appName: "BackBit Tool",
  flavor: "normal",
  macIcns: "icon.icns"
});

nw.build().then(function () {
  console.log('Build succeeded.');
}).catch(function (error) {
    console.log('Build failed:');
    console.error(error);
});
