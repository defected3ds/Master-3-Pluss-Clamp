# MASTER3PLUS Interactive Clamp Guide

This site deploys to Render from main. After each change I approve, commit and push to main, then confirm the deploy is live. Bump the ?v= number on app.js/style.css in index.html after edits so browsers don't serve cached files.

- Site source: `dist/` (plain HTML/CSS/JS + Three.js vendored in `dist/vendor`).
- Render runs `python3 build_site.py`, which copies `dist/` to `build/` (the publish directory).
- Live URL: https://master3plus-clamp-guide.onrender.com
