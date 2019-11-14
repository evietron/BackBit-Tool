const NwBuilder = require('nw-builder-webpack-plugin');

let options = {
  files: ['package.json', 'src/**', 'node_modules/**'],
  platforms: ['osx64', 'win32', 'win64', 'linux32', 'linux64'],
  appName: "BackBit Tool",
  flavor: "normal",
  macIcns: "src/icon.icns"
}

new NwBuilder().build(options).then(function () {
  console.log('Build succeeded.');
}).catch(function (error) {
  console.error('Build failed: ', error);
});
