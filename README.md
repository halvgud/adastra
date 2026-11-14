# Junior Astronaut Mission Trainer

A browser game for kids aged 7 to 12, made for the NASA Space Apps Challenge 2026.
You command a small base on the Moon or Mars and balance power, air and water, radiation shielding, food and the radio delay to Earth.

**Play:** <https://adastra.earth/>.

## Real data

- **NASA DONKI** (live): today's solar activity sets how big the solar storms are.
- **NASA OSDR RadLab**: the real May 2024 solar storm, measured by BioSentinel and Curiosity.
- **NASA JPL planet positions**: today's radio delay between Earth and Mars.
- **NASA Mars Trek**: where the Mars base is (Jezero Crater).
- **Canadian Space Agency**: food in space.

Every source is listed in the game (📚 button) and in `data/sources.js`. Invented numbers are labeled "game rule".

## AI use

The pixel art was generated with PixelLab (AI) and carries a visible "AI-generated art" mark. The code, texts and background music
were written with Claude (Anthropic), an AI assistant. No AI runs inside the game.

## Run it locally

Serve the folder with any static server, for example `python -m http.server`, and open `index.html`.

## License

Code: [Apache 2.0](LICENSE). Art: [CC BY 4.0](LICENSE-ART.md). Not an official NASA product.
