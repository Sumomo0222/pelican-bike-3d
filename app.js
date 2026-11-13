import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const tmpC = new THREE.Color();

/* ---------------- renderer / scene / camera ---------------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('err').style.display = 'flex';
  $('loading').style.display = 'none';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG_D = new THREE.Color(0xd8eeff), FOG_N = new THREE.Color(0x1c2740);
scene.fog = new THREE.Fog(FOG_D.clone(), 30, 170);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 600);
camera.position.set(4.8, 2.4, 5.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.15, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 2.2;
controls.maxDistance = 18;
controls.maxPolarAngle = 1.52;

/* ---------------- lights ---------------- */
const HEMI_D = new THREE.Color(0xbfd9ff), HEMI_N = new THREE.Color(0x6a7dc9);
const HEMI_G_D = new THREE.Color(0x6fae62), HEMI_G_N = new THREE.Color(0x23293f);
const SUN_D = new THREE.Color(0xffffff), SUN_N = new THREE.Color(0x8fa5ff);
const hemi = new THREE.HemisphereLight(HEMI_D.clone(), HEMI_G_D.clone(), 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(SUN_D.clone(), 1.35);
sun.position.set(16, 26, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -10; sun.shadow.camera.right = 10;
sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10;
sun.shadow.camera.near = 2; sun.shadow.camera.far = 70;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

/* ---------------- post-processing ---------------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.6, 0.9);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

/* ---------------- sky / sun / moon / stars ---------------- */
const SKY_TOP_D = new THREE.Color(0x5fb0ff), SKY_TOP_N = new THREE.Color(0x0a0f2e);
const SKY_BOT_D = new THREE.Color(0xeaf7ff), SKY_BOT_N = new THREE.Color(0x2a3557);
const skyU = { top: { value: SKY_TOP_D.clone() }, bot: { value: SKY_BOT_D.clone() } };
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(275, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = normalize(vP).y; float k = pow(max(h, 0.0), 0.8); gl_FragColor = vec4(mix(bot, top, k), 1.0); }',
  })
));
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff3bf, fog: false }));
sunDisc.position.set(95, 130, -150);
const moon = new THREE.Mesh(new THREE.SphereGeometry(6.5, 20, 14), new THREE.MeshBasicMaterial({ color: 0xe9f0ff, fog: false }));
moon.position.set(-105, 115, -155);
moon.visible = false;
scene.add(sunDisc, moon);

let stars;
{
  const N = 650, arr = new Float32Array(N * 3), v = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    v.randomDirection();
    v.y = Math.abs(v.y) * 0.9 + 0.08;
    v.normalize().multiplyScalar(255);
    arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe9ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  scene.add(stars);
}

/* ---------------- materials ---------------- */
const M = {
  frame: new THREE.MeshStandardMaterial({ color: 0xe8483f, roughness: 0.35, metalness: 0.55 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.95 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xcdd6de, roughness: 0.3, metalness: 0.85 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x33363c, roughness: 0.8 }),
  chain: new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.6, metalness: 0.6 }),
  seat: new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.85 }),
  wood: new THREE.MeshStandardMaterial({ color: 0xb0793f, roughness: 0.9 }),
  body: new THREE.MeshStandardMaterial({ color: 0xf7f4ec, roughness: 0.75 }),
  beak: new THREE.MeshStandardMaterial({ color: 0xf2a53c, roughness: 0.5 }),
  pouch: new THREE.MeshStandardMaterial({ color: 0xff9a3f, roughness: 0.6 }),
  leg: new THREE.MeshStandardMaterial({ color: 0xf0912f, roughness: 0.6 }),
  black: new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.4 }),
  white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
  fish: new THREE.MeshStandardMaterial({ color: 0xc9d6dd, roughness: 0.35, metalness: 0.6 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xf5c542, roughness: 0.3, metalness: 0.8 }),
};

/* ---------------- ground / road ---------------- */
const groundMat = new THREE.MeshStandardMaterial({ color: 0x59b95c, roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
ground.receiveShadow = true;
scene.add(ground);

function roadTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3b4048'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.05) + ')';
    g.fillRect(Math.random() * 256, Math.random() * 128, 1.5, 1.5);
  }
  for (let i = 0; i < 600; i++) {
    g.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.09) + ')';
    g.fillRect(Math.random() * 256, Math.random() * 128, 2, 2);
  }
  g.fillStyle = '#e9edf0'; g.fillRect(0, 4, 256, 5); g.fillRect(0, 119, 256, 5);
  g.fillStyle = '#ffd44d'; g.fillRect(20, 60, 120, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(14, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const roadTex = roadTexture();
const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 });
const road = new THREE.Mesh(new THREE.PlaneGeometry(300, 3.6), roadMat);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.012;
road.receiveShadow = true;
scene.add(road);

