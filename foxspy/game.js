// FoxSpy: Foxino the secret agent. The menu is his HQ (holographic globe in the middle, the Trophy Room to the left, the
// Smart Board with his stats to the right); SELECT MISSION zooms into the globe and its five glowing missions. A mission
// is a run of stages (briefing, sneaking rooms, laser halls, decoding, vaults, an escape), and everything that matters is
// answered with the chosen content package. Family friendly: the stun laser only makes the Bolt-Bots nap.
// 3D: the Blender models in models/ (made on the Windows PC); until each one arrives a stand-in is used.
import * as THREE from './lib/three.module.min.js';
import { GLTFLoader } from './lib/GLTFLoader.js';
import { MISSIONS, RANKS } from './missions.js?v=4';
import { EffectComposer } from './lib/pp/EffectComposer.js';
import { RenderPass } from './lib/pp/RenderPass.js';
import { UnrealBloomPass } from './lib/pp/UnrealBloomPass.js';
import { OutputPass } from './lib/pp/OutputPass.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (TOUCH) document.body.classList.add('touch');

/* ================= save ================= */
const save = Object.assign({ done: {}, answered: 0, correct: 0, learned: {}, missed: {}, sound: true, voice: true, gfx: TOUCH ? 'low' : 'high', time: 0 }, store.get('foxspy-save', {}));
const persist = () => store.set('foxspy-save', save);
const missionsDone = () => MISSIONS.filter((m) => save.done[m.id]).length;
const totalStars = () => MISSIONS.reduce((s, m) => s + (save.done[m.id] ? save.done[m.id].stars : 0), 0);
const rankName = () => { let r = RANKS[0]; for (const k of RANKS) if (missionsDone() >= k.at) r = k; return r.name; };

/* ================= sound (a tiny synth, no files) ================= */
let AC = null;
function tone(f, d = .12, type = 'sine', v = .08, at = 0, slide = 0) {
  if (!save.sound) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  if (AC.state === 'suspended') AC.resume();
  const t = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + .02);
}
const SFX = {
  click: () => tone(880, .06, 'square', .04),
  right: () => { tone(660, .1, 'triangle', .1); tone(880, .1, 'triangle', .1, .08); tone(1320, .18, 'triangle', .1, .16); },
  wrong: () => tone(160, .3, 'sawtooth', .07, 0, -60),
  alarm: () => { for (let k = 0; k < 4; k++) tone(k % 2 ? 620 : 880, .16, 'square', .06, k * .17); },
  stun: () => tone(1800, .25, 'sawtooth', .06, 0, -1500),
  door: () => tone(220, .5, 'triangle', .08, 0, 380),
  pick: () => { tone(988, .1, 'sine', .1); tone(1319, .25, 'sine', .1, .1); },
  win: () => [523, 659, 784, 1047].forEach((f, k) => tone(f, .3, 'triangle', .1, k * .14)),
  whoosh: () => tone(300, .5, 'sine', .05, 0, 900),
};

/* ================= renderer ================= */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: save.gfx !== 'low', powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera = new THREE.PerspectiveCamera(50, 1, .05, 400);
// bloom: the neon, the holograms and the lasers glow (HIGH graphics; LOW renders straight, for slow phones)
const BLOOM = save.gfx !== 'low';
let composer = null, renderPass = null, bloomPass = null;
if (BLOOM) { composer = new EffectComposer(renderer); renderPass = new RenderPass(new THREE.Scene(), camera); composer.addPass(renderPass);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), .35, .35, 1.0); composer.addPass(bloomPass); composer.addPass(new OutputPass()); }
function draw(scene, cam, bloom = .8) { if (!composer) { renderer.render(scene, cam); return; } renderPass.scene = scene; renderPass.camera = cam; bloomPass.strength = bloom; composer.render(); }
function resize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, save.gfx === 'low' ? 1.25 : 2));
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < .9 ? 62 : 50; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); }
  if (window.__hqReady) onHQResize();
}
addEventListener('resize', resize); resize();

/* ================= assets ================= */
const loader = new GLTFLoader();
const tryLoad = (url) => loader.loadAsync(url).catch(() => null);
const A = {};
async function loadAssets() {
  const bar = $('loadBar'); let done = 0; const list = [
    ['fox', 'models/foxino-spy.glb?v=1'], ['standin', 'models/foxino-standin.glb?v=1'], ['gun', 'models/stun-gun.glb?v=1'], ['room', 'models/hq-room.glb?v=1'],
    ['case', 'models/glass-case.glb?v=1'], ['globe', 'models/globe.glb?v=1'],
    ['bot', 'models/bolt-bot.glb?v=1'], ['secam', 'models/security-camera.glb?v=1'], ['emitter', 'models/laser-emitter.glb?v=1'], ['vaultdoor', 'models/vault-door.glb?v=1'], ['net', 'models/stun-net.glb?v=1'], ['magpie', 'models/magpie.glb?v=1'],
    ...MISSIONS.map((m) => ['art-' + m.artifactKey, `models/artifact-${m.artifactKey}.glb?v=1`]),
  ];
  const subs = ['Secure connection to HQ…', 'Decrypting mission files…', 'Charging the stun laser…', 'Scanning for Bolt-Bots…', 'Locating the Magpie…'];
  await Promise.all(list.map(async ([k, u]) => { A[k] = await tryLoad(u); done++; bar.style.width = (done / list.length * 100) + '%'; $('loadSub').textContent = subs[Math.min(subs.length - 1, Math.floor(done / list.length * subs.length))]; }));
}
// the models' "Glow" material becomes emissive; everything gets the game's look
function dress(root) {
  root.traverse((o) => {
    if (!o.isMesh) return; o.frustumCulled = !o.isSkinnedMesh;
    // "Glow" parts: full-bright in their own (vertex) colours, untouched by the lights; skinned meshes keep skinning
    const glowOf = (m) => { const g = new THREE.MeshBasicMaterial({ color: m.color ? m.color.clone().multiplyScalar(BLOOM ? 1.4 : 1.25) : 0xffffff, vertexColors: !!m.vertexColors, toneMapped: false, map: m.map || null }); g.name = m.name; return g; };
    if (Array.isArray(o.material)) o.material = o.material.map((m) => (m && /glow/i.test(m.name) ? glowOf(m) : m));
    else if (o.material && /glow/i.test(o.material.name)) o.material = glowOf(o.material);
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m && m.isMeshStandardMaterial) m.envMapIntensity = .6;
    if (/glass/i.test(o.name)) { o.material = new THREE.MeshPhysicalMaterial({ color: '#bfefff', transparent: true, opacity: .16, roughness: .05, metalness: 0, transmission: 0, depthWrite: false, side: THREE.DoubleSide }); o.renderOrder = 5; }
  });
  return root;
}
const fitHeight = (root, h) => { root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(root); const s = h / Math.max(.001, b.max.y - b.min.y); root.scale.multiplyScalar(s); root.updateMatrixWorld(true); const b2 = new THREE.Box3().setFromObject(root); root.position.y -= b2.min.y; return root; };

// Foxino: the Blender spy (rigged, animated) or the stand-in (the low-poly football Foxino, no clips)
function makeFoxino(withGun = true) {
  const src = A.fox || A.standin; const root = new THREE.Group();
  const inner = cloneSkinned(src.scene); dress(inner); fitHeight(inner, 1.4); root.add(inner);
  const mixer = new THREE.AnimationMixer(inner), clips = {}; for (const c of (A.fox ? A.fox.animations : [])) clips[c.name.toLowerCase()] = mixer.clipAction(c);
  let cur = null;
  const fox = { root, inner, mixer, hasClips: Object.keys(clips).length > 0, t: 0,
    play(name, fade = .25) { const a = clips[name.toLowerCase()] || clips.idle; if (!a || a === cur) return; a.reset().fadeIn(fade).play(); if (cur) cur.fadeOut(fade); cur = a; },
    update(dt, moving, speed) {
      fox.t += dt; mixer.update(dt);
      if (!fox.hasClips) { inner.position.y = moving ? Math.abs(Math.sin(fox.t * 11)) * .07 : Math.sin(fox.t * 2) * .01; inner.rotation.z = moving ? Math.sin(fox.t * 11) * .05 : 0; }
      else if (!fox.manual) fox.play(moving ? (speed > 3 ? 'run' : 'walk') : 'idle');
    } };
  if (withGun && A.gun && fox.hasClips) { const hand = findBone(inner, /RightHand$/); if (hand) { const g = dress(A.gun.scene.clone()); g.rotation.set(GUN_ROT[0], GUN_ROT[1], GUN_ROT[2]); g.position.set(GUN_POS[0], GUN_POS[1], GUN_POS[2]); hand.add(g); fox.gun = g; } }
  fox.play('idle', 0);
  return fox;
}
const GUN_ROT = [-Math.PI / 2, 0, 0], GUN_POS = [0, .06, .02];   // the stun gun in the right hand: its barrel (+Z) along the hand bone (+Y)
function findBone(root, re) { let b = null; root.traverse((o) => { if (!b && o.isBone && re.test(o.name.replace(/^mixamorig:?/, ''))) b = o; }); return b; }
// clone a skinned scene (bones re-bound), small version of SkeletonUtils.clone
function cloneSkinned(src) {
  const map = new Map(), out = src.clone(true);
  const a = [], b = []; src.traverse((o) => a.push(o)); out.traverse((o) => b.push(o)); a.forEach((o, i) => map.set(o, b[i]));
  b.forEach((o, i) => { if (o.isSkinnedMesh) { const s = a[i].skeleton; o.bind(new THREE.Skeleton(s.bones.map((x) => map.get(x)), s.boneInverses), a[i].bindMatrix); } });
  return out;
}

/* ================= little shared visuals ================= */
function glowTex(c1 = '255,255,255') { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, `rgba(${c1},1)`); gr.addColorStop(.25, `rgba(${c1},.6)`); gr.addColorStop(1, `rgba(${c1},0)`); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
const GLOW = glowTex();
const glowSprite = (color, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.scale.setScalar(size); return s; };
const blobShadow = (r = .5) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .35, depthWrite: false })); m.position.y = .02; return m; };
const neon = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(BLOOM ? 1.25 : 1), toneMapped: false });   // (over 1: the bloom picks it up)
function textSprite(text, color = '#5ff3ff', h = .22) {
  const cv = document.createElement('canvas'), g = cv.getContext('2d'); g.font = '700 64px Orbitron, Arial'; const w = Math.ceil(g.measureText(text).width) + 40; cv.width = w; cv.height = 96;
  g.font = '700 64px Orbitron, Arial'; g.textBaseline = 'middle'; g.shadowColor = color; g.shadowBlur = 18; g.fillStyle = color; g.fillText(text, 20, 50);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); s.scale.set(h * w / 96, h, 1); return s;
}

/* ================= UI helpers ================= */
const screens = ['hq', 'side', 'globe', 'hud'];
function showScreen(id) { for (const s of screens) $(s).classList.toggle('show', s === id); }
const overlay = (id, on) => $(id).classList.toggle('show', on);
let toastT = 0;
function toast(text, kind = 'info', ms = 1300) { const t = $('toast'); t.textContent = text; t.className = 'show ' + kind; clearTimeout(toastT); toastT = setTimeout(() => (t.className = kind), ms); }
function flash(kind) { const f = $('flash'); f.className = kind; requestAnimationFrame(() => requestAnimationFrame(() => (f.className = ''))); }
function speak(text) { if (!save.voice || !window.speechSynthesis) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = .95; const v = speechSynthesis.getVoices().find((x) => /en-GB/i.test(x.lang)); if (v) u.voice = v; speechSynthesis.speak(u); } catch (e) {} }

