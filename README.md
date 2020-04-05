# BackBit-Tool

The BackBit Tool is a fully open source cross-platform JavaScript application that creates .BBT files for use with the BackBit cartridge for Commodore 64.

The BBT file format offers the following innovations:
* Prepend SID music and title screen/screenshots
* Autostarts to any program
* Incorporates up to 8 disk images (D64/D71/D81/D8B)
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
Supported input files include: PRG,CRT,D64,D71,D81,D8B,SID,KLA
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

## BBT File Format

This is a (somewhat) human readable format when viewed in a hex editor with a column with of 16 bytes.

All fields begin on 16-byte offsets.

See details here:
https://github.com/evietron/BackBit-Tool/blob/master/src/bbt.js

## D8B File Format

This is a new format, similar to other disk formats but with capacity for about 8 regular disks and directory entires to match.

| Format | Tracks | Sectors | Dir Entries | Dir Track | BAM Sector# | Dir Sector# | BAM bytes/trk | Blocks Avail | Capacity vs D64 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D64 | 35 | 17-21 | 144 | 18 | 0 | 1-18 | 4 | 664 | 1x |
| D71 | 70 | 17-21 | 144 | 18/53 | 0 | 1-18 | 4 | 1328 | 2x |
| D81 | 80 | 40 | 296 | 40 | 1-2 | 3-39 | 6 | 3160 | 4.8x |
| D8B | 40 | 144 | 1120 | 1 | 1-3 | 4-143 | 18 | 5616 | 8.5x |
