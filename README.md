# Mohit Gora — Portfolio

A static portfolio site (HTML + CSS + JS + Three.js). It has no build step.

## Preview locally
Open `index.html` in a browser, or run a tiny server (recommended):

```bash
python -m http.server 5500
# then open http://localhost:5500
```

## Publish free on GitHub Pages (public link)
1. Create a new **public** repo on GitHub named `mohitgora950.github.io`.
2. Upload these files: `index.html`, `style.css`, `main.js`, `dragon.html`, `dragon.js`, `assets/` (and this README).
   Don't upload `old-portfolio/`; it's only a backup.
3. Repo → **Settings → Pages** → Source: `Deploy from a branch` → Branch `main` / `root` → Save.
4. After 1–2 minutes the site is live at **https://mohitgora950.github.io**

Using git from this folder:

```bash
git init
git add .
git commit -m "Launch portfolio"
git branch -M main
git remote add origin https://github.com/mohitgora950/mohitgora950.github.io.git
git push -u origin main
```

## Update content
- Projects, text and links: `index.html`
- Colors and fonts: the `:root` variables at the top of `style.css`
- Typed hero roles and skills sphere words: `main.js` (`roles` and `words` arrays)
- Resume: replace `assets/Mohit_Gora_Resume.pdf` and keep the same filename

## Dragon Flight game
`dragon.html` + `dragon.js` hold a playable canvas game. A dragon breathes fire to reveal "I AM MOHIT GORA", and visitors
then fly it around and burn tower banners to unlock each repository. To add a repo, edit the `REPOS` array at the top of `dragon.js`.
`assets/dragon-banner.svg` is the animated banner used on the GitHub profile README.