/* ================= questions: the chosen content packages ================= */
const PACKS = window.FugioPacks ? FugioPacks.sort(window.GUMMY_PACKAGES || []) : (window.GUMMY_PACKAGES || []);
let packIds = store.get('foxspy-packs', []).filter((id) => PACKS.some((p) => p.id === id));
if (!packIds.length && PACKS.length) packIds = [(PACKS.find((p) => p.level === 'A1') || PACKS[0]).id];
const packNow = () => (window.FugioPacks ? FugioPacks.merge(PACKS, packIds) : PACKS.find((p) => p.id === packIds[0])) || PACKS[0];
const Q = { used: new Set(), again: [], level: 0, askedSince: 0 };
function makeQuestion(s) {
  const m = s.match(/\[([^\]]+)\]/); if (!m) return null;
  const [right, ...wrong] = m[1].split('|'); let after = s.slice(m.index + m[0].length), hint = '';
  const h = after.match(/^\s*\(([^)]*)\)/); if (h) { hint = h[1]; after = after.slice(h[0].length); }
  return { src: s, before: s.slice(0, m.index), after, right, hint, opts: shuffle([{ text: right, ok: true }, ...shuffle(wrong).slice(0, 2).map((t) => ({ text: t, ok: false }))]) };
}
function nextQuestion() {
  Q.askedSince++;
  if (Q.again.length && Q.askedSince >= 2) { Q.askedSince = 0; return makeQuestion(Q.again.shift()); }   // (a missed one comes back two questions later)
  const pk = packNow(); if (!pk) return null;
  const ok = (q) => /\[[^\]]+\|[^\]]+\]/.test(q);
  const r = clamp(Q.level + (Math.random() < .3 ? 1 : 0), 0, 2);
  let pool = (pk.rounds[r] || []).filter((q) => ok(q) && !Q.used.has(q));
  if (!pool.length) pool = pk.rounds.flat().filter((q) => ok(q) && !Q.used.has(q));
  if (!pool.length) { Q.used.clear(); pool = pk.rounds.flat().filter(ok); }
  const s = pick(pool); Q.used.add(s); return makeQuestion(s);
}
// show one question in the gadget; resolves true / false after the answer has been shown
function ask({ kicker, title, visual }) {
  return new Promise((resolve) => {
    const q = nextQuestion(); if (!q) { resolve(true); return; }
    $('qKicker').textContent = kicker; $('qTitle').textContent = title; $('qVisual').innerHTML = visual ? visual() : '';
    const hint = q.hint ? ` <span class="hint">(${esc(q.hint)})</span>` : '';
    $('qSentence').innerHTML = `${esc(q.before)}<span class="gap">?</span>${hint}${esc(q.after)}`;
    $('qFeedback').textContent = ''; $('qFeedback').className = 'g-feedback';
    const box = $('qOpts'); box.innerHTML = ''; let done = false;
    q.opts.forEach((o) => { const b = document.createElement('button'); b.textContent = o.text; b.onclick = () => {
      if (done) return; done = true; save.answered++; mission && mission.stats.asked++;
      const gap = $('qSentence').querySelector('.gap'); gap.textContent = q.right;
      if (o.ok) { b.classList.add('right'); save.correct++; mission && mission.stats.right++; save.learned[q.right] = (save.learned[q.right] || 0) + 1; SFX.right(); $('qFeedback').textContent = pick(['Correct, agent!', 'Access granted!', 'Well done!', 'Code accepted!']); $('qFeedback').className = 'g-feedback ok'; }
      else { b.classList.add('wrong'); [...box.children].find((x) => x.textContent === q.right).classList.add('right'); SFX.wrong(); Q.again.push(q.src); Q.askedSince = 0; if (mission) mission.missed.push(q); $('qFeedback').innerHTML = `The right answer is <b>${esc(q.right)}</b>.`; $('qFeedback').className = 'g-feedback bad'; }
      persist(); setTimeout(() => { overlay('quiz', false); resolve(o.ok); }, o.ok ? 850 : 1900);
    }; box.appendChild(b); });
    overlay('quiz', true);
    if (window.FS_AUTO) setTimeout(() => { const k = window.FS_AUTO === 'wrong' ? q.opts.findIndex((o) => !o.ok) : q.opts.findIndex((o) => o.ok); box.children[k].click(); }, 150);
  });
}
async function askUntilRight(opts, onWrong) { for (;;) { const ok = await ask(opts); if (ok) return; if (onWrong) onWrong(); } }

/* ================= HQ ================= */
// Foxino's headquarters: the menu. Views: 'center' (Foxino and the hologram), 'left' (the Trophy Room gallery), 'right'
// (the Agent Stats board) and 'globe' (the interactive hologram: drag to spin it, tap a pin to fly to that mission).
// Every view is framed for the screen's own shape, so a phone held upright (9:16) gets its own camera positions.
const HQ = { scene: new THREE.Scene(), view: 'center', views: {}, pins: [], pillars: [], cases: [], arts: [], tw: null, globe: null, selected: null, mats: [], upd: [] };
HQ.scene.background = new THREE.Color('#040814'); HQ.scene.fog = new THREE.Fog('#040814', 16, 42);
const PORTRAIT = () => camera.aspect < .9;
function buildHQ() {
  const S = HQ.scene;
  S.add(new THREE.HemisphereLight('#7fb6ff', '#140a2a', .75));
  const key = new THREE.PointLight('#7af0ff', 34, 14, 1.6); key.position.set(0, 3.4, -2); S.add(key);
  const vio = new THREE.PointLight('#b57bff', 30, 18, 1.6); vio.position.set(-5, 3, 1); S.add(vio);
  const warm = new THREE.PointLight('#ffd9a8', 20, 14, 1.6); warm.position.set(2, 3, 4); S.add(warm);
  const pnk = new THREE.PointLight('#ff6ec7', 22, 14, 1.6); pnk.position.set(5, 3, -1); S.add(pnk);
  let screen = null;
  if (A.room) {
    const room = dress(A.room.scene); S.add(room);
    room.traverse((o) => { const m = o.name.match(/^Pillar_(\d)/); if (m) HQ.pillars[+m[1] - 1] = o; if (o.name === 'Screen') screen = o; if (o.name === 'ProjectorTable') HQ.table = o;
      if (o.name === 'Floor' && o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { if (m.isMeshStandardMaterial) { m.metalness = .6; m.roughness = .18; } }); } });
    room.updateMatrixWorld(true);
  }
  if (HQ.pillars.length < 5 || !screen) {
    // stand-in room (only if the Blender HQ is missing)
    const floor = new THREE.Mesh(new THREE.CircleGeometry(11, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0d1530', metalness: .7, roughness: .25 })); S.add(floor);
    const table = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.25, 1, 48), new THREE.MeshStandardMaterial({ color: '#16213f', metalness: .8, roughness: .3 })); table.position.set(0, .5, -2); S.add(table); HQ.table = table;
    for (let k = 0; k < 5; k++) { const p = new THREE.Group(); const col = new THREE.Mesh(new THREE.BoxGeometry(.6, 1.1, .6), new THREE.MeshStandardMaterial({ color: '#141d38', metalness: .7, roughness: .35 })); col.position.y = -.55; p.add(col); p.position.set(-7, 1.1, 3.2 - k * 1.6); S.add(p); HQ.pillars[k] = p; }
    if (!screen) { screen = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial()); screen.position.set(7.3, 2.1, 0); screen.rotation.y = -Math.PI / 2; S.add(screen); }
  }
  // the smart board: a canvas on the Screen mesh
  HQ.boardCv = document.createElement('canvas'); HQ.boardCv.width = 2048; HQ.boardCv.height = 1024; HQ.boardTex = new THREE.CanvasTexture(HQ.boardCv); HQ.boardTex.colorSpace = THREE.SRGBColorSpace; if (A.room) HQ.boardTex.flipY = false;   /* (the Blender Screen's UVs run the other way) */
  screen.material = new THREE.MeshBasicMaterial({ map: HQ.boardTex, toneMapped: false }); HQ.screen = screen; drawBoard();
  // glass cases, a spotlight cone over each, and the artifacts won so far
  HQ.pillars.forEach((p, k) => {
    p.updateMatrixWorld(true); const top = new THREE.Vector3(); p.getWorldPosition(top);
    const gc = A.case ? dress(A.case.scene.clone(true)) : new THREE.Group(); gc.position.copy(top); S.add(gc);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(.08, .42, 2.6, 24, 1, true), holoMat('#9ff3ff', .1)); HQ.mats.push(cone.material); cone.position.copy(top).add(new THREE.Vector3(0, 1.3, 0)); S.add(cone);
    const halo = glowSprite('#5ff3ff', 1.1); halo.position.copy(top).add(new THREE.Vector3(0, .2, 0)); halo.material.opacity = .3; S.add(halo);
    HQ.cases[k] = { top, gc, cone, halo };
  });
  refreshTrophies();
  // where things are: the projector table (the globe floats above it), the board, the trophy gallery
  const tb = new THREE.Box3().setFromObject(HQ.table);
  HQ.gc = new THREE.Vector3((tb.min.x + tb.max.x) / 2, tb.max.y + .92, (tb.min.z + tb.max.z) / 2);
  HQ.tableTop = tb.max.y;
  const sb = new THREE.Box3().setFromObject(screen); HQ.sc = sb.getCenter(new THREE.Vector3()); HQ.sw = Math.max(sb.max.z - sb.min.z, sb.max.x - sb.min.x);
  HQ.pc = HQ.pillars.reduce((a, p) => a.add(p.getWorldPosition(new THREE.Vector3())), new THREE.Vector3()).multiplyScalar(1 / HQ.pillars.length);
  HQ.pspan = Math.max(...HQ.pillars.map((p) => p.getWorldPosition(new THREE.Vector3()).distanceTo(HQ.pc))) * 2 + 1;
  // Foxino looking at the globe (the Blender spy plays LookAtGlobe: hand on chin, looking up to his left)
  const fp = HQ.FOX_AT = new THREE.Vector3(HQ.gc.x - 1.75, 0, HQ.gc.z + .55);
  HQ.fox = makeFoxino(false); S.add(HQ.fox.root); HQ.foxShadow = blobShadow(.45); S.add(HQ.foxShadow); placeHQFox();
  if (HQ.fox.hasClips) { HQ.fox.manual = true; HQ.fox.play('lookatglobe', 0); }
  const rim = new THREE.SpotLight('#9ff3ff', 26, 7, .45, .6, 1.4); rim.position.set(HQ.gc.x, 3.4, HQ.gc.z - .4); rim.target = HQ.fox.root; S.add(rim); HQ.rim = rim;
  buildGlobe(); buildMotes(); computeViews();
  // the opening shot: from high above the hologram down to Foxino
  const v = HQ.views.center; HQ.look = v.l.clone(); camera.position.copy(v.p).add(new THREE.Vector3(0, 3.2, 3.5)); camera.lookAt(HQ.look);
  HQ.tw = { to: 'center', p0: camera.position.clone(), l0: v.l.clone().add(new THREE.Vector3(0, 1.2, 0)), p1: v.p.clone(), l1: v.l.clone(), t: 0, d: 2.6 };
}
// the cameras for each view, fitted to the screen: what must be on screen is given as a width (and a height) at a distance
function fitDist(w, h) { const vt = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), ht = vt * camera.aspect; return Math.max(w / 2 / ht, h / 2 / vt); }
// where Foxino stands: beside the table on a wide screen; on a tall one in front of it, back three-quarters to us, looking up at
// the hologram above him (the shot stacks up the screen: Foxino and his tail at the bottom, the globe over his head)
function placeHQFox() {
  const g = HQ.gc, P = PORTRAIT(), f = HQ.FOX_AT = P ? new THREE.Vector3(g.x - .62, 0, g.z + 1.55) : new THREE.Vector3(g.x - 1.75, 0, g.z + .55);
  HQ.fox.root.position.copy(f); HQ.fox.root.rotation.y = P ? Math.PI + .95 : (HQ.fox.hasClips ? .15 : .75); HQ.foxShadow.position.set(f.x, .02, f.z);
}
function computeViews() {
  if (HQ.fox) placeHQFox();
  const g = HQ.gc, P = PORTRAIT(), f = HQ.FOX_AT;
  // centre: Foxino and the hologram together (on a tall screen the camera comes round so they stack up the screen)
  const cx = (f.x + g.x) / 2 - .15, dC = fitDist(6.2, 3.5);
  const center = P ? { p: new THREE.Vector3(g.x + .35, 1.05, g.z + 5.1), l: new THREE.Vector3(g.x - .12, 1.62, g.z) }
    : { p: new THREE.Vector3(cx + .3, 1.7, g.z + dC), l: new THREE.Vector3(cx, 1.35, g.z - .1) };
  // the globe close-up: the globe in the top half (tall screens: above the mission card) or on the left (wide screens: card on the right)
  const dG = P ? fitDist(1.75, 1.75) * 1.62 : fitDist(4.2, 2.9);
  const globe = P ? { p: new THREE.Vector3(g.x, g.y + .32, g.z + dG), l: new THREE.Vector3(g.x, g.y - .42, g.z) }
    : { p: new THREE.Vector3(g.x + .35, g.y + .15, g.z + dG), l: new THREE.Vector3(g.x + .78, g.y - .05, g.z) };
  // trophy gallery: all five cases; stats board: the whole board (wide screens) or its middle (the panel shows the numbers)
  const pc = HQ.pc, dir = new THREE.Vector3(HQ.gc.x - pc.x, 0, HQ.gc.z - pc.z).normalize(), dL = fitDist(HQ.pspan * (P ? .92 : 1.02), 2.2);
  const left = { p: pc.clone().addScaledVector(dir, dL).setY(P ? 2.4 : 1.75), l: pc.clone().setY(P ? 1.0 : 1.15) };
  // the board's facing: its face normal in the world (the mesh's own axes may point anywhere), turned toward the room
  const sc = HQ.sc, na = HQ.screen.geometry.attributes.normal, n = na ? new THREE.Vector3().fromBufferAttribute(na, 0).transformDirection(HQ.screen.matrixWorld) : new THREE.Vector3(-1, 0, 0);
  n.y = 0; n.normalize(); if (n.dot(new THREE.Vector3(g.x - sc.x, 0, g.z - sc.z)) < 0) n.negate();
  const dR = fitDist(P ? HQ.sw * .55 : HQ.sw * 1.08, 3.4);
  const right = { p: sc.clone().addScaledVector(n, dR).setY(sc.y - (P ? .2 : .05)), l: sc.clone().setY(sc.y - (P ? .25 : 0)) };
  HQ.views = { center, globe, left, right };
  // one glass case at a time (the Trophy Room walk): in front of the case, a little above it
  HQ.caseViews = HQ.cases.map((c) => { const away = new THREE.Vector3(HQ.gc.x - c.top.x, 0, HQ.gc.z - c.top.z).normalize(), side = new THREE.Vector3(-away.z, 0, away.x);
    const d = P ? 1.85 : 1.6; return { p: c.top.clone().addScaledVector(away, d).addScaledVector(side, .12).setY(c.top.y + (P ? .62 : .45)), l: c.top.clone().setY(c.top.y + (P ? .05 : .18)) }; });
  if (HQ.view === 'left' && HQ.tIdx >= 0) HQ.views.left = HQ.caseViews[HQ.tIdx];
}
function onHQResize() {
  if (!HQ.views.center) return; computeViews(); const v = HQ.views[HQ.view] || HQ.views.center;
  if (!HQ.tw) { camera.position.copy(v.p); HQ.look.copy(v.l); }
  document.body.classList.toggle('portrait', PORTRAIT());
}
function refreshTrophies() {
  HQ.arts.forEach((a) => a && a.parent && a.parent.remove(a)); HQ.arts = [];
  MISSIONS.forEach((m, k) => { const c = HQ.cases[k]; if (!c) return; const won = !!save.done[m.id];
    c.cone.visible = won; c.halo.material.color.set(won ? m.color : '#2a3a5c'); c.halo.material.opacity = won ? .45 : .18;
    if (!won) return; const a = artifactModel(m); a.position.copy(c.top).add(new THREE.Vector3(0, A.case ? .08 : .12, 0)); HQ.scene.add(a); HQ.arts[k] = a; });
}
function artifactModel(m) {
  const g = A['art-' + m.artifactKey]; if (g) return fitHeight(dress(g.scene.clone(true)), .3);
  const grp = new THREE.Group(); const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.13, 0), new THREE.MeshStandardMaterial({ color: m.color, emissive: m.color, emissiveIntensity: .6, metalness: .3, roughness: .15, flatShading: true })); gem.position.y = .16; grp.add(gem); const gs = glowSprite(m.color, .5); gs.position.y = .16; grp.add(gs); return grp;
}
// hologram material: see-through, glowing at the edges, scan lines, an optional latitude/longitude grid; with vertex colours
// (the Blender globe's land is coloured by biome) it tints them toward the hologram colour
function holoMat(color, a = .55, grid = 0, vc = false) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, vertexColors: vc,
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uA: { value: a }, uGrid: { value: grid }, uVC: { value: vc ? 1 : 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vC; void main(){ vP = position; vC = vec3(1.0);
      #ifdef USE_COLOR
      vC = color.rgb;
      #endif
      vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uTime, uA, uGrid, uVC; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vC;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0); float scan = 0.78 + 0.22 * sin(vP.y * 70.0 - uTime * 3.0);
        float g = 0.0; if (uGrid > 0.5) { vec3 n = normalize(vP); float lat = asin(clamp(n.y,-1.0,1.0)); float lon = atan(n.x, n.z); g = max(smoothstep(0.965, 1.0, abs(cos(lat * 9.0))), smoothstep(0.975, 1.0, abs(cos(lon * 9.0)))) * 0.4; }
        vec3 base = mix(uColor, mix(uColor, vC * 1.6, 0.55), uVC);
        gl_FragColor = vec4(base * (f * 1.25 + 0.14 + g) * scan, (f + 0.14 + g) * uA); }` });
}
// a soft additive halo that is brightest at the rim (the globe's atmosphere)
const atmoMat = (color) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, toneMapped: false,
  uniforms: { uColor: { value: new THREE.Color(color) } },
  vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(max(0.0, dot(normalize(vN), normalize(vV))), 3.0); gl_FragColor = vec4(uColor * f * .8, f * .8); }` });