/* ---------------- mountains / trees / clouds / pollen ---------------- */
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 1 });
const mountainMat = new THREE.MeshStandardMaterial({ color: 0x7c98ad, roughness: 1, flatShading: true });
const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
const nightPairs = [
  [groundMat, 0x59b95c, 0x1e3526],
  [trunkMat, 0x8a5a33, 0x42312a],
  [mountainMat, 0x7c98ad, 0x27324e],
  [cloudMat, 0xffffff, 0x8a93bd],
];

for (let i = 0; i < 9; i++) {
  const r = 26 + Math.random() * 26, h = 18 + Math.random() * 26;
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), mountainMat);
  const ang = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
  const rad = 130 + Math.random() * 45;
  m.position.set(Math.cos(ang) * rad, h / 2 - 3, Math.sin(ang) * rad);
  m.rotation.y = Math.random() * Math.PI;
  scene.add(m);
}

const leafMats = [];
for (const [d, n] of [[0x3f9b48, 0x1c4230], [0x54b04e, 0x21503a], [0x2f8f57, 0x193a2c]]) {
  const mat = new THREE.MeshStandardMaterial({ color: d, roughness: 0.9, flatShading: true });
  leafMats.push(mat);
  nightPairs.push([mat, d, n]);
}

function makeTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 0.8, 7), trunkMat);
  trunk.position.y = 0.4; g.add(trunk);
  const lm = leafMats[(Math.random() * 3) | 0];
  const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 7), lm);
  c1.position.y = 1.2; g.add(c1);
  const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.95, 7), lm);
  c2.position.y = 1.85; g.add(c2);
  return g;
}
const trees = [];
function randomizeTree(tr) {
  tr.position.z = (Math.random() < 0.5 ? -1 : 1) * (4.6 + Math.random() * 9);
  tr.scale.setScalar(0.9 + Math.random() * 0.9);
}
for (let i = 0; i < 42; i++) {
  const tr = makeTree();
  tr.position.set(-175 + Math.random() * 350, 0, (Math.random() < 0.5 ? -1 : 1) * (4.6 + Math.random() * 9));
  randomizeTree(tr);
  tr.rotation.y = Math.random() * Math.PI * 2;
  tr.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(tr); trees.push(tr);
}

function makeCloud() {
  const g = new THREE.Group();
  const n = 3 + ((Math.random() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const r = 0.7 + Math.random() * 1.1;
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cloudMat);
    s.position.set(i * 0.9 - n * 0.45, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 1.2);
    g.add(s);
  }
  g.scale.setScalar(1.3 + Math.random() * 1.2);
  return g;
}
const clouds = [];
for (let i = 0; i < 9; i++) {
  const cl = makeCloud();
  cl.position.set(-190 + Math.random() * 380, 11 + Math.random() * 7, -55 + Math.random() * 110);
  cl.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(cl); clouds.push(cl);
}

const POLLEN_N = 130;
const pollenBase = new Float32Array(POLLEN_N * 3);
const pollenPhase = new Float32Array(POLLEN_N);
const pollenGeo = new THREE.BufferGeometry();
{
  const arr = new Float32Array(POLLEN_N * 3);
  for (let i = 0; i < POLLEN_N; i++) {
    pollenBase[i * 3] = (Math.random() * 2 - 1) * 45;
    pollenBase[i * 3 + 1] = 0.3 + Math.random() * 3.5;
    pollenBase[i * 3 + 2] = (Math.random() * 2 - 1) * 16;
    pollenPhase[i] = Math.random() * Math.PI * 2;
  }
  arr.set(pollenBase);
  pollenGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
}
const POL_D = new THREE.Color(0xfff2b0), POL_N = new THREE.Color(0xa6ff9e);
const pollenMat = new THREE.PointsMaterial({ color: POL_D.clone(), size: 0.07, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
scene.add(new THREE.Points(pollenGeo, pollenMat));

/* ---------------- helpers ---------------- */
function tube(a, b, r, mat) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}
function makeWheel(r = 0.5) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.062, 14, 40), M.tire));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(r - 0.085, 0.02, 10, 32), M.metal));
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, (r - 0.1) * 2, 6), M.metal);
    sp.rotation.z = (i / 8) * Math.PI;
    g.add(sp);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 12), M.metal);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  return g;
}

