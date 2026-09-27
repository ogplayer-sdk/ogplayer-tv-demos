/*
 * OGPlayer smart-TV demo shell.
 *
 * Plain ES2018 in a classic script, on purpose: this file runs unchanged on
 * 2020 Samsung (Tizen 5.5 / Chromium 69) and LG (webOS 5 / Chromium 68) TVs,
 * so no optional chaining, no `??`, no class fields, no `catch {}` without a
 * binding, no import maps. The SDK is the `ogplayer/tv` bundle, exposed as
 * the `OGPlayerSDK` global by the <script> tag before this one.
 *
 * Two screens: a menu of scenarios (this shell's own D-pad handling) and the
 * player screen, where <og-player input="remote"> owns every key. Back with
 * the chrome down is NOT consumed by the SDK — it fires `og-back`, which
 * brings the menu back; Back on the menu exits the app.
 */
(function () {
  "use strict";
  var SDK = window.OGPlayerSDK;
  if (!SDK) { document.body.textContent = "OGPlayerSDK not loaded"; return; }

  // "tizen:<pkg>.<app>" / "webos:<id>" from the shell page; empty on desktop
  // (where the license binds to the hostname as usual).
  var APP_ID = document.documentElement.getAttribute("data-og-app-id") || "";

  var TOS = "https://media.ogplayer.tv/tos/master.m3u8";
  // Storyboard VTT: the remote's key-seek shows the preview above the bar.
  var TOS_STORYBOARD = "https://media.ogplayer.tv/tos/storyboard/storyboard.vtt";
  // Our own Big Buck Bunny ladder (180p, 360p, 720p, 1080p, 2160p; H.264; one
  // English audio track): the 4K / UHD scenario only — every other scenario
  // plays Tears of Steel. No storyboard exists for Bunny.
  var BBB_UHD = "https://media.ogplayer.tv/bbb/master.m3u8";
  // Short (~60 s) clip so the VMAP sample's mid/post cue points land sensibly.
  var TOS_CLIP_60 = "https://media.ogplayer.tv/tos-clip-60s.mp4";
  // The phone demo's three 14 s Tears of Steel clips (the playlist scenario).
  var SHORTS = "https://media.ogplayer.tv/shorts/v3/";
  var LIVE = "https://demo.unified-streaming.com/k8s/live/stable/live.isml/.m3u8";
  // Google's public VMAP sample: pre-roll, mid-roll, post-roll on the same tag.
  var VMAP_PRE_MID_POST = "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples" +
    "&sz=640x480&cust_params=sample_ar%3Dpremidpost&ciu_szs=300x250&gdfp_req=1&ad_rule=1" +
    "&output=vmap&unviewed_position_start=1&env=vp&impl=s&cmsid=496&vid=short_onecue&correlator=";
  // Public multi-DRM test vector (CMAF, cbcs, single key) + its published token.
  var AX_STREAM = "https://media.axprod.net/TestVectors/Cmaf/protected_1080p_h264_cbcs/manifest.m3u8";
  var AX_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJ2ZXJzaW9uIjogMSwKICAiY29tX2tleV9pZCI6ICI2OWU1NDA4OC1lOWUwLTQ1MzAtOGMxYS0xZWI2ZGNkMGQxNGUiLAogICJtZXNzYWdlIjogewogICAgInR5cGUiOiAiZW50aXRsZW1lbnRfbWVzc2FnZSIsCiAgICAidmVyc2lvbiI6IDIsCiAgICAibGljZW5zZSI6IHsKICAgICAgImFsbG93X3BlcnNpc3RlbmNlIjogdHJ1ZQogICAgfSwKICAgICJjb250ZW50X2tleXNfc291cmNlIjogewogICAgICAiaW5saW5lIjogWwogICAgICAgIHsKICAgICAgICAgICJpZCI6ICIzMDJmODBkZC00MTFlLTQ4ODYtYmNhNS1iYjFmODAxOGEwMjQiLAogICAgICAgICAgImVuY3J5cHRlZF9rZXkiOiAicm9LQWcwdDdKaTFpNDNmd3YremZ0UT09IiwKICAgICAgICAgICJ1c2FnZV9wb2xpY3kiOiAiUG9saWN5IEEiCiAgICAgICAgfQogICAgICBdCiAgICB9LAogICAgImNvbnRlbnRfa2V5X3VzYWdlX3BvbGljaWVzIjogWwogICAgICB7CiAgICAgICAgIm5hbWUiOiAiUG9saWN5IEEiLAogICAgICAgICJwbGF5cmVhZHkiOiB7CiAgICAgICAgICAibWluX2RldmljZV9zZWN1cml0eV9sZXZlbCI6IDE1MCwKICAgICAgICAgICJwbGF5X2VuYWJsZXJzIjogWwogICAgICAgICAgICAiNzg2NjI3RDgtQzJBNi00NEJFLThGODgtMDhBRTI1NUIwMUE3IgogICAgICAgICAgXQogICAgICAgIH0KICAgICAgfQogICAgXQogIH0KfQ._NfhLVY7S6k8TJDWPeMPhUawhympnrk6WAZHOVjER6M";
  var AX_HEADERS = { "X-AxDRM-Message": AX_TOKEN };
  // MPEG-DASH: Tears of Steel as on-demand DASH (a public test asset), and the
  // same public multi-DRM vector as the HLS row, DASH flavour. The DASH engine
  // is vendor/ogplayer.dash.global.js — index.html loads it before this file.
  var TOS_DASH = "https://storage.googleapis.com/wvmedia/clear/h264/tears/tears.mpd";
  var AX_STREAM_DASH = "https://media.axprod.net/TestVectors/Cmaf/protected_1080p_h264_cbcs/manifest.mpd";

  var ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 6.5 18 12 8.5 17.5Z"/></svg>';
  var ICON_LIVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="2.2"/><path d="M7.7 7.7a6 6 0 0 0 0 8.6M16.3 7.7a6 6 0 0 1 0 8.6M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/></svg>';
  var ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="9" rx="2"/><path d="M8 10.5V8a4 4 0 1 1 8 0v2.5"/></svg>';
  var ICON_CC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7.5 10.5h9M7.5 14.5h5"/></svg>';
  var ICON_SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6Z"/></svg>';
  var ICON_UHD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8" stroke-linecap="round"/><path d="M8.5 9.5v5M8.5 14.5h2.5M14 9.5h1.8a2.5 2.5 0 0 1 0 5H14z"/></svg>';
  var ICON_AD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 15.5 9.2 9h1.1l2.2 6.5M7.8 13.3h3.4M15 9v6.5h1.6a3.25 3.25 0 0 0 0-6.5z" stroke-linecap="round"/></svg>';
  var ICON_ACTIONS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3 2.6 5.5 6 .7-4.4 4.1 1.2 5.9L12 16.3l-5.4 2.9 1.2-5.9L3.4 9.2l6-.7z"/></svg>';
  var ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 21 20H3z"/><path d="M12 10v4.5M12 17.2v.3"/></svg>';
  // Monochrome host glyphs for the custom-action scenario (the chrome tints them).
  var ACTION_STAR = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>';
  var ACTION_SHARE = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>';
  var ICON_GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>';
  var ICON_LIST = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6.5h10M4 11h10M4 15.5h5"/><path d="M14.5 13.5 19.5 16.5l-5 3Z" fill="currentColor" stroke="none"/></svg>';

  // Every text the chrome shows or reads to screen readers, in Dutch — the
  // same map the phone and web demos hand their players (one key set on every
  // OGPlayer platform). The map lives in the app; the SDK ships English.
  var DUTCH = {
    play: "Afspelen", pause: "Pauzeren", replay: "Opnieuw afspelen",
    seekForward: "{seconds} seconden vooruit", seekBackward: "{seconds} seconden terug",
    next: "Volgende", previous: "Vorige", volume: "Volume", mute: "Dempen", unmute: "Dempen opheffen",
    enterFullscreen: "Volledig scherm", exitFullscreen: "Volledig scherm sluiten",
    seekBar: "Afspeelpositie", customAction: "Actie {n}",
    subtitles: "Ondertiteling", subtitlesOff: "Uit", audio: "Audio",
    playbackSpeed: "Afspeelsnelheid", speedNormal: "Normaal", speedValue: "{speed}\u00D7",
    quality: "Videokwaliteit", qualityAuto: "Automatisch", qualityHeight: "{height}p",
    qualityBitrate: "{kbps} kbps", qualityAdaptive: "adaptief", audioDefault: "Standaard",
    trackUnknown: "Onbekend", audioFallback: "Audio {n}", subtitlesFallback: "Ondertiteling {n}",
    audioChannels: "{name} \u00B7 {channels} kanalen",
    live: "LIVE", goLive: "Naar live",
    upNext: "Volgende over {seconds}", playNext: "Volgende afspelen: {title}", nextVideo: "volgende video",
    ad: "RECLAME", adPod: "{index} van {count}", learnMore: "Meer informatie",
    skipAd: "Advertentie overslaan", skipIn: "Overslaan over {seconds}",
    pauseAd: "Advertentie pauzeren", resumeAd: "Advertentie hervatten",
    adBlockedTitle: "Advertenties worden geblokkeerd",
    adBlockedText: "Deze video wordt aangeboden met advertenties, maar je adblocker houdt ze tegen.",
    adBlockedTextHard: "Deze video is alleen beschikbaar met advertenties. Schakel je adblocker uit en laad de pagina opnieuw.",
    adBlockedDismiss: "Begrepen", adBlockedReload: "Uitgeschakeld \u2014 opnieuw laden", dismiss: "Sluiten",
    errorGeneric: "Afspeelfout {code}", retry: "Opnieuw proberen",
    downloading: "Downloaden", downloadingItemsOne: "1 item downloaden", downloadingItems: "{count} items downloaden",
    cast: "Casten", castConnecting: "Verbinden met cast-apparaat", casting: "Bezig met casten",
    castConnectingStatus: "Verbinden\u2026", castingTo: "Casten naar {device}",
    airPlay: "AirPlay", airPlayTo: "AirPlay \u2014 {device}",
    pipPlaying: "Speelt af in beeld-in-beeld", sponsored: "Gesponsord"
  };

  // The first ten: same scenarios, order and titles as the Android TV demo
  // (MainTvActivity); the two DASH rows follow (Android TV plays DASH through
  // the same rows — here it is the web SDK's second engine), then the
  // localised chrome. `config` is the chrome config the scenario needs; every
  // other scenario runs the defaults.
  var SCENARIOS = [
    { id: "vod", icon: ICON_PLAY, title: "VOD playback", desc: "Adaptive HLS — D-pad chrome, OK, Back, key-driven scrub with storyboard preview.",
      load: function (p) { p.load({ url: TOS, title: "Tears of Steel", thumbnailTrackUrl: TOS_STORYBOARD }); } },
    { id: "live", icon: ICON_LIVE, title: "Live & DVR", desc: "Live edge chip, DVR window scrubbing, live gating of the chrome.",
      load: function (p) { p.load({ url: LIVE, title: "Live & DVR", streamType: "LIVE_DVR" }); } },
    { id: "drm", icon: ICON_LOCK, title: "Multi-DRM", desc: "HLS fMP4 with Widevine and PlayReady — the TV's CDM decides.",
      load: function (p) {
        p.load({ url: AX_STREAM, title: "Multi-DRM", drm: {
          widevine: { licenseUrl: "https://drm-widevine-licensing.axprod.net/AcquireLicense", headers: AX_HEADERS },
          playready: { licenseUrl: "https://drm-playready-licensing.axprod.net/AcquireLicense", headers: AX_HEADERS },
        } });
      } },
    // One audio track, no subtitles: the buttons that would open an empty menu are hidden.
    { id: "dash", icon: ICON_PLAY, title: "DASH VOD", desc: "MPEG-DASH on the same chrome — adaptive ladder, quality menu, key-driven scrub.",
      config: { showSubtitleButton: false, showAudioTrackButton: false },
      load: function (p) { p.load({ url: TOS_DASH, title: "Tears of Steel (DASH)" }); } },
    { id: "dashdrm", icon: ICON_LOCK, title: "DASH Multi-DRM", desc: "CMAF DASH with Widevine and PlayReady — the TV's CDM decides; three audio and subtitle tracks.",
      load: function (p) {
        p.load({ url: AX_STREAM_DASH, title: "Multi-DRM (DASH)", drm: {
          widevine: { licenseUrl: "https://drm-widevine-licensing.axprod.net/AcquireLicense", headers: AX_HEADERS },
          playready: { licenseUrl: "https://drm-playready-licensing.axprod.net/AcquireLicense", headers: AX_HEADERS },
        } });
      } },
    // The web bundle plays HLS, and the Big Buck Bunny ladder tops out at 2160p, so
    // the 4K check here is the rule that matters on a TV: the quality menu offers
    // 2160p even though a 4K panel reports a 1920×1080 CSS viewport (the TV
    // profile leaves capLevelToPlayerSize off).
    { id: "uhd", icon: ICON_UHD, title: "4K / UHD", desc: "Big Buck Bunny, 180p → 2160p — the quality menu must offer 2160p on a 4K panel (no viewport cap).",
      load: function (p) { p.load({ url: BBB_UHD, title: "Big Buck Bunny — 4K ladder" }); } },
    { id: "tracks", icon: ICON_CC, title: "Subtitles & audio", desc: "Sideloaded WebVTT and the manifest's audio tracks, ten-foot menus.",
      load: function (p) {
        p.load({ url: TOS, title: "Tears of Steel — sideloaded VTT", sideloadedSubtitles: [
          { url: "./subs/tears_of_steel_en.vtt", language: "en", label: "English", isDefault: true },
          { url: "./subs/tears_of_steel_de.vtt", language: "de", label: "Deutsch" },
          { url: "./subs/test_cue_settings.vtt", language: "en", label: "Positioned (line/position cues)" },
        ] });
      } },
    { id: "playlist", icon: ICON_LIST, title: "Playlist & up next", desc: "Three short clips; previous/next flank play/pause, the Up-next card is focusable — OK skips ahead.",
      load: function (p) {
        p.loadPlaylist([
          { url: SHORTS + "w169-01.mp4", title: "The old church", posterUrl: SHORTS + "w169-01.jpg" },
          { url: SHORTS + "w169-02.mp4", title: "Crossing the bridge", posterUrl: SHORTS + "w169-02.jpg" },
          { url: SHORTS + "w169-03.mp4", title: "The machine waits", posterUrl: SHORTS + "w169-03.jpg" },
        ]);
      } },
    // Progressive MP4 content: one audio track, no text tracks, no ladder — the
    // buttons that would open an empty menu are hidden (the same rule the phone
    // ads demo applies).
    { id: "ads", icon: ICON_AD, title: "Ads (IMA)", desc: "Showcase — Google's IMA HTML5 SDK has no official Samsung/LG support; the ad UI is Google's, at browser size. Pre/mid/post-roll VMAP on the TV chrome; OK drives the ad, Right steps into the ad's own UI, Back steps out.",
      config: { showSubtitleButton: false, showAudioTrackButton: false, showQualityButton: false },
      // Watched ads don't replay for the same video + tag within one player
      // instance (SDK contract, all platforms). The native TV demos get a fresh
      // player per scenario; this shell keeps one for the whole app, so each
      // open varies the tag with a fresh correlator = a new ad session (the
      // ads guide's recommended way; Google wants a unique correlator anyway).
      load: function (p) { p.load({ url: TOS_CLIP_60, title: "Ads on TV", adBreaks: { adTagUri: VMAP_PRE_MID_POST + Date.now() } }); } },
    { id: "nicam", icon: ICON_SHIELD, title: "Content ratings", desc: "Kijkwijzer age + descriptor icons at program start.",
      load: function (p) {
        p.load({ url: TOS, title: "Content ratings", contentRatings: [
          { age: "TWELVE" }, { descriptor: "VIOLENCE" }, { descriptor: "FEAR" },
        ] });
      } },
    { id: "customactions", icon: ICON_ACTIONS, title: "Custom action icons", desc: "Host icons in the chrome, reachable with the D-pad.",
      config: { customActions: [
        { svg: ACTION_STAR, accessibilityLabel: "Custom action 1", onClick: function () { log("custom action 1"); } },
        { svg: ACTION_SHARE, accessibilityLabel: "Custom action 2", onClick: function () { log("custom action 2"); } },
      ] },
      load: function (p) { p.load({ url: TOS, title: "Custom action icons", thumbnailTrackUrl: TOS_STORYBOARD }); } },
    { id: "errormessages", icon: ICON_WARN, title: "Error overlay", desc: "A dead stream: the Retry button takes focus.",
      load: function (p) { p.load({ url: "https://media.ogplayer.tv/does-not-exist/master.m3u8", title: "Error" }); } },
    { id: "localised", icon: ICON_GLOBE, title: "Localised chrome (nl)", desc: "One Dutch strings map relabels the whole chrome — menus, buttons, screen-reader labels.",
      config: { strings: DUTCH, locale: "nl" },
      load: function (p) { p.load({ url: TOS, title: "Tears of Steel", thumbnailTrackUrl: TOS_STORYBOARD }); } },
  ];

  // ── DOM ───────────────────────────────────────────────────────────────
  var menu = document.createElement("div");
  menu.id = "menu";
  menu.setAttribute("data-testid", "tv_menu");
  var rowsHtml = "";
  for (var i = 0; i < SCENARIOS.length; i++) {
    var sc = SCENARIOS[i];
    rowsHtml += '<div class="row" data-testid="tv_row_' + sc.id + '" data-index="' + i + '">' +
      '<span class="tile">' + sc.icon + '</span>' +
      '<span class="rt"><div class="t">' + sc.title + '</div><div class="d">' + sc.desc + '</div></span></div>';
  }
  menu.innerHTML =
    '<div class="brand"><span class="og">OG</span>Player <span style="font-weight:400;opacity:.6">TV</span></div>' +
    '<div class="sub">web SDK on a TV browser — remote-control chrome</div>' +
    '<div class="rows">' + rowsHtml + '</div>' +
    '<div class="hint"><b>▲ ▼</b> choose &nbsp; <b>OK</b> open &nbsp; <b>Back</b> exit &nbsp; <b>Yellow</b> event log</div>' +
    '<div class="status" data-testid="tv_status"></div>';

  var stage = document.createElement("div");
  stage.id = "stage";
  stage.hidden = true;
  var el = document.createElement("og-player");
  el.id = "pl";
  el.setAttribute("input", "remote");
  stage.appendChild(el);

  var logEl = document.createElement("div");
  logEl.id = "log";
  logEl.hidden = true;
  logEl.setAttribute("data-testid", "tv_log");

  document.body.appendChild(menu);
  document.body.appendChild(stage);
  document.body.appendChild(logEl);

  // ── Log ───────────────────────────────────────────────────────────────
  var lines = [];
  function log(line) {
    var t = new Date();
    function p2(n) { return (n < 10 ? "0" : "") + n; }
    lines.push(p2(t.getHours()) + ":" + p2(t.getMinutes()) + ":" + p2(t.getSeconds()) + "  " + line);
    if (lines.length > 200) lines.shift();          // 200 kept; the overlay shows the tail that fits
    logEl.textContent = lines.slice(-24).join("\n");
  }
  window.addEventListener("error", function (e) { log("console error: " + e.message); });

  // ── Player ────────────────────────────────────────────────────────────
  var opts = { platformProfile: "tv" };
  if (APP_ID) opts.licenseAppId = APP_ID;
  var player = new SDK.OGPlayer(opts);
  // Google IMA: the SDK script loads from Google at the first ad request, so
  // the provider costs nothing until the ads scenario runs.
  if (SDK.ImaAdsProvider) player.adsProvider = new SDK.ImaAdsProvider();
  el.player = player;
  // The same callbacks the web demo pages log (assets/demo.js attachEventLogging
  // + the playlist page), same names, same one-line format — his ask, 2026-09-24.
  function secs(ms) { return Math.round(ms / 1000); }
  player.addListener({
    onStateChanged: function (s) { log("onStateChanged: " + s); },
    onPlay: function () { log("onPlay"); },
    onPause: function () { log("onPause"); },
    onResume: function () { log("onResume"); },
    onIsPlayingChanged: function (p) { log("onIsPlayingChanged: " + p); },
    onSeekStarted: function (f, to) { log("onSeekStarted: " + secs(f) + "s -> " + secs(to) + "s"); },
    onSeekCompleted: function (pos) { log("onSeekCompleted: " + secs(pos) + "s"); },
    onPlaybackCompleted: function () { log("onPlaybackCompleted"); },
    onLiveEdgeChanged: function (edge) { log("onLiveEdgeChanged: " + edge); },
    onDrmSessionRenewed: function (why) { log("onDrmSessionRenewed: " + why); },
    onPlaylistItemChanged: function (index, item) { log("onPlaylistItemChanged: #" + index + " · " + (item && item.title)); },
    onPlaylistItemSkipped: function (from, to) { log("onPlaylistItemSkipped: #" + from + " → #" + to); },
    onError: function (e) { log("onError: " + e.codeName + " (" + e.code + ") " + e.message); },
  });
  // An ad break pauses the content on purpose; the self-diagnosis below must
  // not read that as "it stopped on its own".
  var adBreakActive = false, adBreakEndedAt = 0;
  player.addAdListener({
    onAdBreakStarted: function (t, n) { adBreakActive = true; log("onAdBreakStarted: " + t + " (" + n + " ads)"); },
    onAdStarted: function (ad) { log("onAdStarted: " + ad.adId + " pod " + ad.positionInPod + "/" + ad.podSize + " skippable=" + ad.isSkippable +
      (ad.advertiser ? " advertiser=\"" + ad.advertiser + "\"" : "") + (ad.title ? " title=\"" + ad.title + "\"" : "") + (ad.adSystem ? " system=" + ad.adSystem : "")); },
    onAdSkipped: function (ad) { log("onAdSkipped: " + ad.adId); },
    onAdCompleted: function (ad) { log("onAdCompleted: " + ad.adId); },
    onAdBreakCompleted: function (t) { adBreakActive = false; adBreakEndedAt = Date.now(); log("onAdBreakCompleted: " + t); },
    onAdPaused: function (ad) { log("onAdPaused: " + ad.adId); },
    onAdResumed: function (ad) { log("onAdResumed: " + ad.adId); },
    onAdError: function (e) { log("onAdError: " + e.code + " " + e.phase + " " + e.message); },
  });
  // Every analytics event in the native SDKs' shape — Type(field=value, …) —
  // exactly as the web demo pages print it (session stamps left out).
  function fmtValue(v) {
    if (v && typeof v === "object") {
      if (v.codeName) return (v.codeName + "(" + v.code + ") " + (v.message || "")).replace(/\s+$/, "");
      try { return JSON.stringify(v); } catch (err) { return String(v); }
    }
    return String(v);
  }
  player.addAnalyticsListener(function (e) {
    var parts = [];
    for (var k in e) {
      if (!Object.prototype.hasOwnProperty.call(e, k)) continue;
      if (k === "type" || k === "sessionId" || k === "assetUrl" || e[k] === undefined) continue;
      parts.push(k + "=" + fmtValue(e[k]));
    }
    log("analytics: " + e.type + (parts.length ? "(" + parts.join(", ") + ")" : ""));
  });
  player.onLicenseChanged(function (licensed) {
    log("onLicenseChanged: " + (licensed ? "licensed" : "unlicensed (watermark)"));
    var st = menu.querySelector(".status");
    st.textContent = (licensed ? "licensed" : "unlicensed (watermark)") +
      (APP_ID ? " · " + APP_ID : " · " + location.hostname) + " · SDK " + SDK.OGPLAYER_VERSION;
  });

  // ── Menu screen ───────────────────────────────────────────────────────
  var rows = menu.querySelectorAll(".row");
  var selected = 0;
  var screen = "menu";
  // Least-movement scroll: the focused row is brought inside the visible box of
  // .rows (the SDK's remote menu rule, copied — plain scrollTop arithmetic, no
  // scrollIntoView so the page itself never jumps on Chromium 68/69).
  var rowsEl = menu.querySelector(".rows");
  function keepRowVisible(row) {
    if (!rowsEl || !row) return;
    var pad = 8; // the focused row grows 2 % and carries a 3 px halo
    var top = row.offsetTop - pad, bottom = row.offsetTop + row.offsetHeight + pad;
    var view = rowsEl.clientHeight, cur = rowsEl.scrollTop, next = cur;
    if (top < cur) next = top; else if (bottom > cur + view) next = bottom - view;
    if (next < 0) next = 0;
    if (next !== cur) rowsEl.scrollTop = next;
  }
  function paintMenu() {
    for (var i = 0; i < rows.length; i++) rows[i].classList.toggle("focused", i === selected);
    keepRowVisible(rows[selected]);
  }
  paintMenu();

  function showMenu() {
    screen = "menu";
    // Leaving the player screen ends the item, ad break included: unload()
    // (1.4.0) tears the ad session down — a pause() only held the current
    // creative and the next one played on behind the launcher ("the ad plays
    // even if I am out of that demo", 2026-09-24). Reopening loads afresh.
    player.unload();
    log("unload: left the player screen");
    stage.hidden = true;
    menu.hidden = false;
    paintMenu();
    menu.setAttribute("tabindex", "-1");
    menu.focus();
  }
  function openScenario(i) {
    log("— loading " + (SCENARIOS[i] && SCENARIOS[i].title ? SCENARIOS[i].title : "scenario " + i) + " —");
    screen = "player";
    selected = i;
    menu.hidden = true;
    stage.hidden = false;
    log("— " + SCENARIOS[i].title + " —");
    // The chrome config is whole-object: a partial resets everything else to
    // the defaults, so the remote input mode travels with every scenario.
    el.config = Object.assign({ inputMode: "remote" }, SCENARIOS[i].config || {});
    SCENARIOS[i].load(player);
    el.focus(); // remote mode: lands on the stage, keys reach the chrome now
  }
  function exitApp() {
    log("exit");
    try { if (window.tizen && tizen.application) { tizen.application.getCurrentApplication().exit(); return; } } catch (e) { /* not tizen */ }
    // LG: webOS.platformBack() lives in LG's webOSTV.js, which this demo does
    // not ship — `window.webOS` is normally undefined here and the line below
    // is what runs on the set: history.back() with history, else window.close().
    // The LG run verifies the window.close() path before anything relies on it.
    try { if (window.webOS && webOS.platformBack) { webOS.platformBack(); return; } } catch (e) { /* not webos */ }
    if (window.history.length > 1) history.back(); else window.close();
  }

  // The Back press that closes the player screen fires og-back synchronously
  // (inside the SDK's keydown handler) and THEN bubbles here — by which time
  // the menu is showing. Without this latch one press would both close the
  // player and exit the app.
  var swallowNextBack = false;
  // The event log is a surface of its own: while it is up, Back closes it and
  // nothing else. Claimed in the capture phase, before the key reaches the
  // player's stage handler (which never looks at defaultPrevented) or the
  // launcher handler below; the closing press's auto-repeats are ours too,
  // so a held Back cannot close the log AND leave the player. Yellow still
  // toggles the log (the bubble handler below), and the trace line stays.
  var backClosedLog = false;
  document.addEventListener("keydown", function (e) {
    var action = SDK.remoteActionFor(e);
    if (action !== "back") return;
    if (!e.repeat) backClosedLog = false;
    if (logEl.hidden && !backClosedLog) return;
    log("key " + e.keyCode + " " + (e.key || "?") + " → back " + (backClosedLog ? "rep, held after closing the log" : "closes the log") + " @" + screen);
    logEl.hidden = true;
    backClosedLog = true;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  document.addEventListener("keydown", function (e) {
    var action = SDK.remoteActionFor(e);
    var swallow = swallowNextBack;
    swallowNextBack = false;
    // Key trace (Yellow shows it): what the remote really sent and who claimed it.
    if (action === "back" || action === "ok") {
      log("key " + e.keyCode + " " + (e.key || "?") + " → " + action + (e.repeat ? " rep" : "") +
        (e.defaultPrevented ? " claimed" : " UNCLAIMED") + (swallow ? " latch" : "") + " @" + screen);
    }
    if (!action) return;
    // The key that closed the player screen is ours: claim it, or the platform
    // may run its own default for an unhandled Return (Tizen: close the app).
    if (action === "back" && swallow) { e.preventDefault(); return; }
    // A held Back auto-repeats; only the first press counts on the launcher.
    if (action === "back" && e.repeat) { e.preventDefault(); return; }
    // Yellow toggles the log on either screen; the SDK never consumes colour keys.
    if (action === "yellow") { logEl.hidden = !logEl.hidden; e.preventDefault(); return; }
    // Player screen, Back still unclaimed: the SDK claims every Back it owns
    // (chrome down → og-back, menu/overlay → close), so this is a press it
    // never saw — claim it anyway, or Tizen runs its default for an unhandled
    // Return and closes the app.
    if (action === "back" && screen === "player" && !e.defaultPrevented) {
      log("  → stray back claimed by the shell @player");
      e.preventDefault();
      return;
    }
    if (screen !== "menu") return; // the player owns its keys; Back arrives as og-back
    if (action === "up") { selected = Math.max(0, selected - 1); paintMenu(); e.preventDefault(); }
    else if (action === "down") { selected = Math.min(rows.length - 1, selected + 1); paintMenu(); e.preventDefault(); }
    else if (action === "ok") { openScenario(selected); e.preventDefault(); }
    else if (action === "back") { exitApp(); e.preventDefault(); }
  });
  // Magic Remote / mouse: rows are clickable too.
  for (var r = 0; r < rows.length; r++) {
    (function (idx) { rows[idx].addEventListener("click", function () { openScenario(idx); }); })(r);
  }
  // Back with the chrome down → leave the player screen.
  el.addEventListener("og-back", function () {
    log("og-back @" + screen);
    if (screen !== "player") return;
    swallowNextBack = true;
    showMenu();
  });

  // TV standby / app switch: never keep decoding in the background.
  document.addEventListener("visibilitychange", function () {
    log("visibility: " + document.visibilityState + " playing=" + player.isPlaying);
    if (document.hidden && player.isPlaying) { player.pause(); log("paused: page hidden"); }
  });

  // ── Self-diagnosis (lab TVs offer no inspector) ──────────────────────
  // Every pause()/play() on the media element is logged with the caller's
  // stack; a pause that no remote key preceded within 1.5 s pops the log up
  // by itself, so "it stops on its own" can be read off the screen.
  var lastKeyAt = 0;
  document.addEventListener("keydown", function () { lastKeyAt = Date.now(); }, true);
  (function () {
    var P = window.HTMLMediaElement && HTMLMediaElement.prototype;
    if (!P || P.__ogDiag) return;
    P.__ogDiag = true;
    var origPause = P.pause, origPlay = P.play;
    P.pause = function () {
      var sinceKey = Date.now() - lastKeyAt;
      // Pauses the ads machinery makes (preroll hold, break start, the resume
      // dance after a break) are expected: logged, never popped up.
      var adsBusy = player.adsPending || player.isPlayingAd || adBreakActive || (Date.now() - adBreakEndedAt < 1500);
      var unprompted = sinceKey > 1500 && !adsBusy;
      log("pause() " + (unprompted ? "UNPROMPTED " : adsBusy ? "(ad break) " : "") + "t=" + Math.round(this.currentTime * 10) / 10 + " rs=" + this.readyState);
      if (unprompted) logEl.hidden = false;
      return origPause.apply(this, arguments);
    };
    P.play = function () { log("play() t=" + Math.round(this.currentTime * 10) / 10); return origPlay.apply(this, arguments); };
    ["waiting", "stalled", "suspend", "abort", "emptied", "error"].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        if (e.target && e.target.tagName === "VIDEO") log("media " + ev + " t=" + Math.round(e.target.currentTime * 10) / 10 + " rs=" + e.target.readyState + " ns=" + e.target.networkState + (e.target.error ? " err=" + e.target.error.code : ""));
      }, true);
    });
  })();

  // Samsung: media and colour keys are only delivered after registration.
  try {
    if (window.tizen && tizen.tvinputdevice) {
      tizen.tvinputdevice.registerKeyBatch(SDK.TIZEN_REGISTER_KEYS.slice());
      log("tizen: keys registered");
    }
  } catch (e) { log("tizen: registerKeyBatch failed: " + e.message); }

  menu.setAttribute("tabindex", "-1");
  menu.focus();
  log("ready · " + (APP_ID || location.hostname));
})();
