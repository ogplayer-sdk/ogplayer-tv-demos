// Stages the self-contained Tizen and webOS app folders:
//   npm install && npm run stage
// copies the shared shell (app.js, tv.css), the subtitle fixtures, the
// SDK's TV bundle and its DASH engine (ogplayer.dash.global.js — the DASH
// rows need it) into tizen/ and webos/, next to each platform's manifest
// and index.html. TV packages must be self-contained — no node_modules, no
// import maps — which is why the shell is plain ES2018 loaded through
// classic <script> tags.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const bundle = join(here, "node_modules/ogplayer/dist/ogplayer.tv.global.js");
if (!existsSync(bundle)) {
  console.error("ogplayer.tv.global.js not found — run `npm install` first (SDK 1.5.0+).");
  process.exit(1);
}

const dashEngine = join(here, "node_modules/ogplayer/dist/ogplayer.dash.global.js");

const files = [
  [join(here, "shared/app.js"), "app.js"],
  [join(here, "shared/tv.css"), "tv.css"],
  [bundle, "vendor/ogplayer.tv.global.js"],
  [join(here, "subs/tears_of_steel_en.vtt"), "subs/tears_of_steel_en.vtt"],
  [join(here, "subs/tears_of_steel_de.vtt"), "subs/tears_of_steel_de.vtt"],
  [join(here, "subs/test_cue_settings.vtt"), "subs/test_cue_settings.vtt"],
];
if (existsSync(dashEngine)) files.push([dashEngine, "vendor/ogplayer.dash.global.js"]);
else console.warn("ogplayer.dash.global.js not in the installed SDK — the DASH rows will report a missing engine.");

for (const platform of ["tizen", "webos"]) {
  for (const [src, rel] of files) {
    const dst = join(here, platform, rel);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
  }
  console.log(`staged ${platform}/ (${files.length} files)`);
}