/* ---------------- bicycle ---------------- */
const rig = new THREE.Group();
scene.add(rig);
const bike = new THREE.Group();
rig.add(bike);

const wheelR = makeWheel(); wheelR.position.set(-0.62, 0.5, 0); bike.add(wheelR);
const wheelF = makeWheel(); wheelF.position.set(0.62, 0.5, 0); bike.add(wheelF);

const A = [-0.62, 0.5, 0], Bp = [0, 0.4, 0], S = [-0.18, 0.94, 0], H = [0.44, 0.86, 0], Hd = [0.52, 0.6, 0], F = [0.62, 0.5, 0];
bike.add(tube(A, Bp, 0.024, M.frame));           // chainstay (lower)
bike.add(tube([-0.62, 0.5, 0.05], [0, 0.4, 0.05], 0.022, M.frame));
bike.add(tube([-0.62, 0.5, -0.05], [0, 0.4, -0.05], 0.022, M.frame));
bike.add(tube([-0.62, 0.5, 0.05], S, 0.018, M.frame)); // seatstay
bike.add(tube([-0.62, 0.5, -0.05], S, 0.018, M.frame));
bike.add(tube(S, Bp, 0.03, M.frame));            // seat tube
bike.add(tube(Bp, Hd, 0.032, M.frame));          // down tube
bike.add(tube(S, H, 0.028, M.frame));            // top tube
bike.add(tube(H, Hd, 0.034, M.frame));           // head tube
bike.add(tube(Hd, F, 0.026, M.frame));           // fork
bike.add(tube(H, [0.5, 1.0, 0], 0.025, M.frame));// stem

const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.56, 10), M.metal);
bar.rotation.x = Math.PI / 2; bar.position.set(0.5, 1.02, 0); bike.add(bar);
for (const sz of [0.25, -0.25]) {
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.13, 10), M.dark);
  grip.rotation.x = Math.PI / 2; grip.position.set(0.5, 1.02, sz); bike.add(grip);
}

const seatPost = tube([-0.18, 0.9, 0], [-0.18, 0.985, 0], 0.018, M.metal); bike.add(seatPost);
const seat = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.15), M.seat);
seat.position.set(-0.19, 0.99, 0); seat.rotation.z = 0.08; bike.add(seat);

const chainring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 28), M.chain);
chainring.position.set(...Bp); bike.add(chainring);
const sprocket = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 20), M.chain);
sprocket.position.set(...A); bike.add(sprocket);
for (const z of [0.04, -0.04]) {
  bike.add(tube([0, 0.52, z], [-0.62, 0.56, z], 0.013, M.chain));
  bike.add(tube([0, 0.28, z], [-0.62, 0.44, z], 0.013, M.chain));
}

const crankG = new THREE.Group(); crankG.position.set(...Bp); bike.add(crankG);
const crankHub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.24, 12), M.dark);
crankHub.rotation.x = Math.PI / 2; crankG.add(crankHub);
const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.27, 0.035), M.dark); arm1.position.set(0, 0.135, 0); crankG.add(arm1);
const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.27, 0.035), M.dark); arm2.position.set(0, -0.135, 0); crankG.add(arm2);
const pedalR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.032, 0.1), M.dark); pedalR.position.set(0, 0.26, 0.12); crankG.add(pedalR);
const pedalL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.032, 0.1), M.dark); pedalL.position.set(0, -0.26, -0.12); crankG.add(pedalL);
const axleR = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8), M.metal); axleR.rotation.x = Math.PI / 2; axleR.position.set(0, 0.26, 0.06); crankG.add(axleR);
const axleL = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8), M.metal); axleL.rotation.x = Math.PI / 2; axleL.position.set(0, -0.26, -0.06); crankG.add(axleL);

// front basket + fish
const basket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.34), M.wood);
basket.position.set(0.74, 1.0, 0); bike.add(basket);
const fish = new THREE.Group(); fish.position.set(0.74, 1.15, 0.05); fish.rotation.z = -0.45;
const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), M.fish);
fishBody.scale.set(1.9, 0.75, 0.6); fish.add(fishBody);
const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), M.fish);
fishTail.position.set(-0.18, 0.02, 0); fishTail.rotation.z = 2.2; fish.add(fishTail);
const fishEye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), M.black);
fishEye.position.set(0.12, 0.03, 0.055); fish.add(fishEye);
bike.add(fish);

