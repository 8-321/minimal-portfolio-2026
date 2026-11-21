import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const work = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(work, "..");
const content = JSON.parse(fs.readFileSync(path.join(work, "content.json"), "utf8"));
const sizes = JSON.parse(fs.readFileSync(path.join(work, "sizes.json"), "utf8"));
const style = fs.readFileSync(path.join(work, "style.css"), "utf8");
const script = fs.readFileSync(path.join(work, "app.js"), "utf8");
const template = fs.readFileSync(path.join(work, "template.html"), "utf8");

const cache = new Map();
function webpName(file) {
  return String(file).replace(/\.[^.]+$/, ".webp");
}
function asset(file) {
  if (!file) return "";
  const name = webpName(file);
  if (!cache.has(name)) {
    const buf = fs.readFileSync(path.join(work, "assets", name));
    cache.set(name, "data:image/webp;base64," + buf.toString("base64"));
  }
  return cache.get(name);
}

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function zh(value) {
  return String(value == null ? "" : value)
    .replace(/Agent Engineer/g, "智能体工程师")
    .replace(/\bAI\b/g, "人工智能")
    .replace(/\b3D\b/g, "三维")
    .replace(/ModelScope/g, "魔搭");
}

function dims(file) {
  const d = sizes[webpName(file)] || [1, 1];
  return { w: d[0], h: d[1] };
}

function img(file, alt, cls = "", lazy = true) {
  const d = dims(file);
  return `<img${cls ? ` class="${cls}"` : ""} src="${asset(file)}" width="${d.w}" height="${d.h}" alt="${esc(alt)}"${lazy ? ' loading="lazy" decoding="async"' : ""}>`;
}

const typeMap = {
  "第二文化": "小程序 · 测评",
  "校园三维自助打印": "小程序 · 设备与订单",
  "青铜创市": "双端 · 智能匹配",
  "奋马职前": "应用 · 成长服务"
};
const verbMap = ["看", "拆", "接", "交"];

function renderWork(item, index) {
  const type = String(item.no).split(" · ").slice(1).join(" · ");
  const kicker = `${verbMap[index]} · ${typeMap[item.title] || type}`;
  const titleHtml = item.title.length > 6
    ? `${esc(item.title.slice(0, 4))}<br>${esc(item.title.slice(4))}`
    : esc(item.title);
  const stats = item.stats.map(([value, label]) => (
    `<div><dt>${esc(value)}</dt><dd>${esc(label)}</dd></div>`
  )).join("");
  const flow = item.flow.map(([step], i, arr) => (
    `<b>${esc(step)}</b>${i < arr.length - 1 ? "<i>→</i>" : ""}`
  )).join("");
  const shots = item.shots.map((shot) => (
    `<button class="shot" type="button" data-cap="${esc(`${item.title} · ${shot.cap}`)}" aria-label="查看截图：${esc(shot.cap)}">${img(shot.file, `${item.title}：${shot.cap}`, "", true)}<span>${esc(shot.cap)}</span></button>`
  )).join("");
  return `
      <article class="work" id="work-${index + 1}" data-reveal>
        <div class="work-top">
          <button class="cover-btn" type="button" data-cap="${esc(`${item.title} · 项目封面`)}" aria-label="查看${esc(item.title)}项目封面">${img(item.coverFile, `${item.title}项目封面`, "cover", true)}</button>
          <div class="work-ident">
            <h3>${titleHtml}</h3>
            <p class="work-kicker">${esc(kicker)}</p>
            <dl class="stats">${stats}</dl>
          </div>
          <div class="work-body">
            <p class="work-desc">${esc(item.desc)}</p>
            <p class="flow">${flow}</p>
          </div>
        </div>
        <div class="shots" aria-label="${esc(item.title)}项目截图">${shots}</div>
      </article>`;
}

const groups = ["学科竞赛", "专利软著", "表彰荣誉", "文艺体育", "实践服务", "技能证书"];
function certMain(c) {
  const cat = String(c.cat).split(" · ")[0];
  const scope = String(c.cat).split(" · ")[1] || "";
  const level = zh(c.level);
  const title = zh(c.title);
  if (cat === "表彰荣誉") {
    return { main: level, sub: [title, scope].filter(Boolean).join(" · ") };
  }
  const sub = [level];
  if (scope && scope !== level && !(scope === "全国" && level.indexOf("全国") >= 0)) sub.push(scope);
  return { main: title, sub: sub.join(" · ") };
}

