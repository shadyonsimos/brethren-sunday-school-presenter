// Slide colours (always a pair that alternates) + background designs: big, soft, low-opacity shapes around the words.
(function () {
  const PAIRS = [
    { id: 'wblue', name: 'أبيض وبيبي بلو', a: '#ffffff', b: '#bfe3f7' },
    { id: 'wpink', name: 'أبيض وبينك', a: '#ffffff', b: '#ffd9e8' },
    { id: 'cream', name: 'كريمي وأصفر', a: '#fffaf0', b: '#ffe8a3' },
    { id: 'mint', name: 'نعناعي ولافندر', a: '#dcf5e7', b: '#e6defc' },
    { id: 'peach', name: 'خوخي وسماوي', a: '#ffe3d3', b: '#d4ecff' },
    { id: 'navy', name: 'أبيض وكحلي', a: '#ffffff', b: '#1f3b63' },
    { id: 'bw', name: 'أبيض وأسود', a: '#ffffff', b: '#111111' }
  ];
  const DESIGNS = [
    { id: 'flowers', name: 'ورد' }, { id: 'bubbles', name: 'فقاعات' }, { id: 'stars', name: 'نجوم' },
    { id: 'clouds', name: 'سحاب' }, { id: 'hearts', name: 'قلوب' }, { id: 'waves', name: 'موجات' },
    { id: 'leaves', name: 'ورق شجر' }, { id: 'none', name: 'سادة' }
  ];
  const PASTEL = ['#f7b2cf', '#c9b6f2', '#ffd27f', '#a9d8f5', '#9fd39a', '#ffb38a'];
  function lum(hex) {
    const n = parseInt(String(hex).replace('#', ''), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  const textOn = bg => lum(bg) > 0.35 ? '#111111' : '#ffffff';
  function rnd(seed) { let s = (Math.abs(seed) * 9301 + 49297) % 233280; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
  // a point in the frame around the words (keeps the middle clear)
  function edgePoint(R) {
    for (let k = 0; k < 40; k++) {
      const x = R() * 1600, y = R() * 900, dx = Math.abs(x - 800) / 800, dy = Math.abs(y - 450) / 450;
      if (dx > 0.7 || dy > 0.68) return [x, y];
    }
    return [R() < 0.5 ? 60 : 1540, R() * 900];
  }
  const f1 = v => v.toFixed(1);
  function flower(x, y, r, petal, center, rot) {
    let p = '';
    for (let i = 0; i < 5; i++) {
      const a = (rot + i * 72) * Math.PI / 180, cx = x + Math.cos(a) * r * 0.62, cy = y + Math.sin(a) * r * 0.62;
      p += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(r * 0.5)}" ry="${f1(r * 0.36)}" transform="rotate(${f1(rot + i * 72)} ${f1(cx)} ${f1(cy)})" fill="${petal}"/>`;
    }
    return p + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.3)}" fill="${center}"/>`;
  }
  const star = (x, y, r, c, rot) => `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${f1(r / 12)})" d="M0-12l3.5 7.2 7.9 1.1-5.7 5.6 1.3 7.9L0 6.1l-7 3.7 1.3-7.9-5.7-5.6 7.9-1.1z" fill="${c}" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>`;
  const heart = (x, y, r, c, rot) => `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${f1(r / 12)})" d="M0 10C-15 0-11-13 0-5 11-13 15 0 0 10z" fill="${c}"/>`;
  const leaf = (x, y, r, c, rot) => `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${f1(r / 11)})" d="M-11 0C-5-9 5-9 11 0C5 9-5 9-11 0z M-11 0H11" fill="${c}" stroke="${c}" stroke-width=".6"/>`;
  const cloud = (x, y, w, c) => `<g fill="${c}" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(w / 200)})"><circle cx="-55" cy="10" r="38"/><circle cx="-10" cy="-18" r="52"/><circle cx="45" cy="0" r="42"/><circle cx="80" cy="20" r="28"/><rect x="-90" y="10" width="190" height="40" rx="20"/></g>`;
  function svg(design, seed, bg) {
    if (!design || design === 'none') return '';
    const R = rnd(seed + 11), dark = lum(bg || '#ffffff') < 0.35, parts = [];
    const op = dark ? 0.22 : 0.32;                 // low opacity: the words stay the star
    const pick = () => PASTEL[Math.floor(R() * PASTEL.length)];
    if (design === 'flowers') {
      for (let i = 0; i < 9; i++) { const [x, y] = edgePoint(R); const r = 70 + R() * 110; parts.push(leaf(x + r * 0.7, y + r * 0.5, r * 0.7, '#9fd39a', R() * 360)); parts.push(flower(x, y, r, pick(), R() < 0.5 ? '#f6c453' : '#e07a3f', R() * 72)); }
    } else if (design === 'bubbles') {
      for (let i = 0; i < 14; i++) { const [x, y] = edgePoint(R); const r = 40 + R() * 190; parts.push(R() < 0.75 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${pick()}"/>` : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="none" stroke="${pick()}" stroke-width="${f1(r / 6)}"/>`); }
    } else if (design === 'stars') {
      for (let i = 0; i < 16; i++) { const [x, y] = edgePoint(R); parts.push(star(x, y, 30 + R() * 120, pick(), R() * 70)); }
    } else if (design === 'hearts') {
      for (let i = 0; i < 14; i++) { const [x, y] = edgePoint(R); parts.push(heart(x, y, 40 + R() * 120, pick(), R() * 50 - 25)); }
    } else if (design === 'leaves') {
      for (let i = 0; i < 18; i++) { const [x, y] = edgePoint(R); parts.push(leaf(x, y, 50 + R() * 110, R() < 0.6 ? '#9fd39a' : '#c7e6a7', R() * 360)); }
    } else if (design === 'clouds') {
      const c = dark ? '#ffffff' : '#a9d8f5';
      for (let i = 0; i < 4; i++) parts.push(cloud(120 + i * 430 + R() * 120, 820 + R() * 60, 380 + R() * 220, c));
      for (let i = 0; i < 3; i++) parts.push(cloud(200 + i * 560 + R() * 150, 30 + R() * 50, 260 + R() * 160, c));
    } else if (design === 'waves') {
      const c1 = pick(), c2 = pick(), ph = R() * 300;
      const wave = (y0, amp, c, flip) => { let d = `M0 ${flip ? 0 : 900}L0 ${y0}`; for (let x = 0; x <= 1600; x += 40) d += `L${x} ${f1(y0 + Math.sin((x + ph) / 170) * amp)}`; return `<path d="${d}L1600 ${flip ? 0 : 900}Z" fill="${c}"/>`; };
      parts.push(wave(760, 34, c1, false), wave(810, 26, c2, false), wave(120, 30, c2, true), wave(70, 22, c1, true));
    }
    return `<svg class="deco" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><g opacity="${op}">${parts.join('')}</g></svg>`;
  }
  window.DECO = { PAIRS, DESIGNS, svg, textOn, lum };
})();