// bell
const bell = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M.gold);
bell.position.set(0.42, 1.08, 0.14); bike.add(bell);

// headlight
const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.09, 12), M.metal);
lampBody.rotation.z = -Math.PI / 2; lampBody.position.set(0.6, 0.92, 0); bike.add(lampBody);
const lensMat = new THREE.MeshStandardMaterial({ color: 0xfffbe0, emissive: 0xfff2b8, emissiveIntensity: 0 });
const lens = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), lensMat);
lens.rotation.y = Math.PI / 2; lens.position.set(0.647, 0.92, 0); bike.add(lens);
const headlight = new THREE.SpotLight(0xfff2c9, 0, 45, 0.5, 0.6, 1);
headlight.position.set(0.66, 0.92, 0);
const hlTarget = new THREE.Object3D(); hlTarget.position.set(12, 0, 0.4);
bike.add(headlight, hlTarget);
headlight.target = hlTarget;

/* ---------------- pelican ---------------- */
const pelican = new THREE.Group();
rig.add(pelican);

const bodyG = new THREE.Group(); bodyG.position.set(-0.2, 1.24, 0); bodyG.rotation.z = -0.16; pelican.add(bodyG);
const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18), M.body);
body.scale.set(1.3, 0.95, 0.98); bodyG.add(body);
const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 10), M.body);
tail.position.set(-0.4, 0.28, 0); tail.rotation.z = 0.64; tail.scale.z = 0.5; bodyG.add(tail);

const neckCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.02, 1.44, 0),
  new THREE.Vector3(0.10, 1.74, 0),
  new THREE.Vector3(0.16, 2.0, 0),
  new THREE.Vector3(0.18, 2.1, 0),
]);
pelican.add(new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 20, 0.085, 12), M.body));

const headG = new THREE.Group(); headG.position.set(0.18, 2.14, 0); pelican.add(headG);
headG.add(new THREE.Mesh(new THREE.SphereGeometry(0.145, 20, 16), M.body));
const crest = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), M.body);
crest.position.set(-0.06, 0.12, 0); crest.rotation.z = 0.8; crest.scale.z = 0.6; headG.add(crest);
for (const sgn of [1, -1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), M.black);
  eye.position.set(0.07, 0.03, 0.115 * sgn); headG.add(eye);
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), M.white);
  glint.position.set(0.085, 0.045, 0.127 * sgn); headG.add(glint);
}
const beak = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.5, 10), M.beak);
beak.rotation.z = -Math.PI / 2 - 0.05; beak.position.set(0.55, 2.1, 0); headG.add(beak);
const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), M.pouch);
pouch.scale.set(2.0, 0.9, 0.8); pouch.position.set(0.42, 1.98, 0); headG.add(pouch);

function makeWing() {
  const g = new THREE.Group();
  const main = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), M.body);
  main.scale.set(1.35, 0.5, 1.0); main.position.set(0.28, 0, 0); g.add(main);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), M.body);
  tip.scale.set(0.55, 0.3, 0.75); tip.position.set(0.52, 0.02, 0); g.add(tip);
  return g;
}
const wingL = makeWing(); wingL.position.set(0.02, 1.42, -0.3); pelican.add(wingL);
const wingR = makeWing(); wingR.position.set(0.02, 1.42, 0.3); pelican.add(wingR);

// legs with 2-bone IK, parented to rig so feet always track pedals
function makeLeg(z) {
  const hip = new THREE.Group(); hip.position.set(-0.06, 1.04, z); rig.add(hip);
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.48, 8), M.leg);
  thigh.position.set(0, -0.24, 0); hip.add(thigh);
  const knee = new THREE.Group(); knee.position.set(0, -0.48, 0); hip.add(knee);
  const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 0.48, 8), M.leg);
  shin.position.set(0, -0.24, 0); knee.add(shin);
  const foot = new THREE.Group(); foot.position.set(0, -0.48, 0); knee.add(foot);
  const web = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), M.leg);
  web.scale.set(0.1, 0.032, 0.055); web.position.set(0.05, 0, 0); foot.add(web);
  return { hip, knee, foot };
}
const legR = makeLeg(0.12), legL = makeLeg(-0.12);