function renderCert(c) {
  const { main, sub } = certMain(c);
  const cap = [zh(c.title), zh(c.level), zh(c.meta)].filter(Boolean).join(" · ");
  return `<button class="cert" type="button" data-cap="${esc(cap)}" aria-label="查看证书：${esc(cap)}">
          <span class="cert-thumb">${img(c.file, zh(c.alt || cap), "", true)}</span>
          <span class="cert-text"><b>${esc(main)}</b><em>${esc(sub)}</em></span>
          <span class="cert-open" aria-hidden="true">↗</span>
        </button>`;
}

const certGroups = groups.map((name) => {
  const items = content.certs.filter((c) => String(c.cat).split(" · ")[0] === name);
  return `<section class="cert-group">
        <div class="group-head"><h3>${esc(name)}</h3><span>${String(items.length).padStart(2, "0")}</span></div>
        ${items.map(renderCert).join("\n        ")}
      </section>`;
}).join("\n      ");

const poster = content.extras.poster.file;
const headSheet = content.extras.headSheet.file;
const downSheet = content.extras.downSheet.file;
const sheetJson = JSON.stringify({ head: asset(headSheet), down: asset(downSheet) }).replace(/</g, "\\u003c");

const body = `
    <section class="hero" id="top">
      <div class="wrap hero-inner">
        <div class="hero-copy">
          <p class="eyebrow">二〇二六 · 长沙</p>
          <h1>由意<br><span>成形</span></h1>
          <p class="lede">把人工智能带进真实业务现场。<br>四个项目，四道判断。</p>
        <p class="facts"><span><b>04</b>个项目</span><span><b>03</b>个端</span><span><b>1900+</b>服务学生</span><span><b>43</b>张证书</span></p>
          <p class="scroll">向下 <span>↓</span></p>
        </div>
        <figure class="portrait" aria-label="原创动画形象，头部随光标转动">
          ${img(poster, "原创动画形象：白西装、黑马尾的女孩", "", false)}
          <canvas class="head" width="360" height="320" aria-hidden="true"></canvas>
        </figure>
      </div>
    </section>

    <section class="sec" id="works">
      <div class="wrap">
        <div class="sec-head" data-reveal>
          <p class="sec-no">01</p>
          <h2>项目</h2>
          <p class="sec-note">看现场，拆问题，接系统，交结果。<br>四个项目，四种落地。</p>
        </div>
        ${content.works.map(renderWork).join("\n")}
      </div>
    </section>

    <section class="sec" id="certs">
      <div class="wrap">
        <div class="sec-head" data-reveal>
          <p class="sec-no">02</p>
          <h2>证书</h2>
          <p class="sec-note">四十三张，六类。<br>按原图陈列，点开看全张。</p>
        </div>
        <div class="cert-groups" data-reveal>
      ${certGroups}
        </div>
      </div>
    </section>

    <section class="sec contact" id="contact">
      <div class="wrap">
        <div class="sec-head contact-head" data-reveal>
          <p class="sec-no">03</p>
          <h2>联系</h2>
          <p class="sec-note">不荐书，不堆词。<br>只谈具体的现场。</p>
        </div>
        <p class="contact-lede" data-reveal>想聊一个具体的现场，<br>从 GitHub 找我。</p>
        <div class="contact-links" data-reveal>
          <a href="https://github.com/8-321" target="_blank" rel="noreferrer"><span>GitHub</span><span>github.com/8-321 ↗</span></a>
        </div>
        <p class="contact-meta" data-reveal>长沙 · 可远程 · 二〇二六</p>
      </div>
    </section>`;

const html = template
  .replace("__STYLE__", style)
  .replace("__CONTENT__", body)
  .replace("__SHEET_JSON__", sheetJson)
  .replace("__SCRIPT__", script);

fs.writeFileSync(path.join(root, "index.html"), html, "utf8");
console.log(JSON.stringify({
  out: path.join(root, "index.html"),
  bytes: Buffer.byteLength(html),
  mb: +(Buffer.byteLength(html) / 1024 / 1024).toFixed(2),
  works: content.works.length,
  certs: content.certs.length,
  groups: groups.map((g) => [g, content.certs.filter((c) => String(c.cat).split(" · ")[0] === g).length])
}, null, 2));
