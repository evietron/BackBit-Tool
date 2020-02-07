# BackBit-Tool

The BackBit Tool is a fully open source cross-platform JavaScript application that creates .BBT files for use with the BackBit cartridge for Commodore 64.

The BBT file format offers the following innovations:
* Prepend SID music and title screen/screenshots
* Autostarts to any program
* Incorporates up to 8 disk images (D64/D71/D81)
* Supports up to 4GB of binary data
* Tags important details about the program, including text and screenshots

While this format is designed to integrate with the BackBit cartridge, it is likely that emulators will eventually support this format once there is enough demand.

For the latest compiled build, find it at http://backbit.io/downloads/Tool/.

To discuss working on this tool, go to the forum at http://forum.backbit.io.

The cartridge is available for purchase at http://store.backbit.io.

Comes built with an easy-to-use GUI for Windows (32 & 64-bit), OSX (64-bit), & Linux (32 & 64-bit):

<img src="screenshot.png" width="50%">

Also usable with a command-line interface:

```
BackBitTool 1.2.2
Usage: BackBitTool <output.bbt> <input files...>
Supported input files include: PRG,CRT,D64,D71,D81,SID,KLA
Use any unsupported extension to add extended data
```

## Command-Line Usage

You must install node & npm to build on your machine:
https://nodejs.org/en/download/

To install COMMAND-LINE version:
* `npm i -g backbit-tool`

To run COMMAND-LINE version once installed:
* `backbit-tool`

## Development

To setup for development (first time only):
* `git clone https://github.com/evietron/BackBit-Tool.git`
* `cd BackBit-Tool`
* `npm i`
* `npm run dev`

To execute in DEBUG mode:
* `npm start`

To compile PRODUCTION builds (outputs to the **build** folder):
* `npm run deploy`

To execute PRODUCTION build (Mac OSX only for now):
* `npm run prod`

To install PRODUCTION build in your Applications folder (Mac OSX only for now):
* `npm run app`

## TO DO (Need help with!)
* Get build size down (webpack?)

## TO DO
* Use 'commander' package for Command Line interface
* Export functions that can be used in require('backbit')
* Command Line features
  * Update a BBT instead of building from scratch
  * Add/replace text fields
