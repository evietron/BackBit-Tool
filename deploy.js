var NwBuilder = require('nw-builder');
var nw = new NwBuilder({
  files: ['package.json', 'src/**'],
  platforms: ['osx64', 'win32', 'win64', 'linux32', 'linux64'],
  appName: "BackBit Tool",
  flavor: "normal",
  macIcns: "src/icon.icns"
});

nw.build().then(function () {
  console.log('Build succeeded.');
}).catch(function (error) {
  console.error('Build failed: ', error);
});
