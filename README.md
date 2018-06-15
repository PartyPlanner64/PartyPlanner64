# ![PartyPlanner64](http://i.imgur.com/ygEasfG.png)

> Mario Party N64 board editor

PartyPlanner64 allows players to create and import customized boards into a Mario Party N64 ROM for playback in emulators or on real hardware.

## Getting Started

PartyPlanner64 is web-based so installation is not needed. A [running copy](http://partyplanner64.github.io/PartyPlanner64) is hosted from this repository. Chrome and Firefox are the supported browsers for this project.

It is highly recommended to read [**this**](https://github.com/PartyPlanner64/PartyPlanner64/wiki/Creating-a-Board) before creating a board with . This documentation highlights some common mistakes made while using PartyPlanner64.

The [wiki](https://github.com/PartyPlanner64/PartyPlanner64/wiki) has additional information about the editor, as well as technical documentation on the game itself.

## Limitations

A ROM is not required to create and edit boards with PartyPlanner64, however to play them you will need to open a Mario Party ROM file. Only the NTSC USA files are supported.

* `Mario Party (U).z64` ROM file (MD5 `8BC2712139FBF0C56C8EA835802C52DC`).
* `Mario Party 2 (U).z64` ROM file (MD5 `04840612A35ECE222AFDB2DFBF926409`).
* `Mario Party 3 (U).z64` ROM file (MD5 `76A8BBC81BC2060EC99C9645867237CC`).

ROMs edited with PP64 are also supported by PartyPlanner64.

ROM files must be ran with Expansion Pak on hardware, emulators must be configured to use 8MB RAM or the game will crash.

### Emulators

These emulators are reported to work:

* Project64 2.3
* Mupen64plus
* Nemu64

This emulator has issues, even with the right setup (8MB RAM):

* Project64 1.6

See the [emulator setup](https://github.com/PartyPlanner64/PartyPlanner64/wiki/Emulator-Setup) page for details on configuring each emulator.

## Building

To host a local copy of PartyPlanner64 clone the repository and do the following.

* Install Node.js and a package manager (npm or yarn).
* Retrieve the dependencies for the editor and development.
    * `npm install --dev`
    
      or
    * `yarn install`
* `gulp` to copy the site in `dist/`.
    * `gulp prod` will build a minified production copy. The production build uses CDN assets when possible.
* Open `index.html` from `dist/` to use the editor.

Before making changes, you can start `gulp watch` to monitor for file changes.

With Chrome, you may need to run the `chrome` executable with the `--allow-file-access-from-files` flag to avoid cross domain permission issues related to working with local image files and Data URIs.

## Contributors

 Pull requests and other contributions are greatly appreciated.

## [FAQ](https://github.com/PartyPlanner64/PartyPlanner64/wiki/FAQ)

## License

Code in this repository is released into the public domain, with the exception of included third party libraries with separate licenses.
