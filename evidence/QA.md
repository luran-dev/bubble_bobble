# Verification report

- 23 checks passed in Chromium: see qa-results.json and qa-run.log.
- Browser interactions cover start, movement, jump, shooting, pause/resume, co-op, help, stage selection, sound and restart.
- Deterministic isolated game simulation covers capture, popping, scoring, fruit creation, escape, stage progression preserving lives/score, nonzero-score reset, death and boss victory.
- Direct file:// launch and start passed; no runtime server or external assets required.
- Actual 1440×900 desktop and 390×844 mobile (DPR3) screenshots captured; mobile width asserted and horizontal overflow checked. Theme is intentionally dark. Mobile emulation must be applied after navigation; initial stale emulation captures were replaced.
- Patterned tiles on rounds 4,37,38 were repaired after independent review. All 100 map shapes compared using contact sheets; re-review of final maps approved in ../.omo/evidence/bubble-bobble-code-review.md.
- CJK headings, dialogs and controls inspected. Graphical play is not accessible nonvisually; no broader accessibility certification claimed.
- Original layouts are interpreted as one-way platforms with a safety floor. This is not cycle-accurate emulation. Original enemy rosters, secret rooms and every original mechanic are out of scope for this recreation.
- Not performed: complete human playthrough of all100 rounds, Lighthouse scoring, all-browser certification. No such scores or claims are made.

## Background music update
Five additional browser checks cover synthesized-note scheduling, pause stopping timers/voices, resume, mute/unmute, and window-blur auto-pause. Music uses a new original 16-bar chip-tune loop; no remote audio or original recording is required.

## Mobile controls update
- Five real Chromium touch-emulated viewports: 390×844, 375×667, 844×390, 932×430, 568×320.
- Asserted all six controls and arena within viewport, no overlap/overflow, 44px minimum targets and preserved arena aspect ratio.
- CDP multi-touch input verified simultaneous movement, jump and shooting; release/cancel clears input and movement stops.
- Settings pauses gameplay; stage selection closes both dialogs and starts chosen round. Sidebar returns on desktop breakpoint.
- Native fullscreen tested with visible controls; desktop gameplay regression retains 23 passing checks.
- Fresh screenshots and results: mobile-qa.json, mobile-qa.log, mobile-*x*-*.png, mobile-fullscreen.png.
- Independent review approved after fixing default button background at 932px coarse-pointer width: ../.omo/evidence/mobile-controls-code-review.md.
- Real iOS/Android hardware and Safari fullscreen behavior were not tested; default layout does not require fullscreen support.
