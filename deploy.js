var NwBuilder = require('nw-builder');
var nw = new NwBuilder({
  files: ['*.json', 'index.*'], // simple-glob format
  platforms: ['osx64', 'win64', 'linux64']
});

nw.build().then(function () {
  console.log('Build succeeded.');
}).catch(function (error) {
    console.log('Build failed:');
    console.error(error);
});
