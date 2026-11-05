# دوپپا · Doppa

[تور بەت / Live site](https://uyghurcommunity.github.io/doppa/) · [UyghurCommunity](https://github.com/UyghurCommunity) · [Developer hub](https://uyghurcommunity.github.io/)

ئۇيغۇر دوپپا كەشتىسى ۋە ئەتلەس رەڭلىرىدىن ئىلھاملانغان جانلىق تور بەت. تەسەۋۋۇر خەت نۇسخىسى ۋە ئوڭدىن سولغا ماسلاشقان كۆرۈنمە يۈز بىلەن ياسالغان.

Doppa is an interactive Uyghur cultural website with an original digital embroidery sculpture and configurable page-building animations. It has no build step or external JavaScript dependencies.

## Features / ئالاھىدىلىكلەر

- Drag or use the arrow keys to rotate the doppa-inspired sculpture.
- Badam, atlas and golden palettes, pause/resume and reset.
- Uyghur interface, Tesewwur font, RTL layout, responsive navigation and light/dark themes.
- Configurable cursor count, speed, tour, presets and saved preferences.
- Live build progress, generated HTML/JavaScript, copy and download.
- Reduced-motion support, keyboard navigation and skip controls.

## Run locally

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173/>. The root page opens `demo/index.html`.

## Reuse the artwork

[Doppa Kit](https://github.com/UyghurCommunity/doppa-kit) extracts the original sculpture into `@uyghurcommunity/doppa`, adds custom thread colors, standalone SVG export, deterministic textile patterns and a React integration example. See its release archives for installation while npm registry publication is pending.

## Reuse the page animation

Copy `swarm.js` into your own project:

```html
<script src="swarm.js" data-auto data-locale="ug" data-replay></script>
```

| Attribute | Behavior |
| --- | --- |
| `data-auto` | Starts on page load |
| `data-agents="24"` | Desktop cursor count |
| `data-mobile-agents="10"` | Mobile cursor count |
| `data-speed="1.5"` | Playback speed |
| `data-tour="false"` | Disables automatic scrolling |
| `data-once` | Plays once per browser |
| `data-replay` | Adds a replay button |
| `data-locale="ug"` | Uyghur controls; `en` for English |

```js
Swarm.run({ agents: 24, mobileAgents: 10, speed: 1.5, locale: 'ug' });
Swarm.pause();
Swarm.resume();
Swarm.setSpeed(2);
Swarm.setTour(false);
Swarm.skip();
Swarm.state();
```

Mark an element `data-swarm-skip` to leave it visible, or `data-swarm="media"` to reveal it as a block. Static pages are the supported integration; frameworks that modify text during playback can conflict with the animation. Screen-reader output and real mobile devices still benefit from community testing.

## Development and deployment

GitHub Pages serves `main` from `/`. `.nojekyll` disables Jekyll processing. Future updates:

```bash
git add demo index.html swarm.js README.md LICENSE THIRD_PARTY_NOTICES.md .gitignore .nojekyll
git commit -m "Update Doppa"
git push origin main
```

`origin`: `https://github.com/UyghurCommunity/doppa.git`.

## License and attribution

Code: [MIT](LICENSE). Inherited software notices are preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The supplied Tesewwur font is a separate asset and is not covered by that code license.

## Cultural design

The artwork is an original digital interpretation inspired by Uyghur doppa embroidery and atlas colors. It does not claim to reconstruct a specific historical artifact or assign traditional meaning to its invented motifs.

Visual references: [Minzu University museum object](https://artsandculture.google.com/asset/embroidered-doppa-cap-decorated-with-strings-of-beads/CgEAfaQ0TSgQqQ?hl=en), [Kunstkamera catalogue](https://lib.kunstkamera.ru/files/lib/978-5-88431-179-4/978-5-88431-179-4_06.pdf), [atlas pattern research](https://doi.org/10.29049/rjcc.2020.28.2.199).
