import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(here, 'data.json'), 'utf8'));
const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function dataUrl(rel) {
  const file = path.join(here, rel);
  const ext = path.extname(file).toLowerCase();
  return 'data:' + (mime[ext] || 'application/octet-stream') + ';base64,' + fs.readFileSync(file).toString('base64');
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fill(html, key, value) {
  return html.split('__' + key + '__').join(value);
}

const projectShort = [
  '52 道真实场景题，9 分钟给出人格报告；报告直接接到单品、穿搭与延伸阅读。',
  '把线下打印拆成登录、选机、支付、订单四步；设备状态与流水接进同一套系统。',
  '学生作品与企业需求双端发布，匹配引擎给出匹配度、响应速度与多个维度。',
  '竞争力测评、规划梳理、系统课程与学员案例，服务全国 1900 多所高校学生。'
];
const projectMetrics = [
  ['52 题', '9 分钟', '14 种人格'],
  ['4 步', '全流程', '15 元 / 时'],
  ['95% 匹配', '0.5 秒响应', '双端'],
  ['1900+ 学生', '9 种测评', '3 端']
];
const projectTags = ['小程序', '小程序', '双端', '应用'];

const projectsHtml = data.projects.map((p, i) => {
  const imgs = p.shots.map(s => '<img src="' + dataUrl(s.src) + '" alt="' + esc(s.alt) + '">').join('');
  return '<article class="project">\n' +
    '        <div>\n' +
    '          <p class="p-idx">0' + (i + 1) + ' · ' + projectTags[i] + '</p>\n' +
    '          <h3 class="p-title">' + esc(p.title) + '</h3>\n' +
    '          <p class="p-desc">' + esc(projectShort[i]) + '</p>\n' +
    '          <p class="p-metrics">' + projectMetrics[i].map(m => '<b>' + esc(m) + '</b>').join(' · ') + '</p>\n' +
    '        </div>\n' +
    '        <div class="shots" aria-label="' + esc(p.title) + ' 界面">' + imgs + '</div>\n' +
    '      </article>';
}).join('\n');

const catNames = ['学科竞赛', '专利软著', '表彰荣誉', '文艺体育', '实践服务', '技能证书'];
const counts = {};
data.certs.forEach(c => { const k = c.cat.split(' · ')[0]; counts[k] = (counts[k] || 0) + 1; });
const filtersHtml = ['<button class="on" type="button" data-filter="全部">全部 ' + data.certs.length + '</button>']
  .concat(catNames.map(c => '<button type="button" data-filter="' + c + '">' + c + ' ' + (counts[c] || 0) + '</button>'))
  .join('\n          ');

const certsHtml = data.certs.map((c, i) => {
  const cat = c.cat.split(' · ')[0];
  const cap = c.level + ' · ' + c.title + ' · ' + c.meta;
  return '<button class="cert" type="button" data-cat="' + cat + '" data-cert-key="' + i + '" data-caption="' + esc(cap) + '">\n' +
    '          <span class="cert-img"><img src="' + dataUrl(c.src) + '" alt="' + esc(c.alt) + '"></span>\n' +
    '          <b>' + esc(c.level) + '</b><span>' + esc(c.title) + '</span>\n' +
    '        </button>';
}).join('\n        ');

const patents = data.certs.map((c, i) => ({ c, i })).filter(x => x.c.cat.startsWith('专利软著'));
const patentsHtml = patents.map(({ c, i }) =>
  '<button class="patent" type="button" data-open="' + i + '">\n' +
  '          <b>' + esc(c.level) + '</b><small>' + esc(c.title) + ' · ' + esc(c.meta) + '</small><em>证书 ↗</em>\n' +
  '        </button>'
).join('\n        ');

let template = fs.readFileSync(path.join(here, 'template.html'), 'utf8');
const style = fs.readFileSync(path.join(here, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(here, 'app.js'), 'utf8');
const poster = dataUrl('assets/character/' + data.character.poster.file);
const head = dataUrl('assets/character/' + data.character.headSheet.file);
const down = dataUrl('assets/character/' + data.character.downSheet.file);

template = fill(template, 'STYLE', style);
template = fill(template, 'SCRIPT', app.replace('__HEAD__', head).replace('__DOWN__', down));
template = fill(template, 'POSTER', poster);
template = fill(template, 'PROJECTS', projectsHtml);
template = fill(template, 'PATENTS', patentsHtml);
template = fill(template, 'FILTERS', filtersHtml);
template = fill(template, 'CERTS', certsHtml);

const out = path.join(here, '..', 'index.html');
fs.writeFileSync(out, template);
console.log('built', out);
console.log('bytes', Buffer.byteLength(template));
console.log('projects', data.projects.length, 'certs', data.certs.length, 'patents', patents.length);
