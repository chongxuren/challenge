import { constructions, boundSeries, axis } from "./records.mjs";

const repo = "https://github.com/few-time-signature/challenge";
const svg = document.querySelector("#plot");
const mint = "#7de0bf";
const amber = "#efbd83";
const violet = "#a3aaff";
const segments = [...document.querySelectorAll("[data-track]")];
const number = new Intl.NumberFormat("en");
const fmt = (v) => (v === null ? "Open" : number.format(v) + " B");
const trackName = {
  "lower-bound": "Lower bound",
  construction: "Construction",
};
const ns = "http://www.w3.org/2000/svg";
let track = "lower-bound";
let ledger, samples, selected, geometry;

function node(tag, attrs, text) {
  const el = document.createElementNS(ns, tag);
  for (const [key, val] of Object.entries(attrs)) el.setAttribute(key, val);
  if (text !== undefined) el.textContent = text;
  return el;
}
function link(label, url) {
  const a = document.createElement("a");
  a.textContent = label;
  a.href = repo + url;
  return a;
}
function avatar(name) {
  const icon = document.createElement("canvas");
  icon.className = "avatar";
  icon.width = icon.height = 9;
  icon.setAttribute("aria-hidden", "true");
  const c = icon.getContext("2d");
  let hash = 2166136261;
  for (const letter of name)
    hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619) >>> 0;
  const hue = hash % 360;
  c.fillStyle = "hsl(" + hue + " 32% 22%)";
  c.fillRect(0, 0, 9, 9);
  c.fillStyle = "hsl(" + hue + " 64% 79%)";
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 3; x++)
      if (hash & (1 << (3 * y + x))) {
        c.fillRect(2 + x, 2 + y, 1, 1);
        c.fillRect(6 - x, 2 + y, 1, 1);
      }
  return icon;
}
function team(name) {
  const el = document.createElement("span");
  el.className = "team";
  el.append(avatar(name), name);
  return el;
}
function cell(row, content, cls = "") {
  const td = row.insertCell();
  td.className = cls;
  td.append(content);
}
function empty(body, count, text) {
  const td = body.insertRow().insertCell();
  td.colSpan = count;
  td.className = "empty";
  td.textContent = text;
}
function drawBoard() {
  segments.forEach((btn) =>
    btn.setAttribute("aria-pressed", String(btn.dataset.track === track)),
  );
  const rows = ledger.rankings[track];
  document.querySelector("#team-count").textContent =
    rows.length + " " + (rows.length === 1 ? "team" : "teams");
  document.querySelector("#track-hint").textContent =
    track === "lower-bound"
      ? "Higher byte bounds rank first."
      : "Smaller signatures rank first.";
  const body = document.querySelector("#ranks");
  body.replaceChildren();
  if (!rows.length)
    empty(
      body,
      4,
      track === "construction"
        ? "Awaiting the first qualifying construction record."
        : "Awaiting the first qualifying lower-bound record.",
    );
  for (const [i, r] of rows.entries()) {
    const tr = body.insertRow();
    if (i === 0) tr.className = "leader";
    cell(tr, String(i + 1).padStart(2, "0"), "rank");
    cell(tr, team(r.team));
    cell(tr, link(fmt(r.bound_bytes), "/pull/" + r.pr), "num bytes");
    cell(
      tr,
      r.delta === null ? "First" : "+" + number.format(r.delta) + " B",
      "num gain",
    );
  }
}
function drawHistory() {
  const body = document.querySelector("#history");
  body.replaceChildren();
  if (!ledger.history.length)
    empty(body, 5, "Awaiting the first verified submission.");
  for (const r of [...ledger.history].reverse()) {
    const tr = body.insertRow();
    cell(tr, link("#" + r.pr + " · " + r.id, "/pull/" + r.pr));
    cell(tr, r.team);
    cell(tr, trackName[r.track]);
    cell(tr, fmt(r.bound_bytes), "num bytes");
    cell(tr, link("Verified", "/actions/runs/" + r.run), "num");
  }
}
const paperURL = (point) => "https://eprint.iacr.org/" + point.paper;
const status = (point) => point.certified ? "Lean-certified" : "Candidate";

