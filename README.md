# BackBit-Tool

The BackBit Tool is a cross-platform JavaScript application that creates .BBT files.

For the latest compiled build, find it at http://backbit.io/downloads/Tool/.

<img src="screenshot.png" width="50%">

The BBT file format is useful for developing applications for the BackBit Commodore 64 cartridge that can mount multiple disks 
and can attach a large amount of binary data (up to 4GB).

This is a NW.js app which means it is a JavaScript application that runs in a browser framework, appearing as an executable on Windows, Mac OSX, or Linux machines. This is great for compatibility, and builds on the Node.js infrastructure.

You must install node & npm:
https://nodejs.org/en/download/

To setup for development (first time only):
* `npm run dev`

To execute in DEBUG mode:
* `npm start`

To compile PRODUCTION builds (outputs to the **build** folder):
* `npm run deploy`

To execute PRODUCTION build (Mac OSX only for now):
* `npm run prod`

To install PRODUCTION build in your Applications folder (Mac OSX only for now):
* `npm run install`

TO DO:
* Create a commandline version
* Add support for specifying Koala title screens w/ SID music
* Add support for manuals/instructions
* Add support for screenshots
* Add identifying information, like contributors, publisher, year of release, etc.

TOPICS OF DISCUSSION:
* Storing cracks as patches to preserve originals
* Specifying trainers to preserve settings upon use
* Consistent way of storing high scores
* VICE emulator support
