# Bubble Bobble · Neon Caverns

## 1. Direction and references
A modern, playable fan reinterpretation of the 1986 arcade game. Reference: https://www.arcadequartermaster.com/bubbob_bosses.html (platform geometry, 100 rounds); gameplay references: StrategyWiki Bubble Bobble/Gameplay. This is not a clone of the reference website. Dark botanical caverns, translucent soap bubbles and softly lit toy-like dragons; warm ivory typography with mint action controls. Game art is procedural Canvas, never reference screenshots.

## 2. Tokens
Background #0b1518, panel #122226, raised #1b3033, muted #9bb0ae, text #edf5e9, accent #b8f58b, teal #4bd8bb, coral #faab9e, gold #ffdd85. Cavern themes cycle emerald, lagoon, violet, sunset, ice. Spacing 4/8/12/16/24/32/48/64. Radii 8/16/24/32; borders white 10%; soft black shadow and inset white highlight. Font: system sans, rounded display fallback; tabular monospace numbers. Type sizes 11/12/14/16/24/36/64.

## 3. Layout
Document owns scroll. Max width 1400, 36px desktop gutters. Top brand and utility actions. Heading, then large arcade canvas with HUD and a 260px sidebar. Below: keyboard legend and source credit. Canvas fixed 768×672 logical resolution, responsive intrinsic aspect ratio. At 1000px sidebar becomes a bottom row; at 600px compact header and touch controls. No horizontal overflow.

## 4. Material and motion
Layered cavern silhouettes, vignette, moss-covered bevelled tiles. Dragons have gradient bodies, white bellies, directional eyes, spines, feet, idle breathing and running steps. Bubbles have spectral rims, refraction-like translucent fill and curved highlights. Particles communicate capture, pop, hit and clear. Reduced motion suppresses decorative particles and camera movement. Game timing fixed at 60Hz; pause on blur.

## 5. Primitives and states
Button (primary mint / secondary translucent): default, hover wash, pressed translation, visible focus, disabled opacity. Icon button with text alternative. HUD metric with tabular numbers. Mode segmented control with filled selected state. Dialog using native dialog, close button, keyboard focus trapping. Round tile with miniature live platform layout, selected fill. Canvas overlay for ready, paused, game over, victory. Keyboard keycap. Status pill. Components share CSS tokens.

## 6. Accessibility
Korean instructions, semantic controls, descriptive canvas fallback, keyboard play and navigation, sound opt-in toggle, reduced motion, visible focus. Touch buttons support pointer capture and cancellation. Gameplay is spatial and visual; no claim of nonvisual gameplay support. Persistent storage gracefully falls back if denied.

## 7. Gameplay
100 extracted platform layouts, normal rounds with walking and flying enemies, bubble capture and contact or nearby X pop, fruits, chain points, 3 lives per player, local co-op, final boss lightning projectiles and health. Stage selection is a practice feature. Original enemy rosters, secrets, exact physics, music and full original behavior are not claimed as exact emulation.

## Audio
Original 138 BPM swung chip-tune loop, 16 bars in C major: square-wave lead, triangle bass and offbeat triad accompaniment. Sound remains opt-in; existing sound button controls both music and effects. Music follows playing state, pauses on blur and dialogs, stops on game over/victory, and restarts on a new game. Web Audio synthesis keeps offline playback self-contained.

## 8. Validation
Check start, pause/resume, keyboard movement/jump/shoot/pop, restart, stage selector, co-op, boss, game over/victory, localStorage fallback, responsive bounds, console errors. Record browser screenshots and meaningful gameplay tests in evidence/. No external runtime resources or build step required.

## Mobile play layout
At widths <=850px or coarse-pointer devices <=1100px, show a compact game-first shell. Move settings into a native modal, preserve all desktop settings. Keep arena and two thumb control groups inside the machine, including fullscreen. Portrait: controls immediately below arena; landscape: movement left, actions right. Use dynamic viewport height and safe-area insets. Controls min44px, main actions52px, 8px gaps; mint action fill, pressed tonal fill. Support simultaneous pointers, cancel/blur release and down-platform input. Keep browser zoom enabled; suppress gesture scrolling only on game/control surfaces. No sticky controls covering the arena.
