# OGPlayer — smart-TV demos

The OGPlayer remote-control demo shell packaged for **Samsung Tizen** (2020 and
newer models, Tizen 5.5, Chromium 69) and **LG webOS** (2020 and newer, webOS 5,
Chromium 68). It runs the [OGPlayer web SDK](https://ogplayer.tv)'s TV bundle
(`ogplayer/tv`) — the same API as the browser bundle, compiled for the engines
those sets are frozen at, with the remote-control chrome
(`<og-player input="remote">`).

One shared shell (`shared/app.js`, plain ES2018 loaded through classic
`<script>` tags — TV packages are self-contained, no `node_modules`, no import
maps), one manifest per platform.

## What the shell shows

- `<og-player input="remote">` — D-pad focus, OK, Back, media keys, key-driven
  scrubbing with storyboard preview, quality / audio / subtitle menus,
  previous/next around play/pause.
- `new OGPlayer({ platformProfile: "tv" })` — the TV buffer profile.
- `og-back` — the element's event when Back arrives with the chrome down; the
  shell returns to its menu, and Back on the menu exits the app.
- Thirteen scenarios: VOD, Live & DVR, Multi-DRM, 4K / UHD, Subtitles & audio,
  Playlist & up next, Ads (Google IMA, with the remote stepping into the ad's
  own UI), Content ratings, Custom action icons, Error overlay, DASH VOD,
  DASH Multi-DRM (Widevine / PlayReady) and Localised chrome (nl).
- MPEG-DASH: the SDK's DASH engine is a separate file,
  `ogplayer.dash.global.js`, loaded by a second `<script>` tag — an app that
  plays only HLS leaves it out.
- **Yellow** toggles the on-screen event log: every SDK callback with a
  timestamp (the last lines that fit are shown, two hundred are kept). On a set
  this is where to look first when something differs from the browser — and a
  photo of it is the best thing to attach to a report. The SDK never consumes
  the colour keys.

## Stage

```sh
npm install        # pulls the SDK, incl. the TV bundle and the DASH engine (1.6.0+)
npm run stage      # copies shell + bundle + DASH engine + subtitle fixtures into tizen/ and webos/
```

## Samsung Tizen (Tizen Studio CLI)

```sh
# once, on the TV: Apps → scroll to the end of the installed-apps row → gear →
# type 1-2-3-4-5 → Developer mode ON, Host PC IP = your computer → restart the TV
sdb connect <tv-ip>:26101
sdb devices                                        # serial = <tv-ip>:26101
sdb shell 0 getduid                                # the DUID your Samsung distributor certificate must list
# once: Tizen Studio → Certificate Manager → Samsung profile (author + distributor with that DUID)
cd tizen
rm -rf .buildResult *.wgt                          # never package with a previous build nested inside
tizen package -t wgt -s <profile-name> -- .        # → "OGPlayer TV demo.wgt"
sdb -s <tv-ip>:26101 push "OGPlayer TV demo.wgt" /home/owner/share/tmp/sdk_tools/tmp/OGPlayerTVdemo.wgt
sdb -s <tv-ip>:26101 shell 0 vd_appinstall ABCDEFGHIJ.OGPlayerDemo /home/owner/share/tmp/sdk_tools/tmp/OGPlayerTVdemo.wgt
sdb -s <tv-ip>:26101 shell 0 was_execute ABCDEFGHIJ.OGPlayerDemo
```

`tizen/config.xml`: change `ABCDEFGHIJ` to your own 10-character package id
once and keep it. A retail Samsung only installs packages signed with a
**Samsung** distributor certificate that lists the TV's DUID; the generic Tizen
certificate works on the emulator only. Inspect with
`sdb shell 0 debug ABCDEFGHIJ.OGPlayerDemo`, forward the printed port and
attach a Chromium of the TV's generation (or any CDP client).

## LG webOS (webOS CLI)

```sh
# once: Developer Mode app on the TV, then
ares-setup-device                                  # add the TV (name it "tv")
ares-package webos -o build
ares-install -d tv build/tv.ogplayer.demo_1.6.0_all.ipk
ares-launch -d tv tv.ogplayer.demo
ares-inspect -d tv --app tv.ogplayer.demo --open   # Web Inspector
```

`webos/appinfo.json` sets `disableBackHistoryAPI: true`, so Back reaches the
page as keyCode 461 instead of navigating history. Exit: Back on the menu calls
`webOS.platformBack()` when LG's `webOSTV.js` is loaded (this demo does not
ship it), else `window.close()`.

## Notes

- `tv.html` + `npm start` (port 8125) is the **test harness**: the same shell in
  a desktop browser, driven by the automated suite with the keyboard. It is not
  a demo — the TV demos are the packaged apps above.
- **Licensing:** this demo code is MIT. The OGPlayer SDK itself is a
  commercial product — free to evaluate with a watermark; production use
  requires a license. See https://ogplayer.tv/terms/
- **Read-only repository:** issues and pull requests are closed — questions
  and reports are welcome at hello@ogplayer.tv.

Docs: https://ogplayer.tv/docs/getting-started/smart-tv/ · Demo content:
Tears of Steel — (CC) Blender Foundation · mango.blender.org; Big Buck Bunny —
(CC) Blender Foundation.