function ik(leg, tx, ty) {
  const L1 = 0.48, L2 = 0.48;
  const dx = tx + 0.06, dy = ty - 1.04;
  const d = clamp(Math.hypot(dx, dy), 0.05, L1 + L2 - 0.02);
  const base = Math.atan2(dx, -dy);
  const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const a = Math.acos(cosA);
  const hipRot = base + a;
  const kx = -0.06 + L1 * Math.sin(hipRot);
  const ky = 1.04 - L1 * Math.cos(hipRot);
  const shin = Math.atan2(tx - kx, -(ty - ky));
  leg.hip.rotation.z = hipRot;
  leg.knee.rotation.z = shin - hipRot;
  leg.foot.rotation.z = -shin;
}

rig.traverse(o => { if (o.isMesh) o.castShadow = true; });

/* ---------------- night blending ---------------- */
function applyNight(n) {
  skyU.top.value.copy(SKY_TOP_D).lerp(SKY_TOP_N, n);
  skyU.bot.value.copy(SKY_BOT_D).lerp(SKY_BOT_N, n);
  scene.fog.color.copy(FOG_D).lerp(FOG_N, n);
  sun.color.copy(SUN_D).lerp(SUN_N, n);
  sun.intensity = lerp(1.35, 0.25, n);
  hemi.intensity = lerp(0.85, 0.3, n);
  hemi.color.copy(HEMI_D).lerp(HEMI_N, n);
  hemi.groundColor.copy(HEMI_G_D).lerp(HEMI_G_N, n);
  headlight.intensity = n * 35;
  lensMat.emissiveIntensity = n * 2.4;
  stars.material.opacity = n * 0.9;
  sunDisc.visible = n < 0.5;
  moon.visible = n >= 0.5;
  pollenMat.color.copy(POL_D).lerp(POL_N, n);
  pollenMat.opacity = lerp(0.4, 0.9, n);
  for (const [mat, d, nn] of nightPairs) mat.color.set(d).lerp(tmpC.set(nn), n);
}

/* ---------------- audio (all synthesized) ---------------- */
let AC = null, master = null, noiseBuf = null;
function audio() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.8; master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.1 | 0, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function env(g, t0, peak, dur) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}
function ringBell() {
  const a = audio(), t0 = a.currentTime + 0.01;
  for (const off of [0, 0.15]) {
    for (const [f, pk] of [[2093, 0.2], [2093 * 2.71, 0.06]]) {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.value = f;
      env(g, t0 + off, pk, 0.5);
      o.connect(g).connect(master);
      o.start(t0 + off); o.stop(t0 + off + 0.55);
    }
  }
}
const NOTES = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880];
const MELODY = [0, 2, 4, -1, 5, 4, 2, -1, 4, 5, 7, -1, 5, 4, 2, 0, 2, 4, 5, -1, 7, 5, 4, -1, 5, 7, 9, 7, 5, 4, 2, 0];
const BASSLINE = [130.81, 98, 110, 130.81];
let musicOn = false, mStep = 0, mNext = 0, mTimer = null;
function pluck(f, t0, pk = 0.15, dur = 0.26, type = 'triangle') {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = f;
  env(g, t0, pk, dur);
  o.connect(g).connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function kick(t0) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t0);
  o.frequency.exponentialRampToValueAtTime(42, t0 + 0.11);
  env(g, t0, 0.5, 0.14);
  o.connect(g).connect(master);
  o.start(t0); o.stop(t0 + 0.2);
}
function hat(t0) {
  const s = AC.createBufferSource(); s.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
  const g = AC.createGain(); env(g, t0, 0.045, 0.05);
  s.connect(f).connect(g).connect(master);
  s.start(t0); s.stop(t0 + 0.07);
}
function schedule() {
  const DUR = 60 / 108 / 2;
  while (mNext < AC.currentTime + 0.28) {
    const s = mStep % 32;
    const nIdx = MELODY[s];
    if (nIdx >= 0) pluck(NOTES[nIdx], mNext);
    if (s % 8 === 0) { pluck(BASSLINE[(s / 8) | 0], mNext, 0.2, 0.5, 'sine'); kick(mNext); }
    if (s % 2 === 1) hat(mNext);
    mStep++; mNext += DUR;
  }
}
function toggleMusic() {
  if (!musicOn) {
    audio();
    mStep = 0; mNext = AC.currentTime + 0.06;
    schedule();
    mTimer = setInterval(schedule, 95);
  } else {
    clearInterval(mTimer);
  }
  musicOn = !musicOn;
}

