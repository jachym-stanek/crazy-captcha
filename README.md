# Prank Puzzle Site

This is a tiny 2-page "CAPTCHA" prank site:

- **Part 1**: Tap tiles to hear sounds and *select all ostriches* (ostricheness is determined by **soundKey**, not the picture). Wrong clicks reset the counter.
- **Part 2**: Find the three tiles that go “beep‑beep” and click them from **lowest pitch** to **highest pitch**.

## Mobile compatibility

- Responsive grid: it automatically drops to 3/2 columns on smaller screens.
- Uses **Pointer Events** with a click fallback.
- No hover-only interactions.

Note: On iOS/Safari, audio is only allowed after a user gesture. This site plays audio on tap/click so it works, but if you hear nothing, tap again.

## Run locally

Open a terminal in this folder and run:

```bash
python3 -m http.server 8000
```

Then open:

- http://localhost:8000/index.html

(Serving via a local server is recommended because some browsers restrict media features under `file://`.)

## Host online

### Option 1: GitHub Pages

1. Create a new GitHub repository and commit these files.
2. In the repo: **Settings → Pages → Build and deployment**
3. Choose:
   - **Source**: Deploy from a branch
   - **Branch**: `main` (or `master`) / root
4. Your prank link will be your Pages URL.

### Option 2: Netlify (super easy drag & drop)

1. Go to Netlify and create a new site.
2. Drag & drop this folder (or a zip of it) into Netlify.
3. Netlify will give you a public URL.

## Customization

### Replace the final image

In `puzzle2.js`, change the code in `reveal()`:

- Either set `revealImg.src` to a URL
- Or point it to a file you host in the same folder (e.g. `./my_prank.jpg`)

### Swap images or sounds in Part 1

Edit `puzzle1.js`:

- Each tile has an `imgUrl` (currently using `loremflickr.com`) and a `soundKey`.
- `SOUND_URLS` maps sound keys to audio URLs. You can replace these with your own hosted audio files for full control.