function drawSources() {
  const body = document.querySelector("#construction-sources");
  for (const point of constructions) {
    const row = body.insertRow();
    const paper = document.createElement("a");
    paper.href = paperURL(point);
    paper.textContent = point.name;
    cell(row, paper);
    cell(row, fmt(point.bytes), "num bytes");
    cell(row, link(status(point), point.source));
  }
}

function inspect(index) {
  selected = index;
  const guide = svg.querySelector(".cursor");
  guide.setAttribute("x1", geometry[index]);
  guide.setAttribute("x2", geometry[index]);
  const readout = document.querySelector("#readout");
  if (index < constructions.length) {
    const point = constructions[index];
    readout.replaceChildren(point.name + " · " + fmt(point.bytes) + " · ",
      link(status(point), point.source));
  } else {
    const sample = samples[index - constructions.length];
    readout.textContent = sample.label + " · Certified lower " + fmt(sample.lower)
      + " · Certified upper " + fmt(sample.upper);
  }
}

function plotLabel(x, y, content, anchor = "start", color = "#acb6cf") {
  return node("text", { x, y, fill: color, "text-anchor": anchor,
    "font-family": "ui-monospace, monospace", "font-size": 11,
    "pointer-events": "none" }, content);
}

function marker(index, y, color, filled, href, title) {
  const x = geometry[index];
  const anchor = node("a", { href, "aria-label": title });
  anchor.append(node("title", {}, title),
    node("circle", { cx: x, cy: y, r: 11, fill: "transparent" }),
    node("circle", { class: "mark", cx: x, cy: y, r: 4.5,
      fill: filled ? color : "#13182a", stroke: color, "stroke-width": 2 }));
  anchor.addEventListener("focus", () => inspect(index));
  return anchor;
}

function drawPlot() {
  const width = Math.round(svg.getBoundingClientRect().width);
  if (!samples?.length || width < 100) return;
  const left = 38, right = width - 13, top = 18, bottom = 173;
  const count = constructions.length;
  const opening = left + (right - left) * (samples.length === 1 ? .82 : .66);
  const step = (opening - left) / count;
  geometry = constructions.map((_, i) => left + step * i);
  for (let i = 0; i < samples.length; i++)
    geometry.push(opening + i * (right - opening) / Math.max(1, samples.length - 1));

  const scale = axis([...constructions.map((p) => p.bytes),
    ...samples.flatMap((s) => [s.lower, s.upper])]);
  const y = (v) => bottom - (v - scale.min) * (bottom - top) / (scale.max - scale.min);
  svg.setAttribute("viewBox", "0 0 " + width + " 205");
  svg.replaceChildren(node("title", { id: "plot-title" }, "Historical designs and official signature bounds"),
    node("desc", { id: "plot-desc" }, "Historical designs are ordered by first ePrint. Points open the design papers. Official records at the right open their proofs or submissions."));
  for (let v = scale.min; v <= scale.max; v += scale.step) {
    svg.append(node("line", { x1: left, x2: right, y1: y(v), y2: y(v),
      stroke: "#31394e", "stroke-dasharray": "3 5" }),
      plotLabel(left - 5, y(v) + 4, number.format(v), "end"));
  }
  const divider = opening - step / 2;
  svg.append(node("line", { x1: divider, x2: divider, y1: top, y2: bottom,
    stroke: "#53607a", "stroke-dasharray": "4 4" }),
    plotLabel(left, 198, width < 370 ? "Design history" : "Design history · first ePrint"),
    plotLabel(right, 198, width < 370 ? "Official" : "Official bounds", "end"),
    node("line", { class: "cursor", y1: top, y2: bottom, stroke: "#aeb8de",
      "stroke-opacity": .4, "stroke-dasharray": "2 3", "pointer-events": "none" }));

  const dots = [];
  let certifiedPath = "";
  for (const [i, p] of constructions.entries()) {
    const color = p.certified ? mint : amber;
    if (p.certified)
      certifiedPath += (certifiedPath ? " L " : "M ") + geometry[i] + " " + y(p.bytes);
    dots.push(marker(i, y(p.bytes), color, p.certified, paperURL(p),
      p.name + " · " + fmt(p.bytes) + " · " + status(p) + " · design paper"));
    if (i === 0 || i === count - 1)
      svg.append(plotLabel(geometry[i], y(p.bytes) - 12, p.name + " " + fmt(p.bytes),
        i === 0 ? "start" : "end", color));
  }
  if (certifiedPath)
    svg.append(node("path", { d: certifiedPath, stroke: mint, "stroke-width": 1.5, fill: "none" }));

  for (const [key, color] of [["lower", violet], ["upper", mint]]) {
    let path = "", previous = null;
    for (const [i, sample] of samples.entries()) {
      const value = sample[key];
      if (value === null || value === previous) continue;
      const index = count + i;
      path += path ? " H " + geometry[index] + " V " + y(value)
        : "M " + geometry[index] + " " + y(value);
      const source = i ? "/pull/" + ledger.history[i - 1].pr
        : key === "lower" ? "/blob/main/formal/PoissonDAG/V2/Lower99.lean"
        : "/tree/main/examples/entries/construction/fors-c-2020";
      dots.push(marker(index, y(value), color, true, repo + source,
        sample.label + " · certified " + key + " bound · " + fmt(value)));
      previous = value;
    }
    if (path)
      svg.append(node("path", { d: path + " H " + right, stroke: color,
        "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round" }));
  }
  svg.append(...dots);
  inspect(selected);
}

