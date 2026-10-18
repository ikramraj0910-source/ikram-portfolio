# Ikram Ullah — Personal Portfolio

A static, dependency-free executive portfolio (HTML, CSS and one vanilla JS file, no build step).

Design: midnight and ivory bands, Bodoni Moda display type with Instrument Sans, icy blue and teal accents.
The opening visual is a canvas-drawn "growth lattice": scattered points assemble into a grid of
columns rising toward one corner. It pauses when off-screen, renders as a still frame for visitors
who prefer reduced motion, and the page works fully without it (or without JavaScript).

## Structure

```
index.html          All page content and metadata (SEO, Open Graph, JSON-LD)
styles.css          Design system (colour/type/space tokens, light + dark themes) and layout
script.js           Lattice animation, scroll reveals, header behaviour, menu, case-study accordion, copy buttons
favicon.svg         Monogram favicon
assets/img/         Optimised portrait (WebP + JPEG), social share image, touch icon
assets/certificates/ Certificate images used as evidence in the case studies
```

## Preview locally

```bash
cd portfolio
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly in a browser also works.

## Deploy

Any static host works; there is no build step.

- **Cloudflare Pages (recommended, free):** Workers & Pages → Create → Pages → upload the folder
  (or connect a Git repo with no build command and output directory `/`).
- **Netlify:** drag the `portfolio` folder onto app.netlify.com/drop.
- **Vercel:** `npx vercel` inside the folder (framework preset: "Other").
- **GitHub Pages:** push the folder contents to a repo, then Settings → Pages → deploy from branch.

After you have a domain, update `og:image` and `twitter:image` in `index.html` to the absolute URL
(e.g. `https://yourdomain.com/assets/img/og-image.jpg`) and add
`<link rel="canonical" href="https://yourdomain.com/">` — social networks need absolute image URLs.

## Contact form

The site deliberately uses an email link plus a copy-address button instead of a form,
because a static site cannot deliver form messages by itself. To add a working form, use one of:

- **Netlify Forms** (if hosting on Netlify): add `data-netlify="true"` and a `name` to a `<form>`.
- **Formspree** or similar: create a form endpoint, then set the form `action` to that URL.

No API keys are required in the frontend for either option.

## Updating content

- New roles: copy an `<li class="role">` block in the Experience section.
- New case studies: copy an `<li class="case">` block in `.cases`, giving the button and panel new ids.
- The "Next builds" list in the Python case study is labelled *Planned*; replace it with real
  projects (and a GitHub link) as you complete them.