/* ---------------- UI ---------------- */
let speedSetting = 0.55;
$('speed').addEventListener('input', e => { speedSetting = e.target.value / 100; });
$('btnNight').addEventListener('click', e => { nightT = nightT ? 0 : 1; e.currentTarget.classList.toggle('on', nightT === 1); });
$('btnWings').addEventListener('click', e => { flapT = flapT ? 0 : 1; e.currentTarget.classList.toggle('on', flapT === 1); });
$('btnOrbit').addEventListener('click', e => { controls.autoRotate = !controls.autoRotate; controls.autoRotateSpeed = 1.3; e.currentTarget.classList.toggle('on', controls.autoRotate); });
$('btnBell').addEventListener('click', ringBell);
$('btnMusic').addEventListener('click', e => { toggleMusic(); e.currentTarget.classList.toggle('on', musicOn); });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

/* ---------------- animation loop ---------------- */
const clock = new THREE.Clock();
let started = false, frame = 0;
let v = 0, dist = 0;
let night = 0, nightT = 0, flapK = 0, flapT = 0;
const spdEl = $('spd');

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  v += (speedSetting * 9 - v) * Math.min(1, dt * 1.8);
  dist += v * dt;

  const wheelA = -dist / 0.5;
  const crankA = wheelA * 0.42;
  wheelF.rotation.z = wheelA;
  wheelR.rotation.z = wheelA;
  crankG.rotation.z = crankA;
  pedalR.rotation.z = -crankA;
  pedalL.rotation.z = -crankA;

  const tRx = -0.26 * Math.sin(crankA), tRy = 0.4 + 0.26 * Math.cos(crankA);
  const tLx = 0.26 * Math.sin(crankA), tLy = 0.4 - 0.26 * Math.cos(crankA);
  ik(legR, tRx, tRy);
  ik(legL, tLx, tLy);

  const amp = Math.min(1, v / 3);
  rig.position.y = 0.02 * Math.sin(crankA * 2) * amp;
  pelican.position.y = 0.015 * Math.sin(t * 7.3) * amp;
  headG.rotation.z = 0.05 * Math.sin(t * 7.3 + 1.2);
  pouch.scale.y = 0.9 * (1 + 0.06 * Math.sin(t * 9));

  flapK += (flapT - flapK) * Math.min(1, dt * 2.5);
  const rideZ = -0.72 + 0.05 * Math.sin(t * 7.3);
  const flapZ = -0.2 + 0.55 * Math.sin(t * 10);
  wingL.rotation.z = lerp(rideZ, flapZ, flapK);
  wingR.rotation.z = lerp(rideZ, flapZ, flapK);
  const splay = flapK * (0.5 + 0.12 * Math.sin(t * 10 + 0.9));
  wingL.rotation.y = splay;
  wingR.rotation.y = -splay;

  for (const tr of trees) {
    tr.position.x -= v * dt;
    if (tr.position.x < -175) { tr.position.x += 350; randomizeTree(tr); }
  }
  for (const cl of clouds) {
    cl.position.x -= v * 0.35 * dt;
    if (cl.position.x < -190) cl.position.x += 380;
  }
  roadTex.offset.x += (v * dt * 14) / 300;

  const pa = pollenGeo.attributes.position;
  for (let i = 0; i < POLLEN_N; i++) {
    const i3 = i * 3;
    let x = pollenBase[i3] - dist * 0.4;
    x = ((x + 45) % 90 + 90) % 90 - 45;
    pa.array[i3] = x;
    pa.array[i3 + 1] = pollenBase[i3 + 1] + Math.sin(t * 0.8 + pollenPhase[i]) * 0.3;
  }
  pa.needsUpdate = true;

  night += (nightT - night) * Math.min(1, dt * 2.2);
  applyNight(night);
  bloomPass.strength = 0.35 + night * 0.55;
  renderer.toneMappingExposure = 1.05 + night * 0.1;

  frame++;
  if ((frame & 7) === 0) spdEl.textContent = (v * 3.6).toFixed(1);
  if (!started) {
    started = true;
    const l = $('loading');
    l.style.opacity = '0';
    setTimeout(() => l.remove(), 600);
  }

  controls.update();
  composer.render();
}
animate();