svg.addEventListener("pointermove", (event) => {
  if (!geometry || event.pointerType !== "mouse") return;
  const x = event.clientX - svg.getBoundingClientRect().left;
  let closest = 0;
  for (let i = 1; i < geometry.length; i++)
    if (Math.abs(geometry[i] - x) < Math.abs(geometry[closest] - x)) closest = i;
  if (closest !== selected) inspect(closest);
});
svg.addEventListener("keydown", (e) => {
  if (!geometry || e.target !== svg) return;
  const last = geometry.length - 1;
  const keys = { ArrowLeft: Math.max(0, selected - 1),
    ArrowRight: Math.min(last, selected + 1), Home: 0, End: last };
  if (e.key in keys) {
    e.preventDefault();
    inspect(keys[e.key]);
  }
});
segments.forEach((btn) =>
  btn.addEventListener("click", () => {
    track = btn.dataset.track;
    if (ledger) drawBoard();
  }),
);
new ResizeObserver(drawPlot).observe(svg.parentElement);

function display(data, source) {
  ledger = data;
  samples = boundSeries(data);
  selected = data.history.length ? constructions.length + samples.length - 1 : constructions.length - 1;
  document.querySelector("#lower").textContent = fmt(data.best["lower-bound"]);
  document.querySelector("#upper").textContent = fmt(data.best.construction);
  document.querySelector("#sync").textContent = source;
  drawBoard();
  drawHistory();
  drawPlot();
}
async function load() {
  const local = fetch("./scores.json", { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw Error();
    return r.json();
  });
  const live = fetch(
    "https://api.github.com/repos/few-time-signature/challenge/contents/docs/scores.json?ref=main",
    {
      headers: { Accept: "application/vnd.github.raw+json" },
      cache: "no-cache",
    },
  ).then((r) => {
    if (!r.ok) throw Error();
    return r.json();
  });
  let current = false;
  await Promise.allSettled([
    local.then((data) => {
      if (!current) display(data, "Scores from the published snapshot.");
    }),
    live.then((data) => {
      display(data, "Scores from the verified main-branch ledger.");
      current = true;
    }),
  ]);
  if (!ledger)
    document.querySelector("#sync").textContent =
      "Scores unavailable. Open the score ledger to check the records.";
}
drawSources();
load();
