// Sunday School Presenter (kids) — control logic (forked from Brethren Presenter v27, no mic)
const H = window.HYMNS, B = window.BIBLE, BK = window.BOOKS;
KE.build(H, B, BK);
const $ = id => document.getElementById(id);

let SET = { font: 'K Baloo', fontB: 'K Naskh', scale: 1, fill: true, pair: 'wblue', c1: '#ffffff', c2: '#bfe3f7', design: 'flowers' };
try { Object.assign(SET, JSON.parse(localStorage.getItem('ss_set2') || '{}')); } catch (e) {}
const st = { tab: 'hymns', cur: null, slides: [], cue: -1, live: -1, liveKey: null, liveSlide: null, out: null, blank: false, browse: null };

// ---------- helpers ----------
const bookName = bi => BK[bi][0];
const arD = n => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const ref = (b, c, v) => `${bookName(b)} ${arD(c + 1)}: ${arD(v + 1)}`;
const esc = s => String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
const plain = s => KE.norm(s);
const verseName = l => l === 'ق' ? 'القرار' : l ? 'العدد ' + l : '';
const slideName = (s, i) => s.label ? (s.label === 'ق' ? 'القرار' : 'العدد ' + arD(s.label)) : 'شريحة ' + arD(i + 1);
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }


const hName = num => H[num - 1].title;
// the two colours that alternate (one of the ready pairs, or his own two colours)
function curPair() { return SET.pair === 'custom' ? { a: SET.c1, b: SET.c2 } : (DECO.PAIRS.find(p => p.id === SET.pair) || DECO.PAIRS[0]); }
function slideColors(i) { const p = curPair(), bg = i % 2 ? p.b : p.a; return { bg, fg: DECO.textOn(bg) }; }
function hymnSlides(num) {
  const h = H[num - 1];
  return h.slides.map((s, i) => ({
    theme: 'h', ...slideColors(i), seed: num * 31 + i,
    num: s.label === 'ق' ? 'القرار' : (s.label ? 'العدد ' + arD(s.label) : ''),
    html: s.lines.map(l => `<div class="ln" dir="auto">${esc(l)}</div>`).join(''),
    lab: slideName(s, i) + (s.part ? ' (تكملة)' : ''),
    ref: `${hName(num)} · ${slideName(s, i)}`
  })).concat([{ theme: 'b', end: true, html: '', lab: 'شاشة سودا (النهاية)', ref: `${hName(num)} · خلصت — شاشة سودا` }]);
}
function chapterSlides(b, c) {
  return B[b].chapters[c].map((t, v) => ({ theme: 'bible', bg: '#111111', fg: '#ffffff', seed: b * 1000 + c * 50 + v, html: `${esc(t)}<div class="r">${ref(b, c, v)}</div>`, lab: 'آية ' + arD(v + 1), ref: ref(b, c, v) }));
}
function decoOf(s) { return s && !s.end ? DECO.svg(SET.design, s.seed || 0, s.bg) : ''; }
function paint(el, s) {
  el.classList.remove('th-w', 'th-b', 'th-bible', 'th-h'); el.style.background = ''; el.style.color = '';
  if (!s) { el.innerHTML = ''; return; }
  if (s.end) { el.classList.add('th-b'); el.innerHTML = el.id === 'cueScr' ? '<div class="endlab">آخر الترنيمة — الشاشة هتبقى سودا</div>' : ''; return; }
  el.classList.add('th-' + s.theme); if (s.bg) { el.style.background = s.bg; el.style.color = s.fg; }
  el.innerHTML = decoOf(s) + (s.num ? `<span class="vn">${s.num}</span>` : '') + `<div class="tx">${s.html}</div>`;
  if (el.classList.contains('screen')) fitBox(el);
}
// suggested simple Bible story for the kids (button "قصة مقترحة" turns it on/off)
function showStory(num) {
  const el = $('story'), st = num && window.HSTORY && window.STORIES ? window.STORIES[window.HSTORY[num]] : null;
  if (!st || SET.story === false) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = '';
  el.innerHTML = `<div class="sth"><span class="hl">قصة مقترحة</span> <b>${esc(st.name)}</b> <span class="stref">${esc(st.disp)} ‹ افتحها</span></div><div class="stt">${esc(st.text)}</div>`;
  el.title = 'اضغط لفتح القصة في الكتاب المقدس من أول آية';
  el.onclick = () => openStory(st);
}
// open the story in the Bible on its first verse, remembering the hymn so "رجوع للترنيمة" brings it back
function openStory(story) {
  const p = KE.parse(story.ref.replace(/(\d+):(\d+)/, '$1 $2'), H, B);
  if (!p || p.type !== 'verse') { toast('مش لاقي الشاهد ده'); return; }
  if (st.cur && st.cur.kind === 'hymn') st.back = { num: st.cur.num, cue: st.cue, tab: st.tab, q: $('q').value, story: story.name };
  setTab('bible'); browseChapters(p.b); loadChapter(p.b, p.c, p.v);
  const n = $('slides').children[p.v]; if (n) n.scrollIntoView({ block: 'start' });
}
function goBack() {
  const b = st.back; if (!b) return; st.back = null;
  setTab(b.tab === 'bible' ? 'hymns' : b.tab);
  if (b.q && (b.tab === 'hymns')) { $('q').value = b.q; search(); }
  loadHymn(b.num, Math.max(0, b.cue));
}
// lines stay whole: shrink the words until they fit the box (preview screens + slide cards)
function fitBox(el) {
  const tx = el.querySelector('.tx'); if (!tx) return;
  tx.style.fontSize = ''; const base = parseFloat(getComputedStyle(tx).fontSize);
  const padW = el.clientWidth - 24, padH = el.classList.contains('screen') ? el.clientHeight - 24 : 1e9;
  let k = 1; while (k > 0.4 && (tx.scrollWidth > padW || tx.scrollHeight > padH)) { k -= 0.05; tx.style.fontSize = (base * k) + 'px'; }
}
// ---------- load ----------
function loadHymn(num, cueIdx) {
  st.back = null;
  st.cur = { kind: 'hymn', num }; st.slides = hymnSlides(num);
  const tp = hymnTopics(num);
  $('curTitle').innerHTML = `<span class="hl">${esc(hName(num))}</span>` + (tp.length ? `<small class="tps">${tp.map(esc).join(' · ')}</small>` : '');
  showStory(num);
  renderSlides(); setCue(cueIdx || 0);
}
function loadChapter(b, c, v) {
  st.cur = { kind: 'bible', b, c }; st.slides = chapterSlides(b, c);
  $('curTitle').innerHTML = `<span class="hl">${bookName(b)} ${arD(c + 1)}</span>` + (st.back ? `<button class="btn backbtn" id="backBtn"><svg class="ic"><use href="#i-prev"/></svg>رجوع للترنيمة: ${esc(hName(st.back.num))}</button>` : '');
  if (st.back) $('backBtn').onclick = goBack;
  showStory(null);
  renderSlides(); setCue(v || 0);
}
const key = () => JSON.stringify(st.cur);
function renderSlides() {
  const el = $('slides'); el.innerHTML = '';
  st.slides.forEach((s, i) => {
    const d = document.createElement('div'); d.className = 'slide th-' + s.theme + (s.end ? ' end' : '');
    if (s.bg && !s.end) { d.style.background = s.bg; d.style.color = s.fg; }
    d.innerHTML = (s.end ? '' : decoOf(s)) + `<span class="lab">${s.lab}</span><div class="tx">${s.html}</div>`;
    d.title = 'ضغطة = جهّزها (ولو الترنيمة معروضة تظهر على طول) · ضغطتين = اعرضها';
    d.onclick = () => pick(i);
    d.ondblclick = () => { setCue(i); play(); };
    el.appendChild(d);
  });
  requestAnimationFrame(() => [...el.children].forEach(fitBox));
  mark();
}
function setCue(i) {
  if (i < 0 || i >= st.slides.length) return;
  st.cue = i; paint($('cueScr'), st.slides[i]); $('cueRef').textContent = st.slides[i].ref; mark();
  const n = $('slides').children[i]; if (n) n.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function mark() {
  const same = st.liveKey === key();
  [...$('slides').children].forEach((d, i) => { d.classList.toggle('cue', i === st.cue); d.classList.toggle('onair', same && i === st.live && !st.blank); });
}

// ---------- live / output ----------
const onAir = () => st.liveKey === key() && st.live >= 0 && !st.blank;
function step(d) {
  if (onAir()) { const i = st.live + d; if (i < 0 || i >= st.slides.length) { toast(d > 0 ? 'دي آخر شريحة' : 'دي أول شريحة'); return; } setCue(i); play(); }
  else setCue(st.cue + d);
}
function pick(i) { setCue(i); if (onAir()) play(); }
function play() {
  if (st.cue < 0 || !st.slides[st.cue]) { toast('اختار حاجة الأول'); return; }
  const s = st.slides[st.cue];
  st.live = st.cue; st.liveKey = key(); st.liveSlide = s; st.blank = false; $('blankBtn').classList.remove('on');
  paint($('liveScr'), s); $('liveRef').textContent = s.ref;
  sendOut(s); mark(); record(s); window._lastShown = s.ref;
  if (!outputReady()) toast('اتعرضت هنا بس — دوس "فتح شاشة العرض" عشان تطلع على البروجكتور');
  if (st.cue + 1 < st.slides.length) setCue(st.cue + 1);
}
function blank() {
  st.blank = !st.blank; const s = st.blank ? null : st.liveSlide;
  paint($('liveScr'), s); sendOut(s); $('blankBtn').classList.toggle('on', st.blank); mark();
  toast(st.blank ? 'الشاشة اتخفت' : 'الكلام رجع على الشاشة');
}
const APP = !!window.bp;
let outOpen = false;
function openOut() {
  if (APP) { window.bp.openOutput(); return; }
  st.out = window.open('', 'ss_out', 'width=1280,height=720');
  if (!st.out) { toast('المتصفح منع الشباك — اسمح بالـ popups'); return; }
  const d = st.out.document;
  d.open(); d.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><base href="${location.href}"><link rel="stylesheet" href="fonts/fonts.css"><title>شاشة العرض</title><style>
  html,body{margin:0;height:100%;background:#000;color:#fff;overflow:hidden}
  body.th-w{background:#fff}
  #t{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6vh 7vw;font-family:var(--f),sans-serif;font-size:calc(var(--s) * 6.5vh);font-weight:600;line-height:1.8;transition:opacity .25s}
  #t.th-w,#t.th-b{font-size:calc(var(--s) * 8vh);font-weight:800;line-height:1.55}
  #t.th-w{background:#fff;color:#000}#t.th-b{background:#000;color:#fff}
  .vn{position:absolute;top:2.5vh;left:4vw;color:#e00;font-weight:800;font-size:.55em}
  .r{font-size:.5em;color:#999;margin-top:1.2em}
  #hint{position:fixed;inset:auto 0 0 0;padding:14px;background:#222;color:#ddd;font:600 16px "K Cairo",sans-serif;text-align:center}
  </style></head><body><div id="t"></div><div id="hint">اسحب الشباك ده على شاشة البروجكتور، وبعدين اضغط هنا مرتين أو زرار F عشان يملا الشاشة</div></body></html>`); d.close();
  const fs = () => { st.out.document.documentElement.requestFullscreen().catch(() => {}); const h = st.out.document.getElementById('hint'); if (h) h.remove(); st.out.document.body.style.cursor = 'none'; };
  st.out.document.addEventListener('dblclick', fs);
  st.out.document.addEventListener('keydown', e => { if (e.key === 'f' || e.key === 'F') fs(); else onKey(e); });
  outOpen = true; applySet();
  sendOut(st.blank ? null : st.liveSlide);
  $('outLbl').textContent = 'شاشة العرض مفتوحة';
}
function sendOut(s) {
  if (APP) { window.bp.slide(s ? { theme: s.theme, bg: s.bg || '', fg: s.fg || '', deco: decoOf(s), num: s.num || '', html: s.html, end: !!s.end } : null); return; }
  if (!st.out || st.out.closed) return;
  const t = st.out.document.getElementById('t'); if (!t) return;
  t.style.opacity = 0;
  setTimeout(() => { paint(t, s); st.out.document.body.className = s && !s.end ? 'th-' + s.theme : ''; t.style.opacity = 1; }, 180);
}
const outputReady = () => APP ? outOpen : !!(st.out && !st.out.closed);
if (APP) {
  document.documentElement.classList.toggle('mac', window.bp.platform === 'darwin');
  window.bp.on('status', s => {
    outOpen = s.outputOpen;
    $('outLbl').textContent = s.outputOpen ? (s.projector ? 'شغالة على البروجكتور' : 'شاشة العرض مفتوحة') : (s.projector ? 'فتح شاشة العرض' : 'فتح شاشة العرض (مفيش بروجكتور)');
    $('openOut').classList.toggle('primary', !s.outputOpen);
  });
  window.bp.on('key', k => onKey({ key: k.key, code: k.code, target: document.body, preventDefault() {} }));
}

// ---------- font / size ----------
function applySet() {
  if (APP) window.bp.style({ font: SET.font, fontB: SET.fontB, scale: SET.scale, fill: SET.fill !== false });
  $('storyBtn').classList.toggle('on', SET.story !== false);
  $('fillBtn').textContent = 'ملء الشاشة: ' + (SET.fill !== false ? 'شغال' : 'مقفول');
  for (const d of [document, st.out && !st.out.closed ? st.out.document : null]) if (d) { d.documentElement.style.setProperty('--f', `"${SET.font}"`); d.documentElement.style.setProperty('--fb', `"${SET.fontB}"`); d.documentElement.style.setProperty('--s', SET.scale); }
  $('fprev').style.fontFamily = `"${SET.font}"`; $('fbprev').style.fontFamily = `"${SET.fontB}"`;
  $('fontSel').value = SET.font; $('fontBSel').value = SET.fontB; $('szVal').textContent = Math.round(SET.scale * 100) + '%';
  document.querySelectorAll('[data-pair]').forEach(b => b.classList.toggle('on', b.dataset.pair === SET.pair));
  document.querySelectorAll('[data-design]').forEach(b => b.classList.toggle('on', b.dataset.design === SET.design));
  $('c1').value = SET.c1; $('c2').value = SET.c2;
  try { localStorage.setItem('ss_set2', JSON.stringify(SET)); } catch (e) {}
}
// theme / decoration changed: rebuild the open hymn and repaint what is on the screen
function relook() {
  applySet();
  if (st.cur && st.cur.kind === 'hymn') { const c = st.cue, l = st.live, same = st.liveKey === key(); st.slides = hymnSlides(st.cur.num); renderSlides(); setCue(Math.max(0, c)); if (same && l >= 0) { st.liveSlide = st.slides[l]; if (!st.blank) { paint($('liveScr'), st.liveSlide); sendOut(st.liveSlide); } } }
  else if (st.cur) { renderSlides(); setCue(Math.max(0, st.cue)); if (st.liveSlide && !st.blank) { paint($('liveScr'), st.liveSlide); sendOut(st.liveSlide); } }
}
$('fontSel').onchange = e => { SET.font = e.target.value; applySet(); };
$('fontBSel').onchange = e => { SET.fontB = e.target.value; applySet(); };
// colour pairs + designs (buttons are built here)
$('pairChips').innerHTML = DECO.PAIRS.map(p => `<button data-pair="${p.id}"><i style="background:${p.a}"></i><i style="background:${p.b}"></i>${p.name}</button>`).join('');
$('designChips').innerHTML = DECO.DESIGNS.map(d => `<button data-design="${d.id}">${d.name}</button>`).join('');
document.querySelectorAll('[data-pair]').forEach(b => b.onclick = () => { SET.pair = b.dataset.pair; relook(); });
document.querySelectorAll('[data-design]').forEach(b => b.onclick = () => { SET.design = b.dataset.design; relook(); });
$('c1').oninput = e => { SET.c1 = e.target.value; SET.pair = 'custom'; relook(); };
$('c2').oninput = e => { SET.c2 = e.target.value; SET.pair = 'custom'; relook(); };
$('fillBtn').onclick = () => { SET.fill = SET.fill === false; applySet(); toast(SET.fill ? 'الكلام هيكبر لحد ما يملا الشاشة' : 'الكلام بالحجم العادي'); };
$('storyBtn').onclick = () => { SET.story = SET.story === false; applySet(); if (st.cur && st.cur.kind === 'hymn') showStory(st.cur.num); toast(SET.story ? 'القصة المقترحة ظاهرة تحت كل ترنيمة' : 'القصة المقترحة اتقفلت'); };
$('szUp').onclick = () => { SET.scale = Math.min(1.6, +(SET.scale + 0.1).toFixed(1)); applySet(); };
$('szDn').onclick = () => { SET.scale = Math.max(0.6, +(SET.scale - 0.1).toFixed(1)); applySet(); };
$('setBtn').onclick = e => { e.stopPropagation(); $('pop').classList.toggle('open'); };
$('pop').onclick = e => e.stopPropagation();
document.addEventListener('click', () => $('pop').classList.remove('open'));

// ---------- library ----------
function item(no, title, sub, fn) {
  const d = document.createElement('div'); d.className = 'item';
  d.innerHTML = `${no !== '' && typeof no !== 'number' ? `<div class="no">${no}</div>` : ''}<div><div class="t">${esc(title)}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ''}</div>`;
  d.onclick = () => { [...$('results').querySelectorAll('.item')].forEach(x => x.classList.remove('sel')); d.classList.add('sel'); fn(); };
  $('results').appendChild(d); return d;
}
// result with the line that matched (the typed piece highlighted)
function itemH(title, subHtml, fn) { const d = item('', title, '', fn); if (subHtml) { const s = document.createElement('div'); s.className = 's'; s.innerHTML = subHtml; d.querySelector('div').appendChild(s); } return d; }
function hiLine(lines, q) {
  const qn = KE.norm(q); let best = lines[0] || '';
  for (const l of lines) if (KE.norm(l).includes(qn)) { best = l; break; }
  // highlight by matching the normalised text back onto the original letters
  const map = []; let flat = '';
  for (let i = 0; i < best.length; i++) { const c = KE.norm(best[i]); if (c && c !== ' ') { map.push(i); flat += c; } else if (best[i] === ' ' && flat && flat[flat.length - 1] !== ' ') { map.push(i); flat += ' '; } }
  const at = flat.indexOf(qn);
  if (at < 0 || !qn) return esc(best.slice(0, 80));
  const a0 = map[at], a1 = map[Math.min(map.length - 1, at + qn.length - 1)] + 1;
  return esc(best.slice(0, a0)) + '<mark>' + esc(best.slice(a0, a1)) + '</mark>' + esc(best.slice(a1));
}
function sec(t) { const d = document.createElement('div'); d.className = 'sec'; d.textContent = t; $('results').appendChild(d); }
function empty(t) { const d = document.createElement('div'); d.className = 'empty'; d.innerHTML = t; $('results').appendChild(d); }
function crumb(parts) {
  const c = $('crumb'); c.innerHTML = '';
  parts.forEach((p, i) => {
    if (i) { const s = document.createElement('span'); s.textContent = '‹'; c.appendChild(s); }
    if (p.fn) { const b = document.createElement('button'); b.textContent = p.t; b.onclick = p.fn; c.appendChild(b); }
    else { const s = document.createElement('span'); s.textContent = p.t; c.appendChild(s); }
  });
}

function browseBooks() {
  st.browse = null; crumb([]); $('results').innerHTML = '';
  const t = SET.testament || 'new';
  const seg = document.createElement('div'); seg.className = 'seg testament';
  [['old', 'العهد القديم'], ['new', 'العهد الجديد']].forEach(([k, l]) => {
    const b = document.createElement('button'); b.textContent = l; if (k === t) b.className = 'on';
    b.onclick = () => { SET.testament = k; applySet(); browseBooks(); };
    seg.appendChild(b);
  });
  $('results').appendChild(seg);
  if (t === 'old') grid(BK.slice(0, 39).map((n, i) => [n[0], () => browseChapters(i)]), true);
  else grid(BK.slice(39).map((n, i) => [n[0], () => browseChapters(i + 39)]), true);
}
function browseChapters(b) {
  st.browse = b; $('results').innerHTML = '';
  crumb([{ t: 'كل الأسفار', fn: browseBooks }, { t: bookName(b) }]);
  sec('اختار الإصحاح');
  grid(B[b].chapters.map((_, c) => [arD(c + 1), () => { loadChapter(b, c, 0); }]));
}
function grid(items, wide) {
  const g = document.createElement('div'); g.className = 'grid';
  if (wide) g.style.gridTemplateColumns = 'repeat(2,1fr)';
  items.forEach(([t, fn]) => { const b = document.createElement('button'); b.textContent = t; b.onclick = fn; g.appendChild(b); });
  $('results').appendChild(g);
}

// any script's digits -> 0-9, and drop invisible direction marks the Arabic keyboard can add
const latinDigits = s => String(s).replace(/\p{Cf}/gu, '').replace(/\p{Nd}/gu, d => String(d.codePointAt(0) & 0xF));
function search() {
  const q = latinDigits($('q').value.trim()); $('results').innerHTML = ''; $('results').scrollTop = 0;
  if (st.tab === 'today') { crumb([]); showToday(); return; }
  if (st.tab === 'history') { showHistory(); return; }
  if (st.tab === 'topics') { showTopics(); return; }
  if (st.tab === 'hymns') {
    crumb([]);
    if (!q) { alphaList(H.map(h => h.num)); return; }
    // names first, then any piece of the words, then the looser word-by-word match
    const seen = new Set(), tit = KE.searchTitles(q, 15), frag = KE.searchFragments(q, 60), res = KE.searchHymnText(q, 60);
    if (!tit.length && !frag.length && !res.length) { empty('مالقيتش ترنيمة فيها الكلام ده<br>جرّب كلمة تانية'); return; }
    const snip = (num, i) => { const s = H[num - 1].slides[i]; return s ? hiLine(s.lines, q) : ''; };
    tit.filter(r => r.score >= 1).forEach(r => { seen.add(r.num); item('', hName(r.num), '', () => loadHymn(r.num)); });
    frag.forEach(r => { if (seen.has(r.num)) return; seen.add(r.num); itemH(hName(r.num), snip(r.num, r.i), () => loadHymn(r.num, r.i)); });
    tit.filter(r => r.score < 1).forEach(r => { if (seen.has(r.num)) return; seen.add(r.num); item('', hName(r.num), '', () => loadHymn(r.num)); });
    res.forEach(r => {
      if (seen.has(r.num) || seen.size >= 60) return; seen.add(r.num);
      itemH(hName(r.num), snip(r.num, r.i), () => loadHymn(r.num, r.i));
    });
  } else {
    if (!q) { browseBooks(); return; }
    crumb([{ t: 'كل الأسفار', fn: () => { $('q').value = ''; browseBooks(); } }, { t: 'نتايج البحث' }]);
    const p = KE.parse(q, H, B);
    if (p && p.type === 'verse') { sec('الشاهد'); item('', ref(p.b, p.c, p.v), plain(B[p.b].chapters[p.c][p.v]).slice(0, 90), () => loadChapter(p.b, p.c, p.v)); }
    const res = KE.searchBible(q, 40);
    if (res.length) sec('آيات فيها الكلام ده');
    res.forEach(r => item('', ref(r.b, r.c, r.v), plain(B[r.b].chapters[r.c][r.v]).slice(0, 110), () => loadChapter(r.b, r.c, r.v)));
    if (!res.length && !(p && p.type === 'verse')) empty('مالقيتش حاجة<br>جرّب كلمة تانية أو اكتب الشاهد زي: يوحنا 3 16');
  }
}
// alphabetical list with a highlighted letter for each group (no numbers)
const firstLetter = t => { const c = KE.norm(t).charAt(0); return /[a-z]/.test(c) ? 'English' : c || '#'; };
function alphaList(nums) {
  const sorted = nums.slice().sort((a, b) => a - b); let cur = null;
  sorted.forEach(n => {
    const L = firstLetter(H[n - 1].title);
    if (L !== cur) { cur = L; const d = document.createElement('div'); d.className = 'letter'; d.innerHTML = `<span>${L}</span>`; $('results').appendChild(d); }
    item('', hName(n), '', () => loadHymn(n));
  });
}
// topics (المواضيع) — based on the Bible: sections → topics (each with its key verse) → hymns A→Z
function topicVerse(t) {
  if (!t.ref) return null;
  const p = KE.parse(t.ref.replace(/(\d+):(\d+)/, '$1 $2'), H, B);
  return p && p.type === 'verse' ? p : null;
}
function showTopics(open) {
  const T = window.TOPICS || [];
  if (open != null) {
    $('results').scrollTop = 0;
    const t = T[open]; crumb([{ t: 'كل المواضيع', fn: () => { $('results').innerHTML = ''; showTopics(); } }, { t: t.name }]);
    alphaList(t.nums); return;
  }
  crumb([]);
  let sec = null;
  T.forEach((t, i) => {
    if (!t.nums.length) return;
    if (t.section !== sec) { sec = t.section; const d = document.createElement('div'); d.className = 'letter'; d.innerHTML = `<span>${esc(sec)}</span>`; $('results').appendChild(d); }
    item('', t.name, arD(t.nums.length) + ' ترنيمة', () => { $('results').innerHTML = ''; showTopics(i); });
  });
}
// the topics a hymn belongs to (shown under its title)
function hymnTopics(num) { return (window.TOPICS || []).filter(t => t.nums.includes(num)).map(t => t.name); }
function setTab(t) {
  st.tab = t; document.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === t));
  $('q').value = ''; $('q').placeholder = t === 'hymns' ? 'اسم الترنيمة أو أي كلام منها…' : 'اكتب الشاهد (يوحنا 3 16) أو أي كلام من الآية…';
  document.querySelector('.search').style.display = (t === 'today' || t === 'history' || t === 'topics') ? 'none' : '';
  search(); if (t === 'hymns' || t === 'bible') $('q').focus();
}

// ---------- meetings: اجتماع اليوم + السجل ----------
// every hymn / verse shown goes into today's meeting (named by the computer's date), saved to disk
let MEET = { meetings: [] }, meetSaveT = null;
const pad = n => String(n).padStart(2, '0');
const todayId = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const meetTitle = d => 'خدمة ' + d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
function curMeeting() {
  const id = todayId();
  let m = MEET.meetings.find(x => x.day === id && !x.closed);
  if (!m) { const d = new Date(); m = { id: id + '-' + d.getTime(), day: id, title: meetTitle(d), started: d.getTime(), items: [] }; MEET.meetings.unshift(m); }
  return m;
}
function saveMeet() {
  clearTimeout(meetSaveT);
  meetSaveT = setTimeout(() => {
    if (window.bp && window.bp.meetSave) window.bp.meetSave(MEET);
    else try { localStorage.setItem('kenesa_meet', JSON.stringify(MEET)); } catch (e) {}
  }, 400);
}
async function loadMeet() {
  let d = null;
  if (window.bp && window.bp.meetLoad) d = await window.bp.meetLoad();
  else try { d = JSON.parse(localStorage.getItem('kenesa_meet') || 'null'); } catch (e) {}
  if (d && Array.isArray(d.meetings)) MEET = d;
  if (st.tab === 'today' || st.tab === 'history') search();
}
function record(s) {
  if (!s || s.end || !st.cur) return;
  const m = curMeeting(), last = m.items[m.items.length - 1], t = Date.now();
  if (st.cur.kind === 'hymn') {
    const lab = String(st.live);
    if (last && last.k === 'h' && last.num === st.cur.num) { if (!last.v.includes(lab)) last.v.push(lab); last.t2 = t; }
    else m.items.push({ k: 'h', num: st.cur.num, title: H[st.cur.num - 1].title, v: [lab], t, t2: t });
  } else {
    const b = st.cur.b, c = st.cur.c, v = st.live;
    if (last && last.k === 'b' && last.b === b && last.c === c && v >= last.from - 1 && v <= last.to + 1) { last.from = Math.min(last.from, v); last.to = Math.max(last.to, v); last.t2 = t; }
    else m.items.push({ k: 'b', b, c, from: v, to: v, t, t2: t });
  }
  saveMeet();
  if (st.tab === 'today') search();
}
const hymnOf = it => { if (it.title) { const h = H.find(x => x.title === it.title); if (h) return h.num; } return H[it.num - 1] ? it.num : 0; };
const timeOf = t => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
function itemLabel(it) {
  const noT = x => String(x).replace(/[\u064B-\u0652\u0670]/g, '');
  if (it.k === 'h') { const n = hymnOf(it); if (!n) return ['ترنيمة اتشالت', '']; return [noT(H[n - 1].title), it.v.length + (it.v.length === 1 ? ' شريحة' : ' شرايح')]; }
  const r = bookName(it.b) + ' ' + (it.c + 1) + ':' + (it.from + 1) + (it.to > it.from ? '-' + (it.to + 1) : '');
  return [r, noT(B[it.b].chapters[it.c][it.from]).slice(0, 70)];
}
function openItem(it) {
  if (it.k === 'h') { const n = hymnOf(it); if (n) loadHymn(n, Math.max(0, +it.v[0] || 0)); }
  else loadChapter(it.b, it.c, it.from);
}
function listItems(m) {
  if (!m.items.length) { empty('<b>🌱</b>لسه مفيش حاجة اتعرضت النهارده'); return; }
  m.items.forEach(it => { const [t, s] = itemLabel(it); const d = item('', t, s, () => openItem(it)); const w = document.createElement('span'); w.className = 'when'; w.textContent = timeOf(it.t); d.appendChild(w); });
}
function showToday() {
  const m = curMeeting(), head = document.createElement('div'); head.className = 'meethead';
  head.innerHTML = `<b>${esc(m.title)}</b>`;
  const nb = document.createElement('button'); nb.className = 'btn'; nb.textContent = 'خدمة جديدة';
  nb.onclick = () => { if (!m.items.length) { toast('الخدمة دي لسه فاضية'); return; } m.closed = true; curMeeting(); saveMeet(); search(); toast('بدأنا خدمة جديدة'); };
  head.appendChild(nb); $('results').appendChild(head);
  listItems(m);
}
function showHistory(openId) {
  const list = MEET.meetings.filter(m => m.items.length);
  if (openId) {
    const m = MEET.meetings.find(x => x.id === openId); if (!m) return showHistory();
    crumb([{ t: 'كل الخدمات', fn: () => { $('results').innerHTML = ''; showHistory(); } }, { t: m.title }]);
    listItems(m); return;
  }
  crumb([]);
  if (!list.length) { empty('<b>📒</b>لسه مفيش خدمات متسجلة'); return; }
  list.forEach(m => item('', m.title, (m.items.length === 1 ? 'حاجة واحدة' : m.items.length + ' حاجات') + ' · بدأ ' + timeOf(m.started), () => { $('results').innerHTML = ''; showHistory(m.id); }));
}


// ---------- events ----------
function onKey(e) {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'SELECT') return;
  if (e.code === 'Space') { e.preventDefault(); play(); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); step(1); }
  else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
  else if (e.key === 'b' || e.key === 'B' || e.key === 'لا') blank();
}
document.addEventListener('keydown', onKey);
let qT; $('q').addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(search, 220); });
$('q').addEventListener('keydown', e => { if (e.key === 'Enter') { const f = $('results').querySelector('.item'); if (f) f.click(); } });
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => setTab(b.dataset.tab));
$('openOut').onclick = openOut;
$('blankBtn').onclick = blank;
$('playBtn').onclick = play;
$('nextBtn').onclick = () => step(1);
$('prevBtn').onclick = () => step(-1);
// automatic update (Windows): tell the servant quietly, never interrupt the meeting
if (APP && window.bp.on) window.bp.on('update', u => {
  if (u.state === 'downloading') toast('في نسخة جديدة من البرنامج بتتنزل…');
  if (u.state === 'ready') {
    const b = $('updBtn'); b.style.display = ''; b.textContent = 'نسخة جديدة جاهزة — حدّث';
    b.onclick = () => { if (confirm('البرنامج هيتقفل ويفتح تاني بالنسخة الجديدة. تمام؟')) window.bp.updateNow(); };
  }
});
applySet();
setTab('hymns');
loadMeet();
