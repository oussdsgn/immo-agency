# Benyahia Hicham — portfolio website

Static portfolio site for Benyahia Hicham (art director, packaging designer, founder of Dar Art Pack).
Its layout follows the [Vexoo Framer template](https://vexoo.framer.website/about), and all content and images come from his portfolio PDF.

No build step: plain HTML, CSS and JS.

```
portfolio/
├── index.html      home: bento grid (About, Portfolio, Contact, portrait, software, Resume)
├── about.html      bio, roles, experience timeline (#experience), contact
├── work.html       project grid with category filters
├── project.html    project detail, ?p=<slug> (click the board to zoom)
├── contact.html    email, phone, availability
├── css/style.css
├── js/projects.js  project data: edit here to add or change projects
├── js/main.js      clock, reveals, grid / project rendering
└── assets/         images extracted from the PDF (work boards, thumbs, client logos, photos, mark)
```

## Run locally

```sh
cd portfolio && python3 -m http.server 8000   # then open http://localhost:8000
```

## Adding a project

1. Add `assets/work/<slug>.webp` (full board), `assets/work/<slug>-thumb.webp` (4:3 card image)
   and optionally `assets/logos/<slug>.webp` (logo on black).
2. Add an entry to `js/projects.js`.

## Deploy

Upload the `portfolio/` folder to any static host (Netlify, Vercel, GitHub Pages, cPanel…). All paths are relative.
