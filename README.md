# Junior Astronaut Mission Trainer

A browser game for kids aged 7 to 12, made for the NASA Space Apps Challenge 2026.
You command a small base on the Moon or Mars and balance power, air and water, radiation shielding, food and the radio delay to Earth.

**Play:** <https://adastra.earth/>.

## Real data

- **NASA DONKI** (live): this week's real flares set how big the solar storms are on the Moon and on Mars, and the warnings name the biggest real flare.
- **NASA OSDR**: RadLab measurements of the May 2024 storm (BioSentinel in deep space, Curiosity on Mars) size the storms; four real astronaut-health and plant studies appear in the rooms.
- **NASA JPL planet positions**: today's radio delay between Earth and Mars, and today's Mars–Sun distance, which sets how much power the Mars solar panels make.
- **NASA Mars Trek**: where the Mars base is (Jezero Crater).
- **Canadian Space Agency**: food in space.

Every source is listed in the game (📚 button) and in `data/sources.js`. Invented numbers are labeled "game rule".

## AI use

The pixel art was generated with PixelLab (AI) and carries a small visible "AI" mark. The code, texts and background music
were written with Claude (Anthropic), an AI assistant. No AI runs inside the game.

## Run it locally

Serve the folder with any static server, for example `python -m http.server`, and open `index.html`.

## License

Code: [Apache 2.0](LICENSE). Art: [CC BY 4.0](LICENSE-ART.md). Not an official NASA product.
