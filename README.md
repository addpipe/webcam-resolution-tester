A simple html/js tool that allows you to scan the resolutions and framerates supported by your browsers and webcam.

## Live Version

A live working version of this tool is available at https://addpipe.com/webcam-resolution-tester/ .

## Key Features:

1. can scan all your webcams or front/back cameras in one go
2. works as expected on mobile devices with their multiple cameras
3. detects maximum fps supported by the webcam per each resolution
4. can scan using both `ideal` (recommended) and `exact` video constraints
5. results can be exported or copied as csv, markdown, json or xml
6. scan results table includes camera name and browser; export filename contains camera name
7. prints out the `getCapabilities()` information for the video track
8. works on all secure contexts (including `file://`)
9. relies on `video.videoWidth` and `video.videoHeight` for width and height, not on `track.getSettings()` (it matters on mobile devices where the device will respond with a portrait video when held in portrait mode)
10. marks a resolution as *failed* with `OverconstrainedError` only when that error is thrown (when requesting `exact` resolutions)
11. new button to release the webcam when you're done scanning


## License

This project is licensed under the AGPL-3.0 License. See the [LICENSE](LICENSE) file for details.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
