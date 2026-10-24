document.documentElement.classList.remove("no-js");

const ARROW =
  '<svg class="arrow" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 13 13 5M6 5h7v7"/></svg>';

// Local time in Algeria, like the template's live clock.
function tick() {
  const t = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: "Africa/Algiers",
  }).format(new Date());
  document.querySelectorAll("[data-clock]").forEach((el) => (el.textContent = t));
}
tick();
setInterval(tick, 15000);

// Solid top bar once the page scrolls.
const bar = document.querySelector(".topbar");
if (bar && !document.body.classList.contains("is-home")) {
  const onScroll = () => bar.classList.toggle("solid", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// Split text into words for the scroll reveal.
document.querySelectorAll(".split").forEach((el) => {
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(part);
          const s = document.createElement("span");
          s.className = "w";
          s.textContent = part;
          frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
});

function revealWords() {
  const vh = innerHeight;
  document.querySelectorAll(".split .w:not(.on)").forEach((w) => {
    if (w.getBoundingClientRect().top < vh * 0.82) w.classList.add("on");
  });
}
addEventListener("scroll", revealWords, { passive: true });

const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }),
  { rootMargin: "0px 0px -8% 0px" }
);
function observe(root = document) {
  root.querySelectorAll(".rise:not(.in)").forEach((el) => io.observe(el));
}

// ---------- page renderers ----------
const P = window.PROJECTS || [];

function renderStrip() {
  const strip = document.querySelector("[data-strip]");
  if (!strip) return;
  const imgs = P.map((p) => `<img src="assets/work/${p.slug}-thumb.webp" alt="" loading="lazy">`).join("");
  strip.innerHTML = imgs + imgs; // doubled for a seamless loop
}

function renderGrid() {
  const grid = document.querySelector("[data-grid]");
  if (!grid) return;
  grid.innerHTML = P.map((p, i) => `
    <a class="tile rise" style="--d:${(i % 2) * 0.08}s" href="project.html?p=${p.slug}" data-cat="${p.category}">
      <div class="tile-media">
        <img src="assets/work/${p.slug}-thumb.webp" alt="${p.name} — ${p.category}" loading="lazy">
        ${p.noLogo ? "" : `<div class="logo"><img src="assets/logos/${p.slug}.webp" alt="" loading="lazy"></div>`}
      </div>
      <div class="tile-meta"><h2>${p.name}</h2><span>${p.category}</span></div>
    </a>`).join("");

  const filters = document.querySelector("[data-filters]");
  const cats = ["All", ...new Set(P.map((p) => p.category))];
  filters.innerHTML = cats
    .map((c, i) => `<button type="button" aria-pressed="${i === 0}">${c}</button>`)
    .join("");
  filters.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    filters.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    grid.querySelectorAll(".tile").forEach((t) => {
      t.hidden = b.textContent !== "All" && t.dataset.cat !== b.textContent;
    });
  });
}

function renderProject() {
  const root = document.querySelector("[data-project]");
  if (!root) return;
  const slug = new URLSearchParams(location.search).get("p");
  let i = P.findIndex((p) => p.slug === slug);
  if (i < 0) i = 0;
  const p = P[i];
  const next = P[(i + 1) % P.length];
  document.title = `${p.name} — Benyahia Hicham`;

  root.innerHTML = `
    <div class="p-head">
      <div class="rise">
        <p class="eyebrow">${p.discipline}</p>
        <h1 class="display p-title">${p.name}</h1>
        <p class="p-sub">${p.client}</p>
      </div>
      ${p.noLogo ? "" : `<div class="p-logo rise" style="--d:.1s"><img src="assets/logos/${p.slug}.webp" alt="${p.name} logo"></div>`}
    </div>
    <div class="p-info">
      <p class="p-summary rise">${p.summary}</p>
      <dl class="p-facts rise" style="--d:.1s">
        <div><dt>Category</dt><dd>${p.category}</dd></div>
        <div><dt>Deliverables</dt><dd><ul>${p.deliverables.map((d) => `<li>${d}</li>`).join("")}</ul></dd></div>
        <div><dt>Designer</dt><dd>Benyahia Hicham · Dar Art Pack</dd></div>
      </dl>
    </div>
    <figure class="p-board rise" style="margin-inline:0" data-zoom>
      <img src="assets/work/${p.slug}.webp" alt="${p.name} — full presentation board">
    </figure>
    <a class="p-next" href="project.html?p=${next.slug}">
      <p class="eyebrow">Next project</p>
      <strong>${next.name} ${ARROW}</strong>
    </a>`;

  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = `<button type="button" aria-label="Close">×</button><img alt="">`;
  document.body.append(lb);
  root.querySelector("[data-zoom]").addEventListener("click", () => {
    lb.querySelector("img").src = `assets/work/${p.slug}.webp`;
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
  });
  const close = () => { lb.classList.remove("open"); document.body.style.overflow = ""; };
  lb.addEventListener("click", close);
  addEventListener("keydown", (e) => e.key === "Escape" && close());
}

renderStrip();
renderGrid();
renderProject();
observe();
revealWords();