// a flowing dashed line (the routes between the missions): dashes run along the line over time
const flowMat = (color) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } },
  vertexShader: `attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 uColor; uniform float uTime; varying float vT; void main(){ float d = fract(vT * 14.0 - uTime * 0.8); float a = smoothstep(0.0, 0.15, d) * (1.0 - smoothstep(0.55, 0.7, d)); float edge = smoothstep(0.0, 0.06, vT) * (1.0 - smoothstep(0.94, 1.0, vT)); gl_FragColor = vec4(uColor * (0.5 + a * 1.6), (0.25 + a) * edge); }` });
const llDir = (lat, lon) => { const la = THREE.MathUtils.degToRad(lat), lo = THREE.MathUtils.degToRad(lon); return new THREE.Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)); };
function buildGlobe() {
  const G = new THREE.Group(); G.position.copy(HQ.gc); HQ.scene.add(G); HQ.globe = G; const R = .68; HQ.R = R;
  const spin = new THREE.Group(); spin.rotation.order = 'XYZ'; spin.rotation.x = .3; G.add(spin); HQ.spin = spin; const M = (m) => (HQ.mats.push(m), m);
  if (A.globe) A.globe.scene.traverse((o) => { if (!o.isMesh) return; const land = /land/i.test(o.name);
    const m = new THREE.Mesh(o.geometry, land ? M(holoMat('#7af8ff', .95, 0, !!o.geometry.attributes.color)) : M(holoMat('#2a7cff', .38, 1))); m.scale.setScalar(R * (land ? 1.004 : 1)); spin.add(m); });
  else spin.add(new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), M(holoMat('#3a9cff', .45, 1))));
  spin.add(new THREE.Mesh(new THREE.SphereGeometry(R * .985, 40, 28), new THREE.MeshBasicMaterial({ color: '#051a38', transparent: true, opacity: .5, depthWrite: false })));
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.18, 48, 32), atmoMat('#3fb8ff')); G.add(atmo);
  // the light beam from the projector up to the globe, and a glowing disc on the table
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(R * .95, .95, HQ.gc.y - HQ.tableTop - R * .2, 48, 1, true), M(holoMat('#5ff3ff', .16))); beam.position.y = -(HQ.gc.y - HQ.tableTop) / 2 - R * .1; G.add(beam);
  const disc = glowSprite('#5ff3ff', 1.9); disc.position.y = -(HQ.gc.y - HQ.tableTop) + .02; disc.material.opacity = .55; G.add(disc);
  // a scanning ring that sweeps up and down the globe, and two tilted orbits with satellites
  const scanRing = new THREE.Mesh(new THREE.TorusGeometry(R * 1.02, .005, 6, 120).rotateX(Math.PI / 2), neon('#9ff3ff')); G.add(scanRing);
  const orbits = [[1.32, .45, .2, '#b57bff'], [1.46, -.35, -.15, '#5ff3ff']].map(([r, tx, tz, c]) => {
    const o = new THREE.Group(); o.rotation.set(tx, 0, tz); G.add(o);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R * r, .0035, 6, 160), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .55, toneMapped: false })); ring.rotation.x = Math.PI / 2; o.add(ring);
    const sat = glowSprite(c, .14); o.add(sat); return { o, sat, r: R * r, sp: rand(.25, .45) * (Math.random() < .5 ? -1 : 1), a: rand(0, 6) }; });
  // routes: arcs from mission to mission over the globe, with dashes flowing along them
  for (let k = 0; k < MISSIONS.length - 1; k++) {
    const a = llDir(MISSIONS[k].lat, MISSIONS[k].lon), b = llDir(MISSIONS[k + 1].lat, MISSIONS[k + 1].lon), pts = [], ts = [], n = 64, ang = a.angleTo(b);
    for (let i = 0; i <= n; i++) { const t = i / n, v = a.clone().lerp(b, t).normalize(); pts.push(v.multiplyScalar(R * (1.01 + Math.sin(t * Math.PI) * (.12 + ang * .08)))); ts.push(t); }
    const curve = new THREE.CatmullRomCurve3(pts), geo = new THREE.TubeGeometry(curve, 96, .0045, 6, false);
    const tAttr = []; const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) tAttr.push(Math.floor(i / 7) / 96); geo.setAttribute('aT', new THREE.Float32BufferAttribute(tAttr, 1));
    spin.add(new THREE.Mesh(geo, M(flowMat(MISSIONS[k + 1].color))));
  }
  // the mission pins: a beacon of light, a pulsing ring, a bright head, its number; won missions get a gold star
  MISSIONS.forEach((m) => {
    const dir = llDir(m.lat, m.lon), col = new THREE.Color(m.color);
    const pin = new THREE.Group(); pin.position.copy(dir).multiplyScalar(R * 1.005); pin.lookAt(dir.clone().multiplyScalar(5)); spin.add(pin);
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.006, .02, .22, 12, 1, true).rotateX(Math.PI / 2).translate(0, 0, .11), M(holoMat(m.color, .9))); pin.add(beacon);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.028, .036, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false })); pin.add(ring);
    const ring2 = ring.clone(); ring2.material = ring.material.clone(); pin.add(ring2);
    const head = glowSprite(col, .17); head.position.z = .23; pin.add(head);
    const num = textSprite(`${m.n}`, '#ffffff', .07); num.position.z = .23; num.renderOrder = 3; num.material.depthTest = false; pin.add(num);
    const star = textSprite('★', '#ffd36e', .07); star.position.set(.05, .05, .23); star.visible = !!save.done[m.id]; pin.add(star);
    const label = new THREE.Object3D(); label.position.z = .3; pin.add(label);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(.075, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.z = .18; hit.userData.mission = m; pin.add(hit);
    HQ.pins.push({ m, pin, head, ring, ring2, beacon, star, label, hit, dir });
  });
  HQ.upd.push((dt, t) => {
    scanRing.position.y = Math.sin(t * .7) * R * .92; const s = Math.sqrt(Math.max(0, 1 - (scanRing.position.y / (R * 1.02)) ** 2)); scanRing.scale.set(Math.max(.05, s), 1, Math.max(.05, s));
    for (const o of orbits) { o.a += dt * o.sp; o.sat.position.set(Math.cos(o.a) * o.r, 0, Math.sin(o.a) * o.r); }
    disc.material.opacity = .28 + Math.sin(t * 2) * .06;
  });
}
// slow glowing dust in the air of the room
function buildMotes() {
  const n = save.gfx === 'low' ? 140 : 320, pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos.set([HQ.gc.x + rand(-7, 7), rand(.2, 4.6), HQ.gc.z + rand(-5, 6)], i * 3); seed[i] = Math.random() * 6.28; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float aS; uniform float uTime, uPx; varying float vA; void main(){ vec3 p = position; p.y += sin(uTime * .3 + aS) * .25; p.x += cos(uTime * .2 + aS * 1.7) * .2; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * (3.0 + 2.0 * sin(aS * 3.0)) * (6.0 / -mv.z); vA = 0.35 + 0.35 * sin(uTime * 1.3 + aS * 5.0); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(.55, .95, 1.0) * 1.4, smoothstep(.5, .0, d) * vA); }` });
  HQ.mats.push(m); HQ.scene.add(new THREE.Points(g, m));
}
function drawBoard() {
  const cv = HQ.boardCv, g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#071433'); bg.addColorStop(1, '#130a33'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(95,243,255,.08)'; g.lineWidth = 2; for (let x = 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const T = (t, x, y, size, col = '#e8f7ff', w = 700, align = 'left') => { g.font = `${w} ${size}px Orbitron, Arial`; g.fillStyle = col; g.textAlign = align; g.shadowColor = col; g.shadowBlur = 14; g.fillText(t, x, y); g.shadowBlur = 0; };
  T('AGENT FOXINO', 80, 120, 64, '#5ff3ff', 900); T('RANK: ' + rankName().toUpperCase(), 80, 190, 40, '#ffd36e');
  const acc = save.answered ? Math.round(save.correct / save.answered * 100) : 0;
  const tiles = [['MISSIONS', `${missionsDone()} / 5`], ['STARS', `${totalStars()} / 15`], ['ANSWERS', `${save.answered}`], ['ACCURACY', `${acc} %`], ['WORDS LEARNED', `${Object.keys(save.learned).length}`], ['TIME AS AGENT', `${Math.round(save.time / 60)} min`]];
  tiles.forEach(([k, v], i) => { const x = 80 + (i % 3) * 420, y = 270 + Math.floor(i / 3) * 210; g.fillStyle = 'rgba(95,243,255,.07)'; g.strokeStyle = 'rgba(95,243,255,.45)'; g.lineWidth = 3; g.beginPath(); g.roundRect(x, y, 380, 170, 24); g.fill(); g.stroke(); T(k, x + 28, y + 52, 26, '#8fb3d6', 700); T(v, x + 28, y + 128, 64, '#e8f7ff', 900); });
  T('MISSIONS', 1400, 120, 40, '#b57bff', 900);
  MISSIONS.forEach((m, i) => { const y = 200 + i * 150, d = save.done[m.id]; g.fillStyle = d ? 'rgba(77,255,166,.08)' : 'rgba(255,255,255,.03)'; g.strokeStyle = d ? 'rgba(77,255,166,.5)' : 'rgba(143,179,214,.25)'; g.beginPath(); g.roundRect(1400, y, 560, 120, 20); g.fill(); g.stroke();
    T(`${m.n}. ${m.name.toUpperCase()}`, 1430, y + 50, 28, d ? '#e8f7ff' : '#8fb3d6'); T(m.place, 1430, y + 92, 22, '#8fb3d6', 600);
    T(d ? '★'.repeat(d.stars) + '☆'.repeat(3 - d.stars) : 'NOT DONE YET', 1940, y + 94, d ? 30 : 18, d ? '#ffd36e' : '#55607a', 700, 'right'); });
  g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(80, 760, 1200, 26); g.fillStyle = '#4dffa6'; g.shadowColor = '#4dffa6'; g.shadowBlur = 16; g.fillRect(80, 760, 12 * acc, 26); g.shadowBlur = 0;
  T('ACCURACY', 80, 740, 24, '#8fb3d6');
  const pk = window.FugioPacks ? FugioPacks.summary(PACKS, packIds) : { title: '', sub: '' }; T('QUESTIONS: ' + pk.title, 80, 880, 26, '#8fb3d6', 600);
  if (HQ.boardTex) HQ.boardTex.needsUpdate = true;
  renderStatsPanel();
}
// the same stats as a readable panel (on a tall phone the wall board is too small to read)
function renderStatsPanel() {
  const acc = save.answered ? Math.round(save.correct / save.answered * 100) : 0;
  $('statsPanel').innerHTML = `<div class="sp-head"><i>AGENT FILE</i><b>Agent Foxino</b><span>${esc(rankName())}</span></div>
    <div class="sp-grid">${[['Missions', `${missionsDone()}/5`], ['Stars', `${totalStars()}/15`], ['Accuracy', `${acc}%`], ['Answers', save.answered], ['Words learned', Object.keys(save.learned).length], ['Time as agent', `${Math.round(save.time / 60)} min`]].map(([k, v]) => `<div><i>${k}</i><b>${v}</b></div>`).join('')}</div>
    <div class="sp-bar"><i style="width:${acc}%"></i></div>
    <div class="sp-list">${MISSIONS.map((m) => { const d = save.done[m.id]; return `<div class="${d ? 'won' : ''}" style="--c:${m.color}"><em>${m.n}</em><span><b>${esc(m.name)}</b>${esc(m.place)}</span><u>${d ? '★'.repeat(d.stars) + '☆'.repeat(3 - d.stars) : '—'}</u></div>`; }).join('')}</div>`;
}
// the Trophy Room: i = −1 the whole gallery (wide screens start there), 0..4 one case close up
HQ.tIdx = -1;
function setTrophy(i) {
  HQ.tIdx = i; computeViews(); const to = i < 0 ? HQ.views.left : HQ.caseViews[i]; HQ.views.left = to;
  HQ.tw = { to: 'left' + i, p0: camera.position.clone(), l0: HQ.look.clone(), p1: to.p.clone(), l1: to.l.clone(), t: 0, d: .9 }; SFX.whoosh();
  $('labels').innerHTML = ''; $('labels').style.display = i < 0 ? '' : 'none';
  const m = MISSIONS[Math.max(0, i)], d = save.done[m.id], card = $('tCard');
  if (i < 0) { card.innerHTML = `<i>THE TROPHY ROOM</i><b>${missionsDone()} of 5 artifacts</b><span>Tap a case to look closer</span>`; card.style.setProperty('--c', '#5ff3ff'); }
  else { card.style.setProperty('--c', m.color); card.innerHTML = d ? `<i>MISSION ${m.n} · ${esc(m.place.toUpperCase())}</i><b>${esc(m.artifact)}</b><span class="st">${'★'.repeat(d.stars)}${'☆'.repeat(3 - d.stars)}</span><span>Won back from the Magpie in “${esc(m.name)}”.</span>`
      : `<i>MISSION ${m.n} · ${esc(m.place.toUpperCase())}</i><b>Empty case</b><span>Finish “${esc(m.name)}” to bring the ${esc(m.artifact)} home.</span><button class="holo-btn small" id="tPlay">PLAY MISSION ${m.n}</button>`;
    const tp = $('tPlay'); if (tp) tp.onclick = () => { setView('globe'); setTimeout(() => selectMission(m), 650); }; }
}
function setView(v) {
  if (HQ.tw && HQ.tw.to === v) return; SFX.whoosh(); computeViews();
  if (v === 'left') { HQ.tIdx = PORTRAIT() ? 0 : -1; if (HQ.tIdx >= 0) HQ.views.left = HQ.caseViews[0]; }
  const to = HQ.views[v]; HQ.tw = { to: v, p0: camera.position.clone(), l0: HQ.look.clone(), p1: to.p.clone(), l1: to.l.clone(), t: 0, d: v === 'globe' || HQ.view === 'globe' ? 1.3 : 1.0 }; HQ.view = v;
  document.body.dataset.view = v;
  if (v === 'center') { showScreen('hq'); updateHQText(); HQ.selected = null; HQ.spinTo = null; }
  else if (v === 'globe') { showScreen('globe'); renderMissionList(); $('card').classList.add('hidden-card'); $('globeHint').classList.remove('gone'); }
  else { showScreen('side'); $('sideTitle').textContent = v === 'left' ? 'TROPHY ROOM' : 'AGENT STATS'; if (v === 'right') drawBoard(); $('statsPanel').classList.toggle('show', v === 'right'); $('trophyNav').classList.toggle('show', v === 'left'); $('labels').innerHTML = ''; if (v === 'left') { const keep = HQ.tw; setTrophy(HQ.tIdx); HQ.tw = keep; } }
}
function updateHQText() { $('hqRank').textContent = rankName(); $('hqStars').textContent = `${totalStars()} ★ · ${missionsDone()}/5`; $('hqHint').textContent = missionsDone() === 5 ? 'Every artifact is home. Play again for 3 stars!' : missionsDone() ? `${5 - missionsDone()} missions left. The Magpie is still out there!` : 'Agent Foxino is waiting for his first mission'; }
function renderMissionList() {
  $('missionList').innerHTML = MISSIONS.map((m) => { const d = save.done[m.id]; return `<button class="m-chip${HQ.selected === m ? ' on' : ''}${d ? ' won' : ''}" data-id="${m.id}" style="--c:${m.color}"><i>${m.n}</i><div><b>${esc(m.name)}</b><span>${esc(m.place)}</span></div><em>${d ? '★'.repeat(d.stars) : ''}</em></button>`; }).join('');
  $('missionList').querySelectorAll('.m-chip').forEach((b) => (b.onclick = () => selectMission(MISSIONS.find((m) => m.id === b.dataset.id))));
}
function selectMission(m) {
  SFX.click(); HQ.selected = m; renderMissionList(); $('globeHint').classList.add('gone');
  const on = $('missionList').querySelector('.m-chip.on'); if (on) on.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  $('cardN').textContent = `MISSION ${m.n} · ${m.where.toUpperCase()}`; $('cardName').textContent = m.name; $('cardPlace').textContent = m.place; $('cardStory').textContent = m.story;
  $('cardTime').textContent = `⏱ ${m.mins} min`; $('cardArt').textContent = `◆ ${m.artifact}`; const d = save.done[m.id]; $('cardBest').textContent = d ? `Best: ${'★'.repeat(d.stars)}${'☆'.repeat(3 - d.stars)}` : 'New mission';
  $('card').style.setProperty('--c', m.color); const c = $('card'); c.classList.add('hidden-card'); void c.offsetWidth; c.classList.remove('hidden-card');
  HQ.spinTo = spinFor(m); HQ.vel = { x: 0, y: 0 };
}
// the globe turn that brings a mission's pin to face the camera (a little tilt for places far north or south)
const spinFor = (m) => ({ x: THREE.MathUtils.degToRad(m.lat) * .8, y: -THREE.MathUtils.degToRad(m.lon) });
function hqFrame(dt, t) {
  for (const mm of HQ.mats) mm.uniforms.uTime.value = t;
  for (const f of HQ.upd) f(dt, t);
  const s = HQ.spin.rotation, drag = HQ.drag;
  if (drag && drag.on) { /* the finger turns it */ }
  else if (HQ.spinTo) { let dy = HQ.spinTo.y - s.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); s.y += dy * Math.min(1, dt * 3.2); s.x += (HQ.spinTo.x - s.x) * Math.min(1, dt * 3.2); }
  else if (HQ.vel && (Math.abs(HQ.vel.y) > .002 || Math.abs(HQ.vel.x) > .002)) { s.y += HQ.vel.y * dt * 60; s.x = clamp(s.x + HQ.vel.x * dt * 60, -1.1, 1.1); HQ.vel.y *= Math.pow(.05, dt); HQ.vel.x *= Math.pow(.05, dt); }
  else { s.y += dt * (HQ.view === 'globe' ? .06 : .14); s.x += (.3 - s.x) * dt * .5; }
  for (const p of HQ.pins) { const sel = HQ.selected === p.m, k = (t * .8 + p.m.n * .23) % 1, k2 = (k + .5) % 1;
    p.ring.scale.setScalar(1 + k * (sel ? 3.4 : 2)); p.ring.material.opacity = (1 - k) * .9; p.ring2.scale.setScalar(1 + k2 * (sel ? 3.4 : 2)); p.ring2.material.opacity = (1 - k2) * .9;
    p.head.scale.setScalar(sel ? .3 + Math.sin(t * 6) * .03 : (HQ.selected ? .13 : .17)); p.beacon.scale.set(sel ? 1.6 : 1, sel ? 1.6 : 1, sel ? 1.6 : 1); p.head.position.z = sel ? .35 : .23; p.head.material.opacity = HQ.selected && !sel ? .6 : 1;
 p.star.visible = !!save.done[p.m.id]; }
  placePinTag();
  HQ.arts.forEach((a) => a && (a.rotation.y += dt * .8));
  HQ.cases.forEach((c, k) => { if (c.cone.visible) c.cone.material.uniforms.uA.value = .08 + Math.sin(t * 1.5 + k) * .025; });
  HQ.fox.update(dt, false, 0);
  if (HQ.tw) { const w = HQ.tw; w.t = Math.min(1, w.t + dt / w.d); const k = ease(w.t); camera.position.lerpVectors(w.p0, w.p1, k); HQ.look.lerpVectors(w.l0, w.l1, k); if (w.t >= 1) HQ.tw = null; }
  else if (HQ.view === 'center') { const v = HQ.views.center; camera.position.x = v.p.x + Math.sin(t * .2) * .12; camera.position.y = v.p.y + Math.sin(t * .27) * .04; }
  camera.lookAt(HQ.look);
  if (HQ.view === 'left' && !HQ.tw && HQ.tIdx < 0) placeLabels();
}
// the lock-on tag over the chosen pin: a reticle and the place name, in the page (always sharp), following the pin
function placePinTag() {
  const el = $('pinTag'), p = HQ.selected && HQ.view === 'globe' && !HQ.tw && HQ.pins.find((q) => q.m === HQ.selected);
  if (!p) { el.classList.remove('show'); return; }
  const w = p.label.getWorldPosition(new THREE.Vector3()), front = w.clone().sub(HQ.gc).dot(camera.position.clone().sub(HQ.gc)) > 0, v = w.project(camera);
  if (!front) { el.classList.remove('show'); return; }
  if (el.dataset.id !== p.m.id) { el.dataset.id = p.m.id; el.style.setProperty('--c', p.m.color); el.innerHTML = `<i></i><b>${esc(p.m.place.split(',')[0].toUpperCase())}</b><span>${p.m.lat.toFixed(1)}° ${p.m.lat >= 0 ? 'N' : 'S'} · ${Math.abs(p.m.lon).toFixed(1)}° ${p.m.lon >= 0 ? 'E' : 'W'}</span>`; el.classList.remove('show'); void el.offsetWidth; }
  el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px'; el.classList.add('show');
}
function placeLabels() {
  const box = $('labels'); if (!box.childElementCount) box.innerHTML = MISSIONS.map((m) => { const d = save.done[m.id]; return `<div class="plate${d ? '' : ' locked'}" style="--c:${m.color}"><b>${d ? esc(m.artifact) : 'LOCKED'}</b>${d ? `<i>${'★'.repeat(d.stars)}${'☆'.repeat(3 - d.stars)}</i>` : `<span>${esc(m.place)}</span>`}</div>`; }).join('');
  [...box.children].forEach((el, k) => { el.onclick = () => setTrophy(k); });
  MISSIONS.forEach((m, k) => { const c = HQ.cases[k]; if (!c) return; const v = c.top.clone().add(new THREE.Vector3(0, -.32, 0)).project(camera); const el = box.children[k]; el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px'; el.style.display = v.z < 1 ? '' : 'none'; });
}
// the globe is touchable: drag to spin it (it keeps turning a little when let go), tap a pin to fly to that mission
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
HQ.drag = { on: false }; HQ.vel = { x: 0, y: 0 };
canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'hq' || HQ.view !== 'globe' || anyOverlay()) return;
  HQ.drag = { on: true, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  const d = HQ.drag; if (!d.on || e.pointerId !== d.id) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY; d.moved += Math.abs(dx) + Math.abs(dy);
  if (d.moved > 8) { HQ.spinTo = null; const k = 3.2 / Math.min(innerWidth, innerHeight); HQ.spin.rotation.y += dx * k; HQ.spin.rotation.x = clamp(HQ.spin.rotation.x + dy * k, -1.1, 1.1); HQ.vel = { x: dy * k, y: dx * k }; $('globeHint').classList.add('gone'); }
});
const endDrag = (e) => {
  const d = HQ.drag; if (!d.on || e.pointerId !== d.id) return; d.on = false;
  if (d.moved <= 8) { mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(HQ.pins.map((p) => p.hit), false)[0]; if (hit) selectMission(hit.object.userData.mission); }
};
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
// on the HQ screen itself, a tap on the hologram opens the mission select
canvas.addEventListener('click', (e) => {
  if (mode !== 'hq' || HQ.view !== 'center' || anyOverlay() || HQ.tw) return;
  mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(mouse, camera);
  const s = new THREE.Sphere(HQ.gc, HQ.R * 1.3); if (ray.ray.intersectsSphere(s)) { SFX.click(); setView('globe'); }
});

/* ================= missions ================= */
let mode = 'loading', mission = null, room = null;
async function startMission(m) {
  SFX.click(); mission = { m, stage: 0, stats: { asked: 0, right: 0, spotted: 0 }, missed: [], t0: performance.now() };
  Q.level = clamp(Math.floor((m.n - 1) / 2), 0, 2); Q.again = [];
  if (!(m.id in A.kits)) { toast('LOADING MISSION…', 'info', 4000); await loadKit(m.id); $('toast').className = ''; }
  $('hudMission').textContent = `MISSION ${m.n} · ${m.name.toUpperCase()}`;
  await runStages();
}
async function runStages() {
  const m = mission.m;
  while (mission && mission.stage < m.stages.length) {
    const st = m.stages[mission.stage];
    if (st.type === 'brief') await briefing(st);
    else if (st.type === 'decode') await decode(st);
    else if (st.type === 'vault') await vault(st);
    else { const ok = await playRoom(st); if (!mission) return; if (!ok) continue; }   // (a failed room is played again)
    if (!mission) return; mission.stage++;
  }
  if (mission) finishMission();
}
function stageBackdrop() { // the HQ hologram view stays behind the story screens
  mode = 'hq'; showScreen(null); HQ.view = 'globe'; HQ.tw = null; computeViews(); const gv = HQ.views.globe; camera.position.copy(gv.p); HQ.look.copy(gv.l); if (mission) { const m = mission.m; HQ.selected = m; HQ.spinTo = spinFor(m); }
}
function magpieSet(kind) {
  if (!A.magpie) return null; const set = makeSet('#0e1120'), mp = new THREE.Group(), rg = rigged(A.magpie, 1.5); mp.add(rg.inner); set.S.add(mp); rg.play(kind === 'caught' ? 'caught' : 'laugh', 0);
  if (kind === 'caught' && A.net) { const n = A.net.scene.clone(true); dress(n); set.S.add(n); }   // (the net is modelled to fit over her sitting)
  const glow = glowSprite('#b57bff', 6); glow.position.set(0, 1, -1.5); glow.material.opacity = .35; set.S.add(glow);
  const P = camera.aspect < .9; set.cam.position.set(.35, P ? 1.2 : 1.05, P ? 4.1 : 2.5); set.cam.lookAt(0, P ? .2 : .45, 0);   // (she stands in the top half, over the story panel)
  const sp = new THREE.SpotLight('#ffe9c8', 30, 12, .5, .5, 1.2); sp.position.set(1.5, 4, 3); sp.target.position.set(0, .7, 0); set.S.add(sp, sp.target); const fill = new THREE.PointLight('#b57bff', 18, 8, 1.5); fill.position.set(-1.6, 1.4, 1.2); set.S.add(fill); set.upd.push((dt, t) => { rg.mixer.update(dt); mp.rotation.y = Math.sin(t * .4) * .25; });
  return set;
}
function briefing(st) {
  return new Promise((resolve) => {
    stageBackdrop(); if (st.scene) { SET = magpieSet(st.scene); if (SET) { mode = 'set'; $('brief').classList.add('low'); } } $('briefKicker').textContent = mission.stage === 0 ? `MISSION ${mission.m.n} · ${mission.m.place.toUpperCase()}` : 'MESSAGE FROM HQ';
    $('briefTitle').textContent = st.title; $('briefText').textContent = st.text; overlay('brief', true); speak(st.text);
    $('briefSpeak').onclick = () => speak(st.text);
    $('briefGo').onclick = () => { SFX.click(); try { speechSynthesis.cancel(); } catch (e) {} overlay('brief', false); $('brief').classList.remove('low'); SET = null; if (mode === 'set') mode = 'hq'; resolve(); };
  });
}
async function decode(st) {
  stageBackdrop(); const done = [];
  for (let k = 0; k < st.n; k++) {
    await askUntilRight({ kicker: 'DECODER · ' + st.title.toUpperCase(), title: k === 0 ? st.text : `Line ${k + 1} of ${st.n}: fill in the missing word.`,
      visual: () => `<div class="msg">${done.map((s) => esc(s)).join('<br>')}${done.length ? '<br>' : ''}${Array.from({ length: st.n - done.length }, () => '<span class="redact">██████ ███ ██████████</span>').join('<br>')}</div>` });
    done.push(lastSentence());
  }
  toast('MESSAGE DECODED', 'ok');
  await wait(700);
}
let lastQ = '';
const lastSentence = () => $('qSentence').textContent.replace(/\s*\([^)]*\)/, '');
// a stage with its own little 3D set (the vault door, the Magpie caught): rendered instead of the HQ while it lasts
let SET = null;
function makeSet(fog = '#0b1024') {
  const S = new THREE.Scene(); S.background = new THREE.Color(fog); S.fog = new THREE.Fog(fog, 8, 30);
  S.add(new THREE.HemisphereLight('#cfe3ff', '#20142e', .9)); const k = new THREE.DirectionalLight('#ffffff', 1.1); k.position.set(3, 6, 5); S.add(k);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(12, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#141a30', metalness: .6, roughness: .3 })); S.add(fl);
  return { S, cam: new THREE.PerspectiveCamera(50, camera.aspect, .05, 100), upd: [] };
}
function vaultSet() {
  if (!A.vaultdoor) return null; const set = makeSet(mission.m.theme.fog), v = A.vaultdoor.scene.clone(true); dress(v); set.S.add(v);
  const b = new THREE.Box3().setFromObject(v), h = b.max.y - b.min.y; set.door = v.getObjectByName('Door'); set.wheel = v.getObjectByName('Wheel');
  const P = camera.aspect < .9; set.cam.position.set(0, h * .5, h * (P ? 3.4 : 2.6)); set.cam.lookAt(0, h * (P ? -.05 : .12), 0); set.spin = 0; set.open = 0;   // (the door sits in the top half, over the question panel)
  const pl = new THREE.PointLight('#bfe9ff', 40, 14, 1.4); pl.position.set(1.5, h * .9, h * .9); set.S.add(pl); const rim = glowSprite(mission.m.theme.trim, h * 2.2); rim.position.set(0, h * .47, -.4); rim.material.opacity = .25; set.S.add(rim);
  set.upd.push((dt) => { if (set.wheel) set.wheel.rotation.z += (set.spin - set.wheel.rotation.z) * Math.min(1, dt * 4); if (set.door && set.open) set.door.rotation.y = lerp(set.door.rotation.y, -1.7, Math.min(1, dt * 1.6)); });
  return set;
}
async function vault(st) {
  stageBackdrop(); SET = vaultSet(); if (SET) { mode = 'set'; $('quiz').classList.add('low'); }
  const code = Array.from({ length: st.n }, () => Math.floor(rand(0, 10))); let got = 0, angle = 0;
  const vis = () => `<div class="dial" style="transform:rotate(${angle}deg)"><b>${got < st.n ? '?' : '✓'}</b></div><div class="code">${code.map((c, i) => `<span class="${i < got ? 'on' : ''}">${i < got ? c : '•'}</span>`).join('')}</div>`;
  while (got < st.n) {
    const ok = await ask({ kicker: 'VAULT · ' + st.title.toUpperCase(), title: got === 0 ? st.text : `Number ${got + 1} of ${st.n}`, visual: vis });
    if (ok) { got++; angle += 360 + code[got - 1] * 36; SFX.door(); if (SET) { SET.spin += Math.PI * 1.5; toast(`${got} / ${st.n}  ·  ${code.slice(0, got).join(' ')}`, 'ok', 900); } } else angle -= 40;
  }
  $('qVisual').innerHTML = vis(); toast('VAULT OPEN!', 'ok'); SFX.door();
  if (SET) { SET.open = 1; await wait(1800); } else { flash('white'); await wait(900); }
  $('quiz').classList.remove('low'); SET = null; mode = 'hq';
}
function finishMission() {
  const m = mission.m, s = mission.stats, secs = (performance.now() - mission.t0) / 1000, acc = s.asked ? s.right / s.asked : 1;
  const stars = 1 + (acc >= .7 ? 1 : 0) + (s.spotted <= 2 ? 1 : 0);
  const prev = save.done[m.id]; const first = !prev;
  save.done[m.id] = { stars: Math.max(stars, prev ? prev.stars : 0), time: prev ? Math.min(prev.time, secs) : secs, acc };
  for (const q of mission.missed) save.missed[q.right] = (save.missed[q.right] || 0) + 1;
  persist(); SFX.win(); disposeRoom();
  $('repName').textContent = m.name; $('repStars').innerHTML = [0, 1, 2].map((k) => `<span class="${k < stars ? '' : 'off'}">★</span>`).join('');
  $('repTime').textContent = `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`; $('repAcc').textContent = `${Math.round(acc * 100)} %`; $('repSpot').textContent = `${s.spotted}×`;
  $('repArt').textContent = first ? `◆ The ${m.artifact} is now in your Trophy Room!` : `◆ The ${m.artifact} is safe in your Trophy Room.`;
  const miss = [...new Map(mission.missed.map((q) => [q.src, q])).values()].slice(0, 6);
  $('repMissed').innerHTML = miss.length ? miss.map((q) => `<div>${esc(q.before)}<b>${esc(q.right)}</b>${esc(q.after)}</div>`).join('') : '<div>No mistakes. Perfect agent work!</div>';
  overlay('report', true); $('report').classList.add('low');
  showScreen(null);
  { const set = makeSet('#070b1e'), a = artifactModel(m); fitHeight(a, .55); set.S.add(a); const gl = glowSprite(m.color, 1.8); gl.position.set(0, .3, -.6); gl.material.opacity = .3; set.S.add(gl);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.75, .015, 8, 80).rotateX(Math.PI / 2), neon(m.color)); set.S.add(ring);
    const sp = new THREE.PointLight('#ffffff', 6, 8, 1.5); sp.position.set(1, 2.2, 2); set.S.add(sp); const fill = new THREE.PointLight(m.color, 20, 6, 1.5); fill.position.set(-1.4, .8, 1); set.S.add(fill);
    const P = camera.aspect < .9; set.cam.position.set(0, .85, P ? 5.2 : 3.2); set.cam.lookAt(P ? 0 : .55, P ? -.95 : .25, 0); set.bloom = .15;
    set.upd.push((dt, t) => { a.rotation.y += dt * 1.1; a.position.y = .08 + Math.sin(t * 1.6) * .05; ring.scale.setScalar(1 + Math.sin(t * 2) * .04); });
    SET = set; mode = 'set'; }
  [...$('repStars').children].forEach((el, k) => { el.style.animationDelay = (.35 + k * .28) + 's'; });
  mission = null;
}
$('repHome').onclick = () => { SFX.click(); overlay('report', false); $('report').classList.remove('low'); SET = null; mode = 'hq'; goHQ(); };
function goHQ() { mode = 'hq'; refreshTrophies(); HQ.pins.forEach((p) => (p.done = !!save.done[p.m.id])); drawBoard(); HQ.view = 'globe'; setView('center'); HQ.spinTo = null; HQ.selected = null; }

/* ================= rooms (sneaking, laser halls, escapes) ================= */
const CELL = 2, WALL_H = 2.1;
const keys = new Set(); const joy = { x: 0, y: 0, on: false };
addEventListener('keydown', (e) => { keys.add(e.key.toLowerCase()); if (mode === 'room' && !anyOverlay()) { if (e.key === ' ') { e.preventDefault(); stun(); } if (e.key.toLowerCase() === 'e') use(); if (e.key === 'Escape') pauseRoom(); } });
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
const anyOverlay = () => document.querySelector('.overlay.show') !== null;
{ const J = $('joy'), K = $('joyKnob'); let id = null, cx = 0, cy = 0;
  J.addEventListener('pointerdown', (e) => { id = e.pointerId; J.setPointerCapture(id); const r = J.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e); });
  const move = (e) => { if (e.pointerId !== id) return; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), max = 50; if (d > max) { dx *= max / d; dy *= max / d; } K.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / max; joy.y = dy / max; joy.on = true; };
  J.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== id) return; id = null; joy.x = joy.y = 0; joy.on = false; K.style.transform = ''; };
  J.addEventListener('pointerup', end); J.addEventListener('pointercancel', end); }
$('btnStun').onclick = () => stun(); $('btnUse').onclick = () => use(); $('hudPause').onclick = () => pauseRoom();

// the location kits from Blender (kit-<mission>-<piece>.glb): loaded when a mission starts; rooms fall back to blocks
const KIT_PIECES = ['floor', 'floor-2', 'wall', 'door', 'crate', 'terminal', 'pedestal', 'decor-1', 'decor-2', 'decor-3'];
A.kits = {};
async function loadKit(id) {
  if (id in A.kits) return A.kits[id]; const out = {};
  await Promise.all(KIT_PIECES.map(async (k) => { const g = await tryLoad(`models/kit-${id}-${k}.glb?v=1`); if (g) out[k] = dress(g.scene); }));
  return (A.kits[id] = out.wall && out.floor ? out : null);
}
// one InstancedMesh per mesh of a model, one instance per matrix
function instancedModel(S, model, mats) {
  if (!mats.length) return; model.updateMatrixWorld(true); const m = new THREE.Matrix4();
  model.traverse((o) => { if (!o.isMesh) return; const im = new THREE.InstancedMesh(o.geometry, o.material, mats.length); mats.forEach((M, i) => im.setMatrixAt(i, m.multiplyMatrices(M, o.matrixWorld))); im.castShadow = false; S.add(im); });
}
function parseMap(rows) { const w = Math.max(...rows.map((r) => r.length)); return rows.map((r) => r.padEnd(w, '#').split('')); }
function playRoom(st) {
  return new Promise((resolve) => {
    disposeRoom(); const th = mission.m.theme, grid = parseMap(st.map), H = grid.length, W = grid[0].length;
    const S = new THREE.Scene(); S.background = new THREE.Color(th.fog); S.fog = new THREE.Fog(th.fog, 18, 46);
    const hasKit = !!A.kits[mission.m.id], hemi = new THREE.HemisphereLight(th.light, hasKit ? th.fog : '#ffffff', hasKit ? (th.kitLight ?? .95) : 1.7); S.add(hemi); const sun = new THREE.DirectionalLight(hasKit ? th.light : '#ffffff', hasKit ? .9 : 1.6); sun.position.set(-6, 14, 8); S.add(sun);
    const ox = -(W - 1) * CELL / 2, oz = -(H - 1) * CELL / 2, cpos = (c, r) => new THREE.Vector3(ox + c * CELL, 0, oz + r * CELL);
    const R = room = { st, S, grid, W, H, ox, oz, cpos, guards: [], cams: [], lines: [], doors: [], gates: [], terms: [], resolve, start: null, exit: null, art: null, hasArt: false, cooldown: 0, busy: false, time: st.time || 0, t: 0, bolts: [], zz: [] };
    // floor and walls (instanced cubes: stand-ins until the location kits arrive from Blender)
    const floorM = new THREE.MeshStandardMaterial({ color: th.floor, roughness: .45, metalness: .3 }), wallM = new THREE.MeshStandardMaterial({ color: new THREE.Color(th.wall).multiplyScalar(.75), roughness: .7, metalness: .2 });
    const cells = [], walls = [];
    grid.forEach((row, r) => row.forEach((ch, c) => { if (ch === '#') walls.push([c, r]); else if (ch !== ' ') cells.push([c, r]); }));
    const KIT = A.kits[mission.m.id] || null; R.kit = KIT; const m4 = new THREE.Matrix4(), at = (p, ry = 0) => new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(1, 1, 1));
    if (KIT) {
      const runner = st.type === 'escape' && KIT['floor-2'];
      instancedModel(S, runner ? KIT['floor-2'] : KIT.floor, cells.map(([c, r]) => at(cpos(c, r))));
      instancedModel(S, KIT.wall, walls.map(([c, r]) => at(cpos(c, r))));
    } else {
    const fl = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL * .98, .2, CELL * .98), floorM, cells.length);
    cells.forEach(([c, r], i) => { const p = cpos(c, r); m4.makeTranslation(p.x, -.1, p.z); fl.setMatrixAt(i, m4); }); S.add(fl);
    const wl = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, WALL_H, CELL), wallM, walls.length);
    walls.forEach(([c, r], i) => { const p = cpos(c, r); m4.makeTranslation(p.x, WALL_H / 2, p.z); wl.setMatrixAt(i, m4); }); S.add(wl);
    }
    const open = (c, r) => { const ch = (grid[r] || [])[c]; return ch !== undefined && ch !== '#' && ch !== ' '; }, strips = [];
    walls.forEach(([c, r]) => { for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(c + dc, r + dr)) strips.push([c, r, dc, dr]); });
    if (KIT) strips.length = 0;   // (the kit walls carry their own trim)
    const trim = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, .07, .07), neon(th.trim), strips.length), q4 = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    strips.forEach(([c, r, dc, dr], i) => { const p = cpos(c, r); q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), dc ? Math.PI / 2 : 0); m4.compose(new THREE.Vector3(p.x + dc * (CELL / 2 - .04), WALL_H - .15, p.z + dr * (CELL / 2 - .04)), q4, one); trim.setMatrixAt(i, m4); }); S.add(trim);
    const low = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, .05, .05), neon(th.accent), strips.length);
    strips.forEach(([c, r, dc, dr], i) => { const p = cpos(c, r); q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), dc ? Math.PI / 2 : 0); m4.compose(new THREE.Vector3(p.x + dc * (CELL / 2 + .005), .25, p.z + dr * (CELL / 2 + .005)), q4, one); low.setMatrixAt(i, m4); }); S.add(low);
    const lineM = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * .94, CELL * .94).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: th.trim, transparent: true, opacity: .08, depthWrite: false }), cells.length);
    cells.forEach(([c, r], i) => { const p = cpos(c, r); m4.makeTranslation(p.x, .005, p.z); lineM.setMatrixAt(i, m4); }); if (!KIT) S.add(lineM);
    // decor against the back walls (the kit's paintings, statues…): never on a start, exit, terminal or path end
    if (KIT) { const decs = ['decor-1', 'decor-2', 'decor-3'].filter((k) => KIT[k]); let n = 0;
      cells.forEach(([c, r]) => { if (n >= 4 || !decs.length || grid[r][c] !== '.' || (grid[r - 1] || [])[c] !== '#' || Math.random() > .22) return; const free = [[1, 0], [-1, 0]].every(([dc]) => (grid[r][c + dc] || '#') !== 'S'); if (!free) return;
        const d = KIT[pick(decs)].clone(true); d.position.copy(cpos(c, r)); S.add(d); n++; }); }
    // objects
    const laserRows = new Map();
    grid.forEach((row, r) => row.forEach((ch, c) => {
      const p = cpos(c, r);
      if (ch === 'S') R.start = p.clone();
      else if (ch === 'X') { R.exit = { p, ring: new THREE.Mesh(new THREE.RingGeometry(.55, .75, 40).rotateX(-Math.PI / 2), neon(th.trim)) }; R.exit.ring.position.copy(p).setY(.03); S.add(R.exit.ring); R.exit.glow = glowSprite(th.trim, 2.2); R.exit.glow.position.copy(p).setY(.8); S.add(R.exit.glow); }
      else if (ch === 'o' && KIT && KIT.crate) { const b = KIT.crate.clone(true); b.position.copy(p); b.rotation.y = Math.floor(rand(0, 4)) * Math.PI / 2; S.add(b); }
      else if (ch === 'o') { const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.5), new THREE.MeshStandardMaterial({ color: th.wall, roughness: .6 })); b.position.copy(p).setY(.6); b.rotation.y = rand(-.2, .2); S.add(b); const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 1.2, 1.5)), new THREE.LineBasicMaterial({ color: th.accent, toneMapped: false })); e.position.copy(b.position); e.rotation.y = b.rotation.y; S.add(e); }
      else if (ch === 'T' && KIT && KIT.terminal) { const t = new THREE.Group(); t.add(KIT.terminal.clone(true)); const gl = glowSprite(th.accent, 1.4); gl.position.y = 1.35; t.add(gl); t.position.copy(p); S.add(t); R.terms.push({ p, obj: t, gl }); }
      else if (ch === 'T') { const t = new THREE.Group(); const base = new THREE.Mesh(new THREE.BoxGeometry(.7, 1, .5), new THREE.MeshStandardMaterial({ color: '#1b2440', metalness: .7, roughness: .3 })); base.position.y = .5; t.add(base); const scr = new THREE.Mesh(new THREE.PlaneGeometry(.6, .4), neon(th.accent)); scr.position.set(0, 1.05, .1); scr.rotation.x = -.6; t.add(scr); const gl = glowSprite(th.accent, 1.4); gl.position.y = 1.2; t.add(gl); t.position.copy(p); S.add(t); R.terms.push({ p, obj: t, gl }); }
      else if (ch === 'D' && KIT && KIT.door) { const d = KIT.door.clone(true); d.position.copy(p); S.add(d); R.doors.push({ c, r, mesh: d, open: false, y: 0, base: 0 }); }
      else if (ch === 'D') { const d = new THREE.Mesh(new THREE.BoxGeometry(CELL * .96, WALL_H, CELL * .96), new THREE.MeshStandardMaterial({ color: '#2a3150', emissive: th.accent, emissiveIntensity: .25, metalness: .6, roughness: .3 })); d.position.copy(p).setY(WALL_H / 2); S.add(d); R.doors.push({ c, r, mesh: d, open: false, y: 0, base: WALL_H / 2 }); }
      else if (ch === 'G') { const g = new THREE.Mesh(new THREE.BoxGeometry(CELL * .96, 1.8, .2), new THREE.MeshBasicMaterial({ color: th.accent, transparent: true, opacity: .45, toneMapped: false })); g.position.copy(p).setY(.9); g.rotation.y = Math.PI / 2; S.add(g); R.gates.push({ c, r, p, mesh: g, open: false }); }
      else if (ch === 'A' && KIT && KIT.pedestal) { const pd = KIT.pedestal.clone(true); pd.position.copy(p); S.add(pd); const a = artifactModel(mission.m); a.position.copy(p).setY(.91); S.add(a); R.art = { p, obj: a }; R.hasArt = true; }
      else if (ch === 'A') { const pd = new THREE.Mesh(new THREE.CylinderGeometry(.45, .55, .9, 24), new THREE.MeshStandardMaterial({ color: '#c8d4ea', metalness: .8, roughness: .25 })); pd.position.copy(p).setY(.45); S.add(pd); const a = artifactModel(mission.m); a.position.copy(p).setY(.92); S.add(a); R.art = { p, obj: a }; R.hasArt = true; }
      else if (ch === 'h' || ch === 'v') R.guards.push(makeGuard(p, ch === 'h' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1), S));
      else if (ch === 'c') R.cams.push(makeCam(p, S, th));
      if (ch === '=' || ch === '*') { const key = r + ch; if (!laserRows.has(key)) laserRows.set(key, { r, blink: ch === '*', cs: [] }); laserRows.get(key).cs.push(c); }
    }));
    for (const ln of laserRows.values()) {
      const c0 = Math.min(...ln.cs) - .5, c1 = Math.max(...ln.cs) + .5, z = oz + ln.r * CELL, x0 = ox + c0 * CELL, x1 = ox + c1 * CELL, beams = new THREE.Group();
      for (const y of [.35, .85, 1.35]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, x1 - x0, 6).rotateZ(Math.PI / 2), neon(ln.blink ? '#ffb02e' : '#ff2e4d')); b.position.set((x0 + x1) / 2, y, z); beams.add(b); const g = glowSprite(ln.blink ? '#ffb02e' : '#ff2e4d', .5); g.position.set(x0 + .1, y, z); beams.add(g); const g2 = g.clone(); g2.position.x = x1 - .1; beams.add(g2); }
      if (A.emitter) for (const [x, ry] of [[x0, Math.PI / 2], [x1, -Math.PI / 2]]) { const e = A.emitter.scene.clone(true); dress(e); e.position.set(x, 0, z); e.rotation.y = ry; S.add(e); }
      { const fl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, .7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: GLOW, color: ln.blink ? '#ffb02e' : '#ff2e4d', transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); fl.position.set((x0 + x1) / 2, .02, z); beams.add(fl); }
      S.add(beams); R.lines.push({ z, x0, x1, blink: ln.blink, on: true, beams, phase: rand(0, 2) });
    }
    R.lines.sort((a, b) => Math.abs(b.z - R.start.z) - Math.abs(a.z - R.start.z)).reverse();   // nearest to the start first
    // Foxino
    R.fox = makeFoxino(); S.add(R.fox.root); R.shadow = blobShadow(.45); S.add(R.shadow);
    R.pos = R.start.clone(); R.face = Math.PI; R.fox.root.position.copy(R.pos); R.fox.root.rotation.y = R.face;
    R.camPos = R.pos.clone().add(new THREE.Vector3(0, 24, 14)); camera.position.copy(R.camPos); camera.lookAt(R.pos);   // (the room opens with the camera swooping down)
    // atmosphere: a soft light following Foxino, dust in the place's colour, a beam of light over the exit
    R.foxLight = new THREE.PointLight(th.trim, 8, 6, 1.6); S.add(R.foxLight);
    { const n = 160, pos = new Float32Array(n * 3), sd = new Float32Array(n); for (let i = 0; i < n; i++) { pos.set([ox + rand(-1, W * CELL), rand(.2, 3), oz + rand(-1, H * CELL)], i * 3); sd[i] = rand(0, 6.28); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.BufferAttribute(sd, 1));
      const mm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uTime: { value: 0 }, uC: { value: new THREE.Color(th.trim) }, uPx: { value: renderer.getPixelRatio() } },
        vertexShader: `attribute float aS; uniform float uTime, uPx; varying float vA; void main(){ vec3 p = position; p.y += sin(uTime * .4 + aS) * .3; p.x += cos(uTime * .3 + aS * 1.3) * .25; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * 3.5 * (12.0 / -mv.z); vA = .3 + .3 * sin(uTime * 1.5 + aS * 4.0); }`,
        fragmentShader: `uniform vec3 uC; varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(uC * 1.3, smoothstep(.5, .0, d) * vA); }` });
      R.motes = new THREE.Points(g, mm); S.add(R.motes); }
    if (R.exit) { R.exitBeam = new THREE.Mesh(new THREE.CylinderGeometry(.55, .75, 5, 32, 1, true), holoMat(th.trim, .5)); R.exitBeam.position.copy(R.exit.p).setY(2.5); S.add(R.exitBeam); }
    $('hudStage').textContent = st.title; $('hudGoal').textContent = st.goal || ''; $('hudSpotted').textContent = mission.stats.spotted;
    $('hudTimer').textContent = ''; $('hudTimer').className = 'timer';
    showScreen('hud'); mode = 'room';
    if (st.type === 'lasers') toast('LASER HALL', 'info'); else if (st.type === 'escape') toast('RUN!', 'info'); else toast(st.title.toUpperCase(), 'info', 1100);
  });
}
// a rigged Blender character in a group: its clips by lower-case name, one playing at a time
function rigged(src, h) {
  const inner = cloneSkinned(src.scene); dress(inner); fitHeight(inner, h); const mixer = new THREE.AnimationMixer(inner), acts = {}; let cur = null;
  for (const c of src.animations) acts[c.name.toLowerCase()] = mixer.clipAction(c);
  return { inner, mixer, play(n, fade = .25, once = false) { const a = acts[n]; if (!a || a === cur) return; a.reset(); if (once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } a.fadeIn(fade).play(); if (cur) cur.fadeOut(fade); cur = a; } };
}
function makeGuard(p, axis, S) {
  if (A.bot) { const g = new THREE.Group(), rg = rigged(A.bot, 1.6); g.add(rg.inner); rg.play('walk', 0);
    const half = THREE.MathUtils.degToRad(30), len = 5;
    const cone = new THREE.Mesh(new THREE.CircleGeometry(len, 20, -Math.PI / 2 - half, half * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: .22, depthWrite: false, toneMapped: false })); cone.position.y = .03;
    g.position.copy(p); S.add(g); S.add(cone); const zz = textSprite('Zzz', '#9ff3ff', .35); zz.visible = false; zz.position.y = 2; g.add(zz); const sh = blobShadow(.4); g.add(sh);
    return { g, cone, zz, dir: axis.clone(), sleep: 0, half, len, speed: 1.5, bob: rand(0, 6), rg }; }
  // a Bolt-Bot stand-in: round white body, dark visor, cyan eyes, a torch
  const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.CapsuleGeometry(.34, .5, 6, 16), new THREE.MeshStandardMaterial({ color: '#e9eef8', metalness: .3, roughness: .35 })); body.position.y = .62; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.3, 20, 14), body.material); head.position.y = 1.25; g.add(head);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(.26, 20, 12, -Math.PI / 2.6, Math.PI / 1.3, Math.PI / 3.2, Math.PI / 2.6), new THREE.MeshStandardMaterial({ color: '#101828', metalness: .6, roughness: .2 })); visor.position.y = 1.25; visor.position.z = .05; g.add(visor);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), neon('#5ff3ff')); e.position.set(s * .09, 1.28, .3); g.add(e); }
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .25, 6), neon('#ff6ec7')); ant.position.y = 1.62; g.add(ant);
  const half = THREE.MathUtils.degToRad(30), len = 5;
  const cone = new THREE.Mesh(new THREE.CircleGeometry(len, 20, -Math.PI / 2 - half, half * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: .22, depthWrite: false, toneMapped: false })); cone.position.y = .03;
  g.position.copy(p); S.add(g); S.add(cone); const zz = textSprite('Zzz', '#9ff3ff', .35); zz.visible = false; zz.position.y = 2; g.add(zz);
  return { g, cone, zz, dir: axis.clone(), sleep: 0, half, len, speed: 1.5, bob: rand(0, 6) };
}
function makeCam(p, S, th) {
  if (A.secam) { const g = A.secam.scene.clone(true); dress(g); g.position.copy(p); S.add(g); const head = g.getObjectByName('Head') || g;
    const half = THREE.MathUtils.degToRad(22), len = 6;
    const cone = new THREE.Mesh(new THREE.CircleGeometry(len, 20, -Math.PI / 2 - half, half * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff3a5a', transparent: true, opacity: .2, depthWrite: false, toneMapped: false })); cone.position.copy(p).setY(.04); S.add(cone);
    return { g, cam: head, cone, p, half, len, a0: rand(0, Math.PI * 2), t: rand(0, 6), sweep: 1.1 }; }
  const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.6, 8), new THREE.MeshStandardMaterial({ color: '#202a44' })); pole.position.y = 1.3; g.add(pole);
  const cam = new THREE.Mesh(new THREE.BoxGeometry(.3, .25, .5), new THREE.MeshStandardMaterial({ color: '#dfe6f2', metalness: .4, roughness: .3 })); cam.position.y = 2.6; g.add(cam);
  const led = glowSprite('#ff2e4d', .35); led.position.set(0, 2.62, .3); cam.add(led); led.position.set(0, .02, .3);
  g.position.copy(p); S.add(g);
  const half = THREE.MathUtils.degToRad(22), len = 6;
  const cone = new THREE.Mesh(new THREE.CircleGeometry(len, 20, -Math.PI / 2 - half, half * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff3a5a', transparent: true, opacity: .2, depthWrite: false, toneMapped: false })); cone.position.copy(p).setY(.04); S.add(cone);
  return { g, cam, cone, p, half, len, a0: rand(0, Math.PI * 2), t: rand(0, 6), sweep: 1.1 };
}
const cellAt = (R, x, z) => { const c = Math.round((x - R.ox) / CELL), r = Math.round((z - R.oz) / CELL); return (R.grid[r] || [])[c] ?? '#'; };
const cellRC = (R, x, z) => [Math.round((x - R.ox) / CELL), Math.round((z - R.oz) / CELL)];
function blocked(R, x, z) {
  const ch = cellAt(R, x, z); if (ch === '#' || ch === ' ' || ch === 'o') return true;
  const [c, r] = cellRC(R, x, z);
  if (ch === 'D') { const d = R.doors.find((d) => d.c === c && d.r === r); return d && !d.open; }
  if (ch === 'G') { const g = R.gates.find((g) => g.c === c && g.r === r); return g && !g.open; }
  return false;
}
const solid = (R, x, z, rad = .4) => blocked(R, x - rad, z - rad) || blocked(R, x + rad, z - rad) || blocked(R, x - rad, z + rad) || blocked(R, x + rad, z + rad);
function sightClear(R, a, b) { const d = a.distanceTo(b), n = Math.ceil(d / .3); for (let k = 1; k < n; k++) { const t = k / n, x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t), ch = cellAt(R, x, z); if (ch === '#' || ch === 'o' || (ch === 'D' && blocked(R, x, z))) return false; } return true; }
const sees = (R, from, ang, half, len, to) => { const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz); if (d > len) return false; let da = Math.atan2(dx, dz) - ang; da = Math.atan2(Math.sin(da), Math.cos(da)); return Math.abs(da) < half && sightClear(R, from, to); };

function roomFrame(dt, t) {
  const R = room; if (!R) return; R.t += dt; if (R.done) { R.fox.update(dt, false, 0); return; }
  const paused = anyOverlay() || R.busy;
  // move
  let ix = 0, iz = 0;
  if (!paused) { if (keys.has('a') || keys.has('arrowleft')) ix--; if (keys.has('d') || keys.has('arrowright')) ix++; if (keys.has('w') || keys.has('arrowup')) iz--; if (keys.has('s') || keys.has('arrowdown')) iz++; if (joy.on) { ix += joy.x; iz += joy.y; } }
  const mag = Math.min(1, Math.hypot(ix, iz)), speed = 4.2 * mag;
  if (mag > .1) { const nx = ix / Math.hypot(ix, iz), nz = iz / Math.hypot(ix, iz), step = speed * dt;
    if (!solid(R, R.pos.x + nx * step, R.pos.z)) R.pos.x += nx * step; if (!solid(R, R.pos.x, R.pos.z + nz * step)) R.pos.z += nz * step;
    const want = Math.atan2(nx, nz); let da = want - R.face; da = Math.atan2(Math.sin(da), Math.cos(da)); R.face += da * Math.min(1, dt * 12); }
  R.fox.root.position.copy(R.pos); R.fox.root.rotation.y = R.face; R.shadow.position.set(R.pos.x, .02, R.pos.z);
  const danger = R.guards.some((G) => G.sleep <= 0 && G.g.position.distanceTo(R.pos) < 5.5) || R.cams.some((C) => C.p.distanceTo(R.pos) < 6);
  if (R.fox.hasClips && mag > .1) { R.fox.manual = true; R.fox.play(danger ? 'sneak' : 'run'); R.fox.update(dt, true, speed); } else { R.fox.manual = false; R.fox.update(dt, mag > .1, speed); }
  // camera follows
  const P = camera.aspect < .9, narrow = R.W <= 7, want = R.pos.clone().add(new THREE.Vector3(0, P ? (narrow ? 10 : 12.5) : 9.5, P ? (narrow ? 1.2 : 3.6) : 4.2)); R.camPos.lerp(want, Math.min(1, dt * (R.t < 1.4 ? 2.2 : 4))); camera.position.copy(R.camPos); camera.lookAt(R.pos.x, .3, R.pos.z + (P ? (narrow ? -1.6 : 1.2) : -.5));   // (tall screens: Foxino a little above the middle, the controls cover the bottom)
  if (R.foxLight) R.foxLight.position.set(R.pos.x, 2.4, R.pos.z + .6); if (R.motes) R.motes.material.uniforms.uTime.value = t; if (R.exitBeam) R.exitBeam.material.uniforms.uTime.value = t;
  if (R.camLock) { camera.position.copy(R.camLock.p); camera.lookAt(R.camLock.l); }   // (test hook: a fixed close-up)
  // exit
  if (R.exit) { const locked = R.hasArt && !R.art.taken; R.exit.ring.material.color.set(locked ? '#ff3a5a' : mission.m.theme.trim); R.exit.ring.rotation.y += dt; R.exit.glow.material.opacity = .5 + Math.sin(t * 4) * .3;
    if (!paused && !locked && R.pos.distanceTo(R.exit.p) < .9) { roomDone(); return; } }
  if (R.art && !R.art.taken) { R.art.obj.rotation.y += dt * 1.5; if (R.pos.distanceTo(R.art.p) < 1.3) { R.art.taken = true; R.art.obj.visible = false; SFX.pick(); flash('white'); toast(mission.m.artifact.toUpperCase() + '!', 'ok', 1600); $('hudGoal').textContent = 'You have it! Get to the exit!'; } }
  // terminal / gate prompts
  const term = R.terms.find((x) => R.pos.distanceTo(x.p) < 1.7 && !x.used);
  $('prompt').classList.toggle('show', !!term && !paused); if (term) $('prompt').innerHTML = TOUCH ? 'Tap <b>USE</b> at the terminal' : 'Press <b>E</b> to use the terminal';
  $('btnUse').classList.toggle('dim', !term);
  R.terms.forEach((x) => { x.gl.material.opacity = x.used ? .1 : .6 + Math.sin(t * 5) * .3; });
  const gate = R.gates.find((g) => !g.open && Math.hypot(R.pos.x - g.p.x, R.pos.z - g.p.z) < 1.5);
  if (gate && !paused) gateQuestion(gate);
  // doors slide up when open
  for (const d of R.doors) { if (d.open && d.y < WALL_H) { d.y = Math.min(WALL_H, d.y + dt * 3); d.mesh.position.y = d.base + d.y; } }
  for (const g of R.gates) if (g.open) g.mesh.material.opacity = Math.max(0, g.mesh.material.opacity - dt);
  // timer
  if (R.st.type === 'escape' && !paused) { R.time -= dt; const s = Math.max(0, Math.ceil(R.time)); $('hudTimer').textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; $('hudTimer').className = 'timer' + (R.time < 15 ? ' low' : ''); if (R.time <= 0) { failRoom('TOO SLOW!'); return; } }
  if (paused) return;
  // lasers
  for (const ln of R.lines) {
    const active = ln.on && (!ln.blink || ((R.t + ln.phase) % 2.6) < 1.5); ln.beams.visible = active || (ln.on && ln.blink && Math.floor(R.t * 8) % 2 === 0 && ((R.t + ln.phase) % 2.6) > 2.3);
    if (active && Math.abs(R.pos.z - ln.z) < .35 && R.pos.x > ln.x0 && R.pos.x < ln.x1) { spotted('LASER!'); return; }
  }
  // guards
  for (const G of R.guards) {
    if (G.rg) G.rg.mixer.update(dt);
    if (G.sleep > 0) { G.sleep -= dt; G.zz.visible = true; G.zz.position.y = 2 + Math.sin(t * 3) * .1; G.cone.visible = false; if (G.rg) G.rg.play('sleep'); else G.g.rotation.z = .25; if (G.sleep <= 0) { G.zz.visible = false; G.g.rotation.z = 0; G.cone.visible = true; if (G.rg) G.rg.play('walk'); } continue; }
    const nx = G.g.position.x + G.dir.x * G.speed * dt, nz = G.g.position.z + G.dir.z * G.speed * dt;
    if (solid(R, nx + G.dir.x * .5, nz + G.dir.z * .5, .3)) G.dir.multiplyScalar(-1); else G.g.position.set(nx, 0, nz);
    const ang = Math.atan2(G.dir.x, G.dir.z); G.g.rotation.y += Math.atan2(Math.sin(ang - G.g.rotation.y), Math.cos(ang - G.g.rotation.y)) * Math.min(1, dt * 6);
    G.g.position.y = G.rg ? 0 : Math.abs(Math.sin(t * 6 + G.bob)) * .05; G.cone.position.set(G.g.position.x, .03, G.g.position.z); G.cone.rotation.y = G.g.rotation.y;
    const eye = G.g.position.clone().setY(0); if (sees(R, eye, G.g.rotation.y, G.half, G.len, R.pos)) { spotted('SPOTTED!'); return; }
  }
  for (const C of R.cams) { C.t += dt; const a = C.a0 + Math.sin(C.t * .6) * C.sweep; C.cam.rotation.y = a; C.cone.rotation.y = a; if (sees(R, C.p, a, C.half, C.len, R.pos)) { spotted('CAMERA!'); return; } }
  // stun bolts
  R.cooldown = Math.max(0, R.cooldown - dt); $('stunFill').style.height = (R.cooldown / 3.2 * 100) + '%';
  for (const b of R.bolts) { b.life -= dt; b.mesh.position.addScaledVector(b.v, dt); const hit = R.guards.find((G) => G.sleep <= 0 && G.g.position.distanceTo(b.mesh.position.clone().setY(0)) < .7); if (hit) { hit.sleep = 6; b.life = 0; SFX.right(); toast('ZZZ…', 'info', 700); } if (blocked(R, b.mesh.position.x, b.mesh.position.z)) b.life = 0; if (b.life <= 0) R.S.remove(b.mesh); }
  R.bolts = R.bolts.filter((b) => b.life > 0);
}
function stun() {
  const R = room; if (!R || R.cooldown > 0 || anyOverlay()) return; R.cooldown = 3.2; SFX.stun();
  const dir = new THREE.Vector3(Math.sin(R.face), 0, Math.cos(R.face)), m = glowSprite('#ff6ec7', .7); m.position.copy(R.pos).setY(.9).addScaledVector(dir, .6); R.S.add(m); R.bolts.push({ mesh: m, v: dir.multiplyScalar(16), life: .6 });
  if (R.fox.hasClips) { R.fox.play('aim', .1); setTimeout(() => R.fox && R.fox.play('idle'), 350); }
}
async function use() {
  const R = room; if (!R || R.busy || anyOverlay()) return; const term = R.terms.find((x) => R.pos.distanceTo(x.p) < 1.7 && !x.used); if (!term) return;
  R.busy = true; SFX.click();
  if (R.st.type === 'lasers') {
    const left = R.lines.filter((l) => l.on && !l.blink);
    while (left.some((l) => l.on)) {
      const vis = () => `<div class="lasers">${R.lines.filter((l) => !l.blink).map((l) => `<span class="${l.on ? '' : 'off'}"></span>`).join('')}</div>`;
      const ok = await ask({ kicker: 'LASER CONTROL', title: 'Each right answer switches off one laser line.', visual: vis });
      if (ok) { const l = left.find((l) => l.on); l.on = false; l.beams.visible = false; SFX.door(); }
      else { for (const l of left) if (l.on) l.phase += .5; }
    }
    if (R.lines.some((l) => l.blink)) toast('WATCH THE BLINKING LASERS!', 'info', 1600); else toast('LASERS OFF', 'ok');
    term.used = true;
  } else {
    await askUntilRight({ kicker: 'DOOR TERMINAL', title: 'Answer to unlock the door.' });
    const d = R.doors.filter((d) => !d.open).sort((a, b) => R.cpos(a.c, a.r).distanceTo(term.p) - R.cpos(b.c, b.r).distanceTo(term.p))[0];
    if (d) { d.open = true; SFX.door(); toast('DOOR OPEN', 'ok'); } term.used = true;
  }
  R.busy = false;
}
async function gateQuestion(g) {
  const R = room; R.busy = true;
  await askUntilRight({ kicker: 'SECURITY GATE', title: 'Answer fast to open the gate!' }, () => { R.time -= 5; toast('−5 s', 'bad', 700); });
  g.open = true; SFX.door(); R.busy = false;
}
function spotted(why) {
  const R = room; mission.stats.spotted++; $('hudSpotted').textContent = mission.stats.spotted; SFX.alarm(); flash('red'); toast(why, 'bad', 1100);
  R.pos.copy(R.start); R.camPos.copy(R.pos).add(new THREE.Vector3(0, 9.5, 4.2));
  for (const G of R.guards) G.sleep = 0;
}
function failRoom(why) { toast(why, 'bad', 1500); SFX.alarm(); const R = room; room = null; mode = 'hq'; setTimeout(() => R.resolve(false), 1200); }
function roomDone() {
  const R = room; SFX.pick(); toast('CLEAR!', 'ok', 900); R.done = true;
  if (R.fox.hasClips) { R.fox.manual = true; R.fox.play('celebrate', .15); }
  const burst = glowSprite(mission.m.theme.trim, 1); burst.position.copy(R.pos).setY(1); R.S.add(burst); const t0 = performance.now();
  const anim = () => { const k = (performance.now() - t0) / 650; burst.scale.setScalar(1 + k * 7); burst.material.opacity = Math.max(0, 1 - k); if (k < 1) requestAnimationFrame(anim); }; anim();
  setTimeout(() => { mode = 'hq'; room = null; R.resolve(true); }, 900);
}
function disposeRoom() { if (room) room = null; $('prompt').classList.remove('show'); }
function pauseRoom() { if (mode !== 'room') return; overlay('pause', true); }
$('pResume').onclick = () => overlay('pause', false);
$('pRestart').onclick = () => { overlay('pause', false); const R = room; if (R) { room = null; mode = 'hq'; R.resolve(false); } };
$('pQuit').onclick = () => { overlay('pause', false); const R = room; room = null; mission = null; goHQ(); if (R) R.resolve(false); };

/* ================= settings ================= */
function packLabel() { const s = window.FugioPacks ? FugioPacks.summary(PACKS, packIds) : { title: 'Questions', sub: '' }; $('setPackTitle').textContent = s.title; $('setPackSub').textContent = s.sub; }
$('btnSettings').onclick = () => { SFX.click(); packLabel(); $('setSound').checked = save.sound; $('setVoice').checked = save.voice; $('setGfx').value = save.gfx; overlay('settings', true); };
$('setPack').onclick = async () => { if (!window.FugioPacks) return; const ids = await FugioPacks.open(PACKS, packIds, { theme: 'gummy', kicker: 'CHOOSE THE QUESTIONS' }); if (ids && ids.length) { packIds = ids; store.set('foxspy-packs', ids); Q.used.clear(); packLabel(); drawBoard(); } };
$('setSound').onchange = (e) => { save.sound = e.target.checked; persist(); };
$('setVoice').onchange = (e) => { save.voice = e.target.checked; persist(); };
$('setGfx').onchange = (e) => { save.gfx = e.target.value; persist(); resize(); };
$('setClose').onclick = () => { SFX.click(); overlay('settings', false); };

/* ================= HQ buttons ================= */
$('btnSelect').onclick = () => { SFX.click(); setView('globe'); };
$('goTrophy').onclick = () => setView('left');
$('goStats').onclick = () => setView('right');
$('sideBack').onclick = () => setView('center');
$('tPrev').onclick = () => setTrophy(HQ.tIdx <= 0 ? 4 : HQ.tIdx - 1);
$('tNext').onclick = () => setTrophy(HQ.tIdx >= 4 ? 0 : HQ.tIdx + 1);
{ let sx = null; const sw = $('side');
  sw.addEventListener('pointerdown', (e) => { if (HQ.view === 'left') sx = e.clientX; });
  sw.addEventListener('pointerup', (e) => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) setTrophy(dx < 0 ? (HQ.tIdx >= 4 ? 0 : HQ.tIdx + 1) : (HQ.tIdx <= 0 ? 4 : HQ.tIdx - 1)); }); }
$('globeBack').onclick = () => setView('center');
$('cardStart').onclick = () => { if (HQ.selected) startMission(HQ.selected); };

/* ================= loop ================= */
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  requestAnimationFrame(frame);   // (first, so one bad frame can never stop the game)
  const R = room;
  if (mode === 'room' && R) { roomFrame(dt, t); draw(R.S, camera, R.bloom ?? .35); save.time += dt; }
  else if (mode === 'set' && SET) { SET.cam.aspect = camera.aspect; SET.cam.updateProjectionMatrix(); for (const f of SET.upd) f(dt, t); draw(SET.S, SET.cam, SET.bloom ?? .35); }
  else if (HQ.scene && HQ.fox) { hqFrame(dt, t); draw(HQ.scene, camera, .4); }
}
(async () => {
  await loadAssets(); buildHQ(); window.__hqReady = true; mode = 'hq'; $('loading').classList.add('out'); setTimeout(() => $('loading').classList.remove('show', 'out'), 700); document.body.classList.toggle('portrait', PORTRAIT()); document.body.dataset.view = 'center'; setTimeout(() => showScreen('hq'), 1400); updateHQText(); requestAnimationFrame(frame);
  window.FS = { THREE, HQ, camera, save, MISSIONS, startMission, setView, room: () => room, mission: () => mission, ask, A, use, stun };   // (test hooks)
})();
