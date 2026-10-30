/* ============================================================================
   V6 PRO · PRECISION TEARDOWN
   Cinema 4D mesh (03OK.c4d) + Three.js + procedural Web Audio.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
  const smooth = t => t * t * (3 - 2 * t);
  const TAU = Math.PI * 2;
  const isMobile = () => innerWidth <= 1180;
  const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  /* --------------------------------------------------------------------------
     PART DATA
     -------------------------------------------------------------------------- */
  const PART_NAMES = [
    '输出斜齿轮', '小挡圈 / 磁钢座', '轴承外圈 A', '轴套 / 法兰环',
    '前端盖 / 轴承座', '主外壳', '轴承圈 A', '轴承圈 B',
    '中间垫圈', '平面垫片', '长支撑杆 A', '长支撑杆 B',
    '长支撑杆 C', '主轴 / 长轴', '薄垫片 A', '长支撑杆 D',
    '细卡环', '长支撑杆 E', '带肋圆柱 / 转子壳', '弯曲导管 A',
    '弯曲导管 B', '弯曲导管 C', '大型内部核心', '外部切口筒 / 护罩',
    '顶部盖板', '弹簧销 / 弹片 A', '弹簧销 / 弹片 B', '内隔板',
    '绝缘薄片', '弹簧销 / 弹片 C', '后盖 / 安装板', '接线块 / 绝缘块',
    '支架 / 固定环', '长弹簧螺栓 A', '长弹簧螺栓 B', '长弹簧螺栓 C',
    '长弹簧螺栓 D'
  ];

  const PART_GROUP = [
    1, 1, 2, 3, 4, 5, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
    8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 10, 10, 11, 12, 12, 12, 12
  ];

  const GROUP_DEFS = [
    { name: '输出齿轮组', en: 'OUTPUT GEAR STACK', color: '#ffad5c', desc: '位于输出端，包含斜齿轮与轴端挡圈，是拆解时最先观察到的传动接口。' },
    { name: '前轴承圈', en: 'FRONT BEARING RING', color: '#c8d7eb', desc: '前端支撑环件，用于轴向定位与旋转支撑。' },
    { name: '轴套与法兰', en: 'SLEEVE & FLANGE', color: '#aebed4', desc: '轴系与端盖之间的过渡套件。' },
    { name: '前端盖', en: 'FRONT END BELL', color: '#d5e0ef', desc: '前端封闭与轴承座组件，形成输出轴的支撑基准。' },
    { name: '主外壳', en: 'MAIN HOUSING', color: '#4f5b6c', desc: '主承力外壳，带散热筋与侧面标识，是整机的外部装甲。' },
    { name: '轴承圈组', en: 'BEARING RINGS', color: '#bfd0e4', desc: '两级薄壁轴承圈与垫圈，用于内部旋转件定位。' },
    { name: '轴系与内部支撑', en: 'SHAFT & INTERNAL SUPPORT', color: '#9fb0c6', desc: '包含主轴、支撑杆、垫片与卡环，是拆解层级最多的内部组。' },
    { name: '核心组件与导管', en: 'CORE & CONDUITS', color: '#d3824d', desc: '大型内部核心、开口护罩与弯曲导管，是模型中最复杂的几何区域。' },
    { name: '顶部盖板与弹性组件', en: 'TOP COVER & SPRINGS', color: '#7188a6', desc: '端部盖板、隔板与带螺旋弹簧的弹性组件。' },
    { name: '后盖与接线', en: 'REAR COVER & TERMINAL', color: '#7d90aa', desc: '后部封闭板与小型接线/绝缘块。' },
    { name: '支架与固定环', en: 'BRACKET & RETAINER', color: '#c4d3e6', desc: '外围固定支架，负责总成与外壳之间的连接。' },
    { name: '弹簧螺栓组', en: 'SPRING BOLT SET', color: '#b9c7da', desc: '四颗带弹簧的长螺栓，用于端部预压与紧固。' }
  ];

  const GROUP_FOR_PART = PART_GROUP.map(g => GROUP_DEFS[g - 1]);
  const INFERRED = new Set([1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 23, 25, 26, 27, 28, 29, 31, 32]);
  const PART_UNCERTAIN = PART_NAMES.map((_, i) => INFERRED.has(i));

  const PART_DESC = {
    1: '输出端的斜齿轮件，位于整机顶部。它的齿形与轴线决定输出接口的传动方向，是拆解顺序中的第一层零件。',
    6: '整机外部主壳体，带散热筋、侧面切口与激光标识。它是所有内部总成的外部保护与承载结构。',
    14: '整机最长的主轴件，贯穿内部轴系并与输出端连接。拆解后可观察它与轴承、端盖和核心组件的同轴关系。',
    23: '模型内部面数最高的核心件，具有纵向槽与复杂内腔。它位于整机中心区域，是内部结构中最值得单独观察的零件。',
    24: '大开口外部筒件，包覆核心区域。它与主外壳形成内外两层保护，拆解后可以看清内部核心的装配位置。'
  };

  const SHELL_PALETTE = [
    { name: '钛蓝', hex: '#2f4a68', color: 0x2f4a68, light: false },
    { name: '石墨黑', hex: '#30343b', color: 0x30343b, light: false },
    { name: '熔岩橙', hex: '#c74b20', color: 0xc74b20, light: false },
    { name: '森林绿', hex: '#31584d', color: 0x31584d, light: false },
    { name: '香槟金', hex: '#b89a68', color: 0xb89a68, light: true },
    { name: '象牙白', hex: '#dedbd3', color: 0xdedbd3, light: true },
    { name: '钴蓝', hex: '#2453b8', color: 0x2453b8, light: false },
    { name: '雾银', hex: '#9aa5b1', color: 0x9aa5b1, light: true }
  ];
  const FINISHES = [
    { id: 'satin', name: '缎面', roughness: .32, clearcoat: .45 },
    { id: 'gloss', name: '亮面', roughness: .16, clearcoat: .95 },
    { id: 'matte', name: '哑光', roughness: .54, clearcoat: .12 }
  ];
  const MAT_PRESETS = {
    shellBlack: { color: 0x171718, metalness: .82, roughness: .3, clearcoat: .55 },
    statorBlack: { color: 0x1D1D1E, metalness: .75, roughness: .34, clearcoat: .32 },
    redAnodized: { color: 0x981B2B, metalness: .78, roughness: .28, clearcoat: .55 },
    brandRed: { color: 0xDB242A, metalness: .55, roughness: .3, clearcoat: .4 },
    gold: { color: 0xB08A4A, metalness: .92, roughness: .23 },
    pcbGreen: { color: 0x508432, metalness: .18, roughness: .46, clearcoat: .25 },
    chrome: { color: 0xC9C5C6, metalness: 1.0, roughness: .12 },
    aluminum: { color: 0x9C9899, metalness: .88, roughness: .3 },
    polished: { color: 0xD3D0D1, metalness: 1.0, roughness: .1 },
    stainless: { color: 0x7E7A7B, metalness: .94, roughness: .27 },
    darkSteel: { color: 0x353334, metalness: .9, roughness: .38 },
    gunmetal: { color: 0x2A292A, metalness: .9, roughness: .35 },
    bronze: { color: 0x87653F, metalness: .9, roughness: .34 },
    copper: { color: 0x9C4F2D, metalness: .9, roughness: .32 },
    spring: { color: 0xB4B0B1, metalness: .98, roughness: .22 },
    blackOxide: { color: 0x1A1A1B, metalness: .7, roughness: .46 },
    graphite: { color: 0x333132, metalness: .84, roughness: .32 },
    plastic: { color: 0x101011, metalness: .18, roughness: .64 },
    core: { color: 0x514440, metalness: .72, roughness: .42 }
  };
  const PART_MATERIAL = [
    'blackOxide', 'redAnodized', 'chrome', 'aluminum', 'aluminum', 'shellBlack', 'chrome', 'chrome',
    'stainless', 'stainless', 'stainless', 'stainless', 'darkSteel', 'polished', 'bronze',
    'stainless', 'blackOxide', 'darkSteel', 'gunmetal', 'copper', 'copper', 'copper',
    'core', 'statorBlack', 'graphite', 'spring', 'spring', 'blackOxide', 'pcbGreen', 'spring',
    'blackOxide', 'gold', 'redAnodized', 'blackOxide', 'blackOxide', 'blackOxide', 'blackOxide'
  ];
  const SHELL_PARTS = new Set([5, 23, 24, 30]);
  const AXIAL_LAYERS = [
    { id: 'L1', name: '后盖与紧固', en: 'REAR COVER / FASTENERS', parts: [31, 32, 34, 35, 36, 37], desc: '后盖、接线块、固定环与四颗长弹簧螺栓，是整机的尾部封装层。' },
    { id: 'L2', name: '压圈与盖板', en: 'RETAINER / PLATES', parts: [3, 9, 10, 25, 28, 33], desc: '轴承外圈、垫片、顶部盖板、内隔板与红色固定压圈。' },
    { id: 'L3', name: '定子与导管', en: 'STATOR / CONDUITS', parts: [11, 12, 13, 16, 18, 19, 20, 21, 22, 23, 24], desc: '定子核心、长支撑杆、弯曲导管与带白色铭牌的定子筒。' },
    { id: 'L4', name: '传感器与弹性件', en: 'SENSOR / SPRINGS', parts: [26, 27, 29, 30], desc: '绿色传感器 PCB、绝缘薄片与三组弹簧销。' },
    { id: 'L5', name: '转子与主轴', en: 'ROTOR / SHAFT', parts: [7, 8, 14, 15, 17], desc: '主轴、轴承圈、薄垫片与细卡环，是输出端的旋转基准。' },
    { id: 'L6', name: '外转子壳', en: 'OUTER ROTOR SHELL', parts: [6], desc: '黑色阳极氧化外转子壳，切口内露红色内衬。' },
    { id: 'L7', name: '前端盖与法兰', en: 'FRONT COVER / FLANGE', parts: [2, 4, 5], desc: '前端盖、轴套法兰与小挡圈，承托输出端。' },
    { id: 'L8', name: '输出齿轮', en: 'OUTPUT PINION', parts: [1], desc: '顶部输出斜齿轮，是整机的动力输出接口。' }
  ];
  const LAYER_GAP = 16;
  const MATERIAL_LABELS = {
    shellBlack: '黑色阳极氧化', statorBlack: '黑色定子筒', redAnodized: '红色阳极层',
    brandRed: '品牌红', gold: '金色端子', pcbGreen: '绿色 PCB',
    chrome: '镀铬轴承钢', aluminum: '铝合金', polished: '抛光钢', stainless: '不锈钢',
    darkSteel: '发黑钢', gunmetal: '枪色钢', bronze: '青铜', copper: '紫铜',
    spring: '弹簧钢', blackOxide: '发黑处理', graphite: '石墨涂层',
    plastic: '工程塑料', core: '硅钢 / 核心'
  };

  /* --------------------------------------------------------------------------
     AUDIO
     -------------------------------------------------------------------------- */
  class SoundLab {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.noise = null;
      this.enabled = true;
      this.volume = 0.6;
      this.lastHover = 0;
      this.ready = false;
    }
    init() {
      if (this.ready) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? this.volume : 0;
        this.master.connect(this.ctx.destination);
        const len = Math.floor(this.ctx.sampleRate * 0.8);
        const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noise = b;
        this.ready = true;
      } catch (e) {
        this.ready = false;
      }
    }
    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    }
    setEnabled(on) {
      this.enabled = !!on;
      if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
    }
    setVolume(v) {
      this.volume = clamp(v, 0, 1);
      if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
    }
    tone(freq, dur, type, vol, endFreq) {
      if (!this.ready || !this.enabled) return;
      this.resume();
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + .02);
    }
    burst(dur, vol, filterFreq, q, sweep) {
      if (!this.ready || !this.enabled) return;
      this.resume();
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.Q.value = q || 1.2;
      f.frequency.setValueAtTime(filterFreq, t);
      if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(80, sweep), t + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + dur + .02);
    }
    hover() {
      const n = performance.now();
      if (n - this.lastHover < 90) return;
      this.lastHover = n;
      this.tone(1450, .035, 'sine', .012, 1900);
    }
    click() {
      this.tone(520, .055, 'triangle', .06, 240);
      this.tone(1900, .045, 'sine', .025, 1200);
      this.burst(.045, .035, 2200, 1.8, 900);
    }
    explode() {
      this.burst(.5, .12, 260, 1.1, 1700);
      this.tone(72, .38, 'sine', .09, 44);
      this.tone(420, .18, 'triangle', .035, 780);
    }
    assemble() {
      this.burst(.38, .08, 1500, 1.4, 260);
      this.tone(90, .25, 'sine', .065, 45);
      this.tone(1200, .12, 'triangle', .025, 480);
    }
    zap() {
      this.burst(.17, .055, 4300, 2.4, 720);
      this.tone(140, .14, 'sawtooth', .022, 58);
      this.tone(2600, .06, 'square', .008, 1100);
    }
    ui() {
      this.tone(980, .03, 'sine', .018, 1200);
    }
    test() {
      this.explode();
      setTimeout(() => this.click(), 280);
      setTimeout(() => this.assemble(), 620);
    }
  }

  const sound = new SoundLab();

  /* --------------------------------------------------------------------------
     STATE
     -------------------------------------------------------------------------- */
  const state = {
    ready: false,
    mode: 'assembled',         // assembled | axial
    progress: 0,
    progressTarget: 0,
    progressFrom: 0,
    progressStart: 0,
    progressDuration: .6,
    axial: false,
    focusLayer: -1,
    layerFocus: 0,
    layerFocusTarget: 0,
    selected: -1,
    hovered: -1,
    _partFocusSized: -1,
    driftActive: false,
    driftBlend: 0,
    driftTarget: 0,
    driftClock: 0,
    background: 'studio',
    bgChosen: false,
    _fxUiKey: '',
    autoRotate: true,
    showAllLabels: true,
    soundOpen: false,
    shellTransparent: false,
    particlesOn: false,
    entered: false,
    introActive: false,
    launch: { intro: true, auto: true, sound: true, particles: false },
    assemblyRot: 0,
    assemblyRotTarget: 0,
    axialSpan: 0,
    axialRadius: 400,
    axialTargetX: 0,
    lastLayerTagUpdate: 0,
    theta: 0.62, phi: 1.17, radius: 245,
    thetaTarget: 0.62, phiTarget: 1.17, radiusTarget: 245,
    target: new THREE.Vector3(), targetTarget: new THREE.Vector3(),
    zoom: 1,
    baseRadius: 245,
    dragging: false,
    dragMoved: 0,
    dragMode: 0,
    pointerDown: false,
    pointers: new Map(),
    pinch: 0,
    lastX: 0, lastY: 0,
    focusMode: false,
    dockTop: 0,
    lastFrame: performance.now(),
    lastLabelUpdate: 0
  };

  let renderer, scene, camera, clock, raycaster;
  let assembly, parts = [], groups = [];
  let selectedHalo, hoverHalo, selectionLight, particleField, bokehField, goldField;
  let fxGroup, fxDust, fxEmbers, fxBokeh, fxGlowPool = [], fxBgBolts = [], fxArcs = [], fxLights = [];
  let fxFlashEl, fxDockEl;
  const fx = {
    flash: 0, nextStrike: .7, nextBg: .08,
    arcIndex: 0, lastZap: 0, glowIndex: 0
  };
  let tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
  let tmpBox = new THREE.Box3(), tmpSphere = new THREE.Sphere();
  const tmpQ = new THREE.Quaternion();
  let envTexture;
  let audioBound = false;

  const labelEls = [], leaderEls = [], leaderDots = [], layerTagEls = [];
  let partListEl, inspectorScroll, scrollHint, scrollFade;

  /* --------------------------------------------------------------------------
     UTILITIES / SCENE
     -------------------------------------------------------------------------- */
  function makeCanvasTexture(w, h, draw, srgb, repeat) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
    }
    return t;
  }

  function initRenderer() {
    const canvas = $('#scene');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .88;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.sortObjects = true;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xeef2f6, 0.00055);
    camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, .1, 2000);
    camera.position.set(130, 60, 230);
    raycaster = new THREE.Raycaster();
    clock = new THREE.Clock();
  }

  function buildEnvironment() {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const env = new THREE.Scene();
    env.background = new THREE.Color(0xe9edf2);
    const panel = (x, y, z, w, h, c, power) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); m.scale.setScalar(power); env.add(m);
    };
    panel(-90, 135, 90, 150, 90, 0xffffff, 2.35);
    panel(110, 50, 100, 100, 140, 0xdfeaff, 1.8);
    panel(-110, 10, -100, 100, 90, 0x9ab6e0, 1.3);
    panel(70, -100, 80, 80, 90, 0xffc5a8, .85);
    panel(150, 120, 20, 40, 120, 0xffffff, 1.55);
    panel(-150, -30, 90, 50, 100, 0xc8e8ff, 1.1);
    panel(0, 160, 0, 220, 100, 0xffffff, 1.9);
    panel(-155, 15, 15, 34, 170, 0x26313f, 1.35);
    panel(82, 55, -155, 70, 100, 0x33455c, 1.2);
    envTexture = pmrem.fromScene(env, .035).texture;
    scene.environment = envTexture;
    pmrem.dispose();
    env.traverse(o => {
      if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); }
    });
  }

  function addLights() {
    scene.add(new THREE.AmbientLight(0xffffff, .2));
    const key = new THREE.DirectionalLight(0xfff5e8, 1.45);
    key.position.set(-90, 135, 130);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -170;
    key.shadow.camera.right = 170;
    key.shadow.camera.top = 190;
    key.shadow.camera.bottom = -120;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 500;
    key.shadow.bias = -.0008;
    key.shadow.normalBias = .025;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xcfe0ff, .58);
    fill.position.set(130, 35, 80); scene.add(fill);
    const rim = new THREE.DirectionalLight(0x9adfff, 1.35);
    rim.position.set(-95, 55, -145); scene.add(rim);
    const warm = new THREE.DirectionalLight(0xff9a6a, .32);
    warm.position.set(95, 85, -55); scene.add(warm);
    const front = new THREE.DirectionalLight(0xf4f8ff, .72);
    front.position.set(0, 45, 190); scene.add(front);
    const top = new THREE.DirectionalLight(0xffffff, .35);
    top.position.set(0, 210, 30); scene.add(top);
    const topSpot = new THREE.PointLight(0xE8E4E5, 3.4, 190, 2);
    topSpot.position.set(0, 110, 65); scene.add(topSpot);
    const spot = new THREE.SpotLight(0xffffff, 16, 280, .52, .92, 1.6);
    spot.position.set(15, 145, 105);
    spot.target.position.set(0, 0, 0);
    scene.add(spot); scene.add(spot.target);
    const warmRim = new THREE.PointLight(0xC9C5C6, 2.4, 120, 2);
    warmRim.position.set(60, 18, -80); scene.add(warmRim);
  }

  function buildFloor() {
    const shadowTexture = makeCanvasTexture(512, 512, (ctx, w, h) => {
      const g = ctx.createRadialGradient(256, 256, 8, 256, 256, 252);
      g.addColorStop(0, 'rgba(8,9,10,.62)');
      g.addColorStop(.42, 'rgba(8,9,10,.28)');
      g.addColorStop(1, 'rgba(8,9,10,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }, true);

    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(112, 112), new THREE.MeshBasicMaterial({
      map: shadowTexture, transparent: true, opacity: .55, depthWrite: false
    }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -56.6;
    shadow.renderOrder = 1;
    state.floorShadow = shadow;
    scene.add(shadow);

    const positions = new Float32Array(70 * 3);
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * TAU, r = 44 + Math.random() * 80;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = -30 + Math.random() * 115;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleField = new THREE.Points(pg, new THREE.PointsMaterial({
      color: 0x8F8A8B, size: .6, transparent: true, opacity: .24,
      depthWrite: false, sizeAttenuation: true
    }));
    particleField.visible = state.particlesOn;
    scene.add(particleField);

    const bokehTexture = makeCanvasTexture(64, 64, (ctx, w, h) => {
      const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
      g.addColorStop(0, 'rgba(255,255,255,.9)');
      g.addColorStop(.35, 'rgba(255,255,255,.4)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }, true);
    const bp = new Float32Array(24 * 3);
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * TAU, r = 48 + Math.random() * 72;
      bp[i * 3] = Math.cos(a) * r;
      bp[i * 3 + 1] = -28 + Math.random() * 112;
      bp[i * 3 + 2] = Math.sin(a) * r;
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    bokehField = new THREE.Points(bg, new THREE.PointsMaterial({
      map: bokehTexture, color: 0x9A9697, size: 3.2, transparent: true, opacity: .18,
      depthWrite: false, sizeAttenuation: true, blending: THREE.NormalBlending, alphaTest: .01
    }));
    bokehField.visible = state.particlesOn;
    scene.add(bokehField);

    goldField = null;
  }

  /* --------------------------------------------------------------------------
     SPACE FX / DRIFT STORM
     -------------------------------------------------------------------------- */
  function makeBolt(count, coreOpacity, haloOpacity) {
    const positions = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, 0);
    const core = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0xF7F5F5, transparent: true, opacity: coreOpacity,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true
    }));
    const halo = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0xDB242A, transparent: true, opacity: haloOpacity,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true
    }));
    core.frustumCulled = false; halo.frustumCulled = false;
    core.renderOrder = 21; halo.renderOrder = 20;
    core.visible = false; halo.visible = false;
    fxGroup.add(halo, core);
    return { geo, core, halo, count, positions, baseCore: coreOpacity, baseHalo: haloOpacity };
  }

  function setBoltPath(bolt, pts) {
    const n = Math.min(pts.length, bolt.count);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      bolt.positions[i * 3] = p.x;
      bolt.positions[i * 3 + 1] = p.y;
      bolt.positions[i * 3 + 2] = p.z;
    }
    bolt.geo.setDrawRange(0, n);
    bolt.geo.attributes.position.needsUpdate = true;
    bolt.geo.computeBoundingSphere();
    bolt.core.visible = true;
    bolt.halo.visible = true;
  }

  function jaggedPath(list, segments, amp) {
    const out = [];
    for (let k = 0; k < list.length - 1; k++) {
      const a = list[k], b = list[k + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      for (let j = 0; j <= segments; j++) {
        if (k > 0 && j === 0) continue;
        const t = j / segments;
        const p = a.clone().lerp(b, t);
        if (j > 0 && j < segments) {
          const s = Math.sin(Math.PI * t);
          const jit = (Math.random() - .5) * amp * s;
          p.x += nx * jit;
          p.y += ny * jit;
          p.z += (Math.random() - .5) * amp * .85 * s;
        }
        out.push(p);
      }
    }
    return out;
  }

  function partFxCenter(p) {
    p.mesh.updateWorldMatrix(true, false);
    return new THREE.Box3().setFromObject(p.mesh).getCenter(new THREE.Vector3());
  }

  function buildFx() {
    if (fxGroup) return;
    fxGroup = new THREE.Group();
    fxGroup.name = 'FX_STORM';
    scene.add(fxGroup);

    const glowTex = makeCanvasTexture(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(64, 64, 1, 64, 64, 63);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(.18, 'rgba(255,255,255,.85)');
      g.addColorStop(.48, 'rgba(219,36,42,.25)');
      g.addColorStop(1, 'rgba(219,36,42,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }, true);
    fx.glowTex = glowTex;

    const dustCount = 300;
    const dpos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dpos[i * 3] = (Math.random() - .5) * 440;
      dpos[i * 3 + 1] = assembly.position.y + (Math.random() - .5) * 240;
      dpos[i * 3 + 2] = (Math.random() - .5) * 250;
    }
    const dgeo = new THREE.BufferGeometry();
    dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    fxDust = new THREE.Points(dgeo, new THREE.PointsMaterial({
      map: glowTex, color: 0xF7F5F5, size: 3.6, transparent: true, opacity: .68,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
      alphaTest: .01, sizeAttenuation: true
    }));
    fxDust.frustumCulled = false;
    fxDust.visible = false;
    fxGroup.add(fxDust);

    const bokehCount = 54;
    const bpos = new Float32Array(bokehCount * 3);
    for (let i = 0; i < bokehCount; i++) {
      bpos[i * 3] = (Math.random() - .5) * 430;
      bpos[i * 3 + 1] = assembly.position.y + (Math.random() - .5) * 250;
      bpos[i * 3 + 2] = -40 + Math.random() * 180;
    }
    const bgeo = new THREE.BufferGeometry();
    bgeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
    fxBokeh = new THREE.Points(bgeo, new THREE.PointsMaterial({
      map: glowTex, color: 0xDED9DA, size: 12.5, transparent: true, opacity: .16,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
      alphaTest: .01, sizeAttenuation: true
    }));
    fxBokeh.frustumCulled = false;
    fxBokeh.visible = false;
    fxGroup.add(fxBokeh);

    const emberCount = 110;
    const epos = new Float32Array(emberCount * 3);
    fx.emberSpeeds = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      epos[i * 3] = (Math.random() - .5) * 390;
      epos[i * 3 + 1] = assembly.position.y + (Math.random() - .5) * 230;
      epos[i * 3 + 2] = (Math.random() - .5) * 210;
      fx.emberSpeeds[i] = 1.4 + Math.random() * 4.2;
    }
    const egeo = new THREE.BufferGeometry();
    egeo.setAttribute('position', new THREE.BufferAttribute(epos, 3));
    fxEmbers = new THREE.Points(egeo, new THREE.PointsMaterial({
      map: glowTex, color: 0xDB242A, size: 5.0, transparent: true, opacity: .8,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
      alphaTest: .01, sizeAttenuation: true
    }));
    fxEmbers.frustumCulled = false;
    fxEmbers.visible = false;
    fxGroup.add(fxEmbers);

    for (let i = 0; i < 18; i++) {
      const mat = new THREE.SpriteMaterial({
        map: glowTex, color: i % 2 ? 0xDB242A : 0xF7F5F5, transparent: true,
        opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      sprite.scale.setScalar(18);
      fxGroup.add(sprite);
      fxGlowPool.push({ sprite, life: 0, max: 1, size: 18 });
    }

    // Thin orbit guides make the storm read as a designed system, not noise.
    fx.orbitRings = [];
    [
      { r: 214, z: -18, color: 0xDB242A },
      { r: 152, z: 16, color: 0xC9C5C6 },
      { r: 96, z: -4, color: 0x7E7A7B }
    ].forEach((band, bi) => {
      const radius = band.r * state.model.scale;
      const pts = [];
      for (let i = 0; i < 160; i++) {
        const a = i / 160 * TAU;
        pts.push(new THREE.Vector3(
          Math.sin(a) * radius,
          assembly.position.y - Math.cos(a) * radius * [0.9, 0.84, 0.78][bi],
          band.z * state.model.scale
        ));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: band.color, transparent: true, opacity: 0,
        depthWrite: false, depthTest: true
      });
      const ring = new THREE.LineLoop(geo, mat);
      ring.renderOrder = 2;
      fxGroup.add(ring);
      fx.orbitRings.push({ ring, mat, base: bi === 0 ? .16 : .115 });
    });
    const core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xDB242A, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true
    }));
    core.position.set(0, assembly.position.y, 0);
    core.scale.setScalar(70);
    fxGroup.add(core);
    fx.core = core;

    for (let i = 0; i < 2; i++) {
      const light = new THREE.PointLight(i ? 0xDB242A : 0xF7F5F5, 0, 220, 2);
      fxGroup.add(light);
      fxLights.push(light);
    }
    fx.fill = [];
    const fillA = new THREE.DirectionalLight(0xDB242A, 0);
    fillA.position.set(130, 70, 170);
    const fillB = new THREE.DirectionalLight(0xF7F5F5, 0);
    fillB.position.set(-130, 170, 110);
    fxGroup.add(fillA, fillB);
    fx.fill.push(fillA, fillB);

    for (let i = 0; i < 3; i++) {
      const b = makeBolt(22, .14, .06);
      b.phase = Math.random() * TAU;
      fxBgBolts.push(b);
    }
    for (let i = 0; i < 2; i++) {
      const a = makeBolt(28, .9, .34);
      a.life = 0; a.max = .4;
      fxArcs.push(a);
    }

    fxGroup.visible = false;
    fxFlashEl = $('#fxFlash');
    fxDockEl = $('#fxDock');
  }

  function refreshBackgroundBolt(b, i) {
    const z = -105 - i * 14;
    const a = new THREE.Vector3(
      -170 + Math.random() * 70,
      assembly.position.y - 95 + Math.random() * 190,
      z
    );
    const c = new THREE.Vector3(
      70 + Math.random() * 110,
      assembly.position.y - 95 + Math.random() * 190,
      z + (Math.random() - .5) * 24
    );
    setBoltPath(b, jaggedPath([a, c], 14, 28));
    b.baseOpacity = .055 + Math.random() * .14;
    b.core.material.opacity = b.baseOpacity;
    b.halo.material.opacity = b.baseOpacity * .62;
  }

  function spawnGlow(pos, size, color) {
    if (!fxGlowPool.length) return;
    const g = fxGlowPool[fx.glowIndex++ % fxGlowPool.length];
    g.sprite.position.copy(pos);
    g.sprite.material.color.setHex(color || 0xDB242A);
    g.life = .5 + Math.random() * .3;
    g.max = g.life;
    g.size = size;
    g.sprite.scale.setScalar(size);
    g.sprite.visible = true;
  }

  function triggerStrike() {
    if (!state.driftActive || !fxGroup) return;
    const pool = parts.filter(p => p.mesh.visible);
    if (pool.length < 2) return;
    const picks = [];
    while (picks.length < Math.min(3, pool.length)) {
      const p = pool[Math.floor(Math.random() * pool.length)];
      if (!picks.includes(p)) picks.push(p);
    }
    const centers = picks.map(partFxCenter);
    const path = jaggedPath(centers, 6, 18 + Math.random() * 14);
    const arc = fxArcs[fx.arcIndex++ % fxArcs.length];
    setBoltPath(arc, path);
    arc.life = arc.max = .52 + Math.random() * .26;
    picks.forEach(p => { p.fxPulse = 1; });
    centers.forEach((c, i) => spawnGlow(c, 22 + Math.random() * 16, i % 2 ? 0xDB242A : 0xF7F5F5));
    fxLights.forEach((l, i) => {
      const c = centers[Math.min(i, centers.length - 1)];
      l.position.copy(c).add(new THREE.Vector3(0, 0, 8));
      l.color.setHex(i ? 0xDB242A : 0xF7F5F5);
      l.intensity = i ? 3.6 : 5.2;
    });
    fx.flash = Math.min(.3, .18 + Math.random() * .1);
    if (performance.now() - fx.lastZap > 420) {
      sound.zap();
      fx.lastZap = performance.now();
    }
  }

  function updateFx(dt) {
    if (!fxGroup) return;
    const on = state.driftActive || state.driftBlend > .01;
    fxGroup.visible = on;
    if (fxFlashEl) {
      fx.flash = Math.max(0, fx.flash - dt * 3.4);
      fxFlashEl.style.opacity = fx.flash.toFixed(3);
    }
    if (!on) {
      fxArcs.forEach(a => { a.life = 0; a.core.visible = false; a.halo.visible = false; });
      fxBgBolts.forEach(b => { b.core.visible = false; b.halo.visible = false; });
      fxGlowPool.forEach(g => { g.life = 0; g.sprite.visible = false; });
      fxLights.forEach(l => { l.intensity = 0; });
      if (fx.fill) fx.fill.forEach(l => { l.intensity = 0; });
      if (fx.core) fx.core.material.opacity = 0;
      if (fx.orbitRings) fx.orbitRings.forEach(o => { o.mat.opacity = 0; });
      return;
    }
    const blend = Math.max(.05, state.driftBlend);
    if (fx.fill) {
      fx.fill[0].intensity = 1.15 * blend;
      fx.fill[1].intensity = .85 * blend;
    }
    fxDust.visible = fxEmbers.visible = fxBokeh.visible = true;
    fxDust.material.opacity = .58 * blend;
    fxEmbers.material.opacity = .78 * blend;
    fxBokeh.material.opacity = .17 * blend;
    if (fx.core) {
      const corePulse = .5 + .5 * Math.sin(state.driftClock * 1.7);
      fx.core.material.opacity = (.1 + corePulse * .08) * blend;
      const cs = 62 + corePulse * 20;
      fx.core.scale.set(cs, cs, 1);
    }
    if (fx.orbitRings) {
      fx.orbitRings.forEach((o, i) => {
        o.mat.opacity = o.base * blend * (i === 0 ? .85 : 1);
      });
    }
    fxDust.rotation.y += dt * .006;
    fxDust.rotation.z = Math.sin(state.driftClock * .09) * .035;
    fxEmbers.rotation.y -= dt * .0035;
    fxBokeh.rotation.y -= dt * .0018;

    const ea = fxEmbers.geometry.attributes.position.array;
    for (let i = 0; i < fx.emberSpeeds.length; i++) {
      ea[i * 3 + 1] += dt * fx.emberSpeeds[i];
      if (ea[i * 3 + 1] > assembly.position.y + 130) {
        ea[i * 3 + 1] = assembly.position.y - 125 + Math.random() * 25;
        ea[i * 3] = (Math.random() - .5) * 390;
        ea[i * 3 + 2] = (Math.random() - .5) * 210;
      }
    }
    fxEmbers.geometry.attributes.position.needsUpdate = true;

    if (state.driftActive) {
      fx.nextBg -= dt;
      if (fx.nextBg <= 0) {
        fxBgBolts.forEach((b, i) => { if (Math.random() < .82) refreshBackgroundBolt(b, i); });
        fx.nextBg = .075 + Math.random() * .11;
      }
      fxBgBolts.forEach(b => {
        if (!b.core.visible) return;
        const fl = .58 + .42 * Math.sin(performance.now() * .013 + b.phase);
        b.core.material.opacity = b.baseOpacity * fl * blend;
        b.halo.material.opacity = b.baseOpacity * .55 * fl * blend;
      });
      fx.nextStrike -= dt;
      if (fx.nextStrike <= 0) {
        triggerStrike();
        fx.nextStrike = .4 + Math.random() * .56;
      }
    } else {
      fxBgBolts.forEach(b => {
        b.core.material.opacity *= .88;
        b.halo.material.opacity *= .88;
      });
    }

    fxArcs.forEach(a => {
      if (a.life > 0) {
        a.life -= dt;
        const k = clamp(a.life / a.max, 0, 1);
        a.core.material.opacity = .98 * k * blend;
        a.halo.material.opacity = .4 * k * blend;
        a.core.visible = a.halo.visible = k > 0;
      }
    });
    fxLights.forEach(l => { l.intensity = damp(l.intensity, 0, 7, dt); });
    fxGlowPool.forEach(g => {
      if (g.life > 0) {
        g.life -= dt;
        const k = clamp(g.life / g.max, 0, 1);
        g.sprite.material.opacity = .78 * k * blend;
        const sc = g.size * (1 + (1 - k) * .55);
        g.sprite.scale.set(sc, sc, 1);
        if (g.life <= 0) g.sprite.visible = false;
      }
    });
  }

  function setBackground(mode, silent) {
    state.background = mode === 'space' ? 'space' : 'studio';
    document.body.classList.toggle('bg-space', state.background === 'space');
    const label = $('#bgModeLabel');
    if (label) label.textContent = state.background === 'space' ? '深空黑' : '影棚灰';
    const boltCore = state.background === 'space' ? 0xF7F5F5 : 0x981B2B;
    const boltHalo = state.background === 'space' ? 0xDB242A : 0x7F1826;
    [...fxBgBolts, ...fxArcs].forEach(b => {
      b.core.material.color.setHex(boltCore);
      b.halo.material.color.setHex(boltHalo);
    });
    if (!silent) sound.ui();
    updateFxUI();
  }

  function toggleBackground() {
    state.bgChosen = true;
    setBackground(state.background === 'space' ? 'studio' : 'space');
  }

  function prepareDrift() {
    // A curated orbital field instead of a chaotic scatter. The largest parts
    // hold the outer ring, medium parts the middle band, small hardware the core.
    const bands = [
      { radius: 214, z: -18, speed: .032, squash: .9, count: 12, color: 0xDB242A },
      { radius: 152, z: 16, speed: -.052, squash: .84, count: 13, color: 0xC9C5C6 },
      { radius: 96, z: -4, speed: .078, squash: .78, count: 12, color: 0x7E7A7B }
    ];
    const sizeOf = p => Math.max(p.rawSize.x, p.rawSize.y, p.rawSize.z);
    const sorted = parts.slice().sort((a, b) => sizeOf(b) - sizeOf(a));
    let cursor = 0;
    bands.forEach((band, bi) => {
      const slice = sorted.slice(cursor, cursor + band.count);
      cursor += band.count;
      slice.forEach((p, i) => {
        const angle = (i / band.count) * TAU + bi * .8 + (Math.random() - .5) * .1;
        const axis = new THREE.Vector3(
          Math.random() - .5, Math.random() - .5, Math.random() - .5
        ).normalize();
        if (axis.lengthSq() < .01) axis.set(0, 1, 0);
        p.drift = {
          radius: band.radius * (.96 + Math.random() * .08),
          angle,
          squash: band.squash + (Math.random() - .5) * .05,
          z: band.z + (Math.random() - .5) * 18,
          orbitSpeed: band.speed * (.9 + Math.random() * .2),
          ax: 3 + Math.random() * 6,
          ay: 3 + Math.random() * 6,
          az: 4 + Math.random() * 8,
          sx: .12 + Math.random() * .12,
          sy: .1 + Math.random() * .12,
          sz: .12 + Math.random() * .14,
          phase: Math.random() * TAU,
          rotAxis: axis,
          rotSpeed: .1 + Math.random() * .22,
          rotAmp: .035 + Math.random() * .09
        };
        p.fxPulse = 0;
      });
    });
  }

  function enterDrift() {
    if (!state.ready || state.driftActive) return;
    if (!state.axial) setAxialAll();
    restoreSelectedMaterial();
    state.selected = -1;
    state._partFocusSized = -1;
    state.focusLayer = -1;
    state.layerFocusTarget = 0;
    state.driftActive = true;
    state.driftTarget = 1;
    state.driftClock = 0;
    state.mode = 'drift';
    state.axial = true;
    state.autoRotate = false;
    state.assemblyRotTarget = -Math.PI / 2;
    if (state.progressTarget < .99) beginProgress(1, .7);
    prepareDrift();
    if (!state.bgChosen) setBackground('space', true);
    setCameraDrift();
    fx.nextStrike = .35;
    fx.nextBg = .08;
    document.body.classList.add('fx-mode');
    updatePartRows();
    updateInspector(false);
    setTab('part');
    updateLabels(true);
    updateHud();
    updateFxUI();
    sound.zap();
  }

  function exitDrift(silent) {
    if (!state.driftActive) return;
    state.driftActive = false;
    state.driftTarget = 0;
    state.mode = 'axial';
    document.body.classList.remove('fx-mode');
    parts.forEach(p => {
      p.fxPulse = 0;
      p.material.emissive.copy(p.baseEmissive);
      p.material.emissiveIntensity = p.baseEmissiveIntensity;
    });
    fxArcs.forEach(a => { a.life = 0; a.core.visible = false; a.halo.visible = false; });
    fx.flash = 0;
    if (fxFlashEl) fxFlashEl.style.opacity = '0';
    if (!silent) {
      setCameraAxial();
      updatePartRows();
      updateInspector(false);
      updateLabels(true);
      updateHud();
      updateFxUI();
    }
  }

  function toggleDrift() {
    if (state.driftActive) exitDrift(false);
    else enterDrift();
  }

  function updateFxUI() {
    if (!fxDockEl) fxDockEl = $('#fxDock');
    if (!fxDockEl) return;
    const show = state.ready && state.axial && state.progress > .78;
    const key = [state.ready, show, state.driftActive, state.background].join('|');
    if (state._fxUiKey === key) return;
    state._fxUiKey = key;
    fxDockEl.classList.toggle('show', show);
    fxDockEl.setAttribute('aria-hidden', String(!show));
    fxDockEl.classList.toggle('drift', state.driftActive);
    document.body.classList.toggle('is-axial', show);
    document.body.classList.toggle('fx-mode', state.driftActive);
    const dl = $('#driftLabel'), ds = $('#driftSub');
    if (dl) dl.textContent = state.driftActive ? '退出漂移' : '空间漂移';
    if (ds) ds.textContent = state.driftActive ? 'EXIT DRIFT' : 'DRIFT FIELD';
    const bl = $('#bgModeLabel');
    if (bl) bl.textContent = state.background === 'space' ? '深空黑' : '影棚灰';
    const bd = $('#btnDrift');
    if (bd) bd.setAttribute('aria-pressed', String(state.driftActive));
  }

  /* --------------------------------------------------------------------------
     GLTF LOADER / MESH GRAPH
     -------------------------------------------------------------------------- */
  const componentType = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const typeCount = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const buffers = [];
  const gltf = window.C4D_GLTF;

  function decodeDataUri(uri) {
    const comma = uri.indexOf(',');
    const bin = atob(uri.slice(comma + 1));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function prepareBuffers() {
    (gltf.buffers || []).forEach((b, i) => {
      buffers[i] = b.uri && b.uri.indexOf('data:') === 0 ? decodeDataUri(b.uri) : new Uint8Array(0);
    });
  }

  function getAccessor(index) {
    const acc = gltf.accessors[index];
    const bv = gltf.bufferViews[acc.bufferView];
    const buf = buffers[bv.buffer];
    const Ctor = componentType[acc.componentType];
    const n = typeCount[acc.type];
    const bytes = Ctor.BYTES_PER_ELEMENT;
    const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    const stride = bv.byteStride || 0;
    if (!stride || stride === n * bytes) return new Ctor(buf.buffer, buf.byteOffset + offset, acc.count * n);
    const out = new Ctor(acc.count * n);
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    for (let i = 0; i < acc.count; i++) {
      for (let c = 0; c < n; c++) {
        const p = offset + i * stride + c * bytes;
        let v;
        if (Ctor === Float32Array) v = dv.getFloat32(p, true);
        else if (Ctor === Uint32Array) v = dv.getUint32(p, true);
        else if (Ctor === Uint16Array) v = dv.getUint16(p, true);
        else if (Ctor === Int16Array) v = dv.getInt16(p, true);
        else if (Ctor === Uint8Array) v = dv.getUint8(p);
        else v = dv.getInt8(p);
        out[i * n + c] = v;
      }
    }
    return out;
  }

  function meshFromPrimitive(p) {
    const g = new THREE.BufferGeometry();
    const a = p.attributes || {};
    if (a.POSITION !== undefined) g.setAttribute('position', new THREE.BufferAttribute(getAccessor(a.POSITION), 3));
    if (a.NORMAL !== undefined) g.setAttribute('normal', new THREE.BufferAttribute(getAccessor(a.NORMAL), 3));
    if (a.TEXCOORD_0 !== undefined) g.setAttribute('uv', new THREE.BufferAttribute(getAccessor(a.TEXCOORD_0), 2));
    if (p.indices !== undefined) g.setIndex(new THREE.BufferAttribute(getAccessor(p.indices), 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x9aa7b9 }));
  }

  function buildNode(index) {
    const n = gltf.nodes[index];
    const group = new THREE.Group();
    group.name = n.name || 'Node_' + index;
    if (n.matrix) {
      group.matrix.fromArray(n.matrix);
      group.matrix.decompose(group.position, group.quaternion, group.scale);
    } else {
      if (n.translation) group.position.fromArray(n.translation);
      if (n.rotation) group.quaternion.fromArray(n.rotation);
      if (n.scale) group.scale.fromArray(n.scale);
    }
    if (n.mesh !== undefined) {
      const mesh = gltf.meshes[n.mesh];
      (mesh.primitives || []).forEach((p, pi) => {
        const m = meshFromPrimitive(p);
        m.name = (n.name || 'mesh') + (pi ? '_' + pi : '');
        group.add(m);
      });
    }
    (n.children || []).forEach(c => group.add(buildNode(c)));
    return group;
  }

  function isShellPart(index) {
    return SHELL_PARTS.has(index);
  }

  function createPartMaterial(index) {
    const key = PART_MATERIAL[index] || 'stainless';
    const base = MAT_PRESETS[key] || MAT_PRESETS.stainless;
    const isShell = key === 'shellBlack';
    const m = new THREE.MeshPhysicalMaterial({
      color: base.color,
      metalness: base.metalness,
      roughness: base.roughness,
      clearcoat: base.clearcoat || .2,
      clearcoatRoughness: key === 'pcbGreen' ? .4 : .18,
      envMapIntensity: isShell ? .85 : .62
    });
    m.name = 'P' + String(index + 1).padStart(2, '0') + '_' + (isShell ? 'main-shell' : key);
    m.userData.materialKey = key;
    m.userData.isShell = isShell;
    m.userData.finish = 'official';
    return m;
  }

  function buildModel() {
    prepareBuffers();
    assembly = new THREE.Group();
    assembly.name = 'V6_PRO_ASSEMBLY';
    scene.add(assembly);

    const temp = new THREE.Group();
    scene.add(temp);
    const sceneRoots = (gltf.scenes[0].nodes || []).map(i => buildNode(i));
    sceneRoots.forEach(r => temp.add(r));
    temp.updateMatrixWorld(true);
    // The C4D export has one scene root ("v6 pro(1).STEP"); its direct children
    // are the 12 assembly groups used by the teardown UI.
    const motorRoot = sceneRoots.length === 1 ? sceneRoots[0] : null;
    const roots = motorRoot && motorRoot.children.length >= 8 ? motorRoot.children.slice() : sceneRoots;

    parts = [];
    groups = GROUP_DEFS.map((d, i) => ({
      index: i + 1, id: 'G' + String(i + 1).padStart(2, '0'),
      name: d.name, en: d.en, color: d.color, desc: d.desc,
      parts: [], center: new THREE.Vector3(), radius: 10, offset: new THREE.Vector3()
    }));

    let pid = 0;
    roots.forEach((rootGroup, gi) => {
      const group = groups[gi];
      const meshes = [];
      rootGroup.traverse(o => { if (o.isMesh && o.geometry.getAttribute('position')) meshes.push(o); });
      meshes.forEach(mesh => {
        const world = mesh.matrixWorld.clone();
        mesh.removeFromParent();
        assembly.add(mesh);
        world.decompose(mesh.position, mesh.quaternion, mesh.scale);
        const g = groups[gi];
        const mat = createPartMaterial(pid, gi + 1);
        mesh.material = mat;
        mesh.userData.partId = pid;
        mesh.userData.groupId = gi + 1;
        mesh.frustumCulled = false;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.geometry.computeBoundingBox();
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const posAttr = mesh.geometry.getAttribute('position');
        const tris = Math.round((mesh.geometry.index ? mesh.geometry.index.count : posAttr.count) / 3);
        const part = {
          index: pid, id: 'P' + String(pid + 1).padStart(2, '0'),
          name: PART_NAMES[pid], group: gi + 1, groupDef: g,
          uncertain: PART_UNCERTAIN[pid], tris,
          mesh, material: mat,
          home: mesh.position.clone(), homeQuat: mesh.quaternion.clone(), homeScale: mesh.scale.clone(),
          localBox: mesh.geometry.boundingBox.clone(),
          rawBox: box, rawSize: size, centerLocal: center,
          anchor: center.clone(),
          groupOffset: new THREE.Vector3(), partOffset: new THREE.Vector3(),
          animOffset: new THREE.Vector3(), opacity: 1, opacityTarget: 1,
          rotAxis: new THREE.Vector3(Math.sin(pid * 1.73) * .9, .18 + (pid % 4) * .08, Math.cos(pid * 1.13) * .9).normalize(),
          rotAmount: .045 + (pid % 4) * .022,
          baseEmissive: mat.emissive.clone(), baseEmissiveIntensity: mat.emissiveIntensity
        };
        parts.push(part);
        group.parts.push(part);
        pid++;
      });
    });
    temp.removeFromParent();

    // remove the empty node wrappers, then normalize
    const rawBox = new THREE.Box3();
    parts.forEach(p => rawBox.union(p.rawBox));
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const rawCenter = rawBox.getCenter(new THREE.Vector3());
    const targetHeight = 110;
    const scale = targetHeight / Math.max(1, rawSize.y);
    assembly.scale.setScalar(scale);
    assembly.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(assembly);
    const sc = scaledBox.getCenter(new THREE.Vector3());
    assembly.position.sub(sc);
    assembly.updateMatrixWorld(true);

    // The video's teardown is axial. Assign the 37 meshes to eight service
    // layers, measure every layer along the motor axis, and lay the stations
    // out with equal clearance. Stations are in assembly-local units.
    AXIAL_LAYERS.forEach((def, li) => {
      def.index = li;
      def.partObjs = def.parts.map(n => parts[n - 1]).filter(Boolean);
      let min = Infinity, max = -Infinity;
      def.partObjs.forEach(p => {
        p.mesh.updateWorldMatrix(true, false);
        const b = new THREE.Box3().setFromObject(p.mesh);
        const c = assembly.worldToLocal(b.getCenter(new THREE.Vector3()));
        const half = (b.max.y - b.min.y) / (2 * assembly.scale.y);
        p.layerIndex = li;
        p.layerDef = def;
        p.axisCenterY = c.y;
        p.axisHalf = half;
        min = Math.min(min, c.y - half);
        max = Math.max(max, c.y + half);
      });
      def.min = min;
      def.max = max;
      def.centerY = (min + max) / 2;
      def.half = Math.max(2, (max - min) / 2);
      def.partObjs.sort((a, b) => a.axisCenterY - b.axisCenterY)
        .forEach((p, k) => { p.layerOrder = k; });
      def.bounds = new THREE.Box3();
      def.partObjs.forEach(p => def.bounds.expandByObject(p.mesh));
    });
    let cursor = 0;
    AXIAL_LAYERS.forEach(def => {
      def.station = cursor + def.half;
      cursor = def.station + def.half + LAYER_GAP;
    });
    const axialSpan = cursor - LAYER_GAP;
    AXIAL_LAYERS.forEach(def => {
      def.station -= axialSpan / 2;
      def.shift = def.station - def.centerY;
      const maxPartLength = def.partObjs.reduce((m, p) => Math.max(m, p.axisHalf * 2), 8);
      def.focusGap = clamp(maxPartLength * .94, 18, 62);
    });
    state.layers = AXIAL_LAYERS;
    state.axialSpan = axialSpan;
    state.shellOverlays = [];

    // X-ray edges on the outer shell layers.
    [5, 23].forEach(idx => {
      const p = parts[idx];
      if (!p) return;
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(p.mesh.geometry, 28),
        new THREE.LineBasicMaterial({ color: 0xC9C5C6, transparent: true, opacity: .28, depthWrite: false, depthTest: false })
      );
      edges.visible = false;
      edges.renderOrder = 999;
      p.mesh.add(edges);
      p.xrayOverlay = edges;
      state.shellOverlays.push(edges);
    });

    // The official video exposes a red inner sleeve through the black shell
    // cut-outs. A back-side copy gives us the same read without extra parts.
    const shellPart = parts[5];
    const redLiner = new THREE.Mesh(
      shellPart.mesh.geometry,
      new THREE.MeshPhysicalMaterial({
        color: 0x981B2B, metalness: .55, roughness: .34,
        clearcoat: .35, clearcoatRoughness: .25,
        side: THREE.BackSide
      })
    );
    redLiner.scale.setScalar(.982);
    redLiner.renderOrder = 1;
    redLiner.castShadow = false;
    redLiner.receiveShadow = false;
    shellPart.mesh.add(redLiner);
    shellPart.redLiner = redLiner;

    // White one-sided Solink nameplate on the stator can. Keeping the plane
    // single-sided prevents the backwards logo seen in the reference video.
    const plateTexture = makeCanvasTexture(512, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0B0C0D';
      ctx.fillRect(6, 6, w - 12, h - 12);
      ctx.strokeStyle = '#F7F5F5'; ctx.lineWidth = 5; ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.strokeStyle = '#DB242A'; ctx.lineWidth = 2; ctx.strokeRect(20, 20, w - 40, h - 40);
      ctx.fillStyle = '#F7F5F5';
      ctx.beginPath();
      ctx.moveTo(60, 60); ctx.lineTo(34, 100); ctx.lineTo(56, 100); ctx.lineTo(44, 144);
      ctx.lineTo(84, 98); ctx.lineTo(62, 98); ctx.lineTo(78, 60); ctx.closePath(); ctx.fill();
      ctx.font = '700 58px "Arial Narrow", "Bahnschrift", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('SOLINK', 112, 104);
      ctx.font = '700 46px "Arial Narrow", "Bahnschrift", sans-serif';
      ctx.fillText('MOTOR', 116, 164);
    }, true);
    const nameplate = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 6.5),
      new THREE.MeshBasicMaterial({ map: plateTexture, transparent: true, depthWrite: false, side: THREE.FrontSide })
    );
    nameplate.renderOrder = 6;
    scene.add(nameplate);
    state.nameplate = nameplate;
    state.nameplatePart = parts[23];

    state.shellMaterial = parts[5].material;
    state.model = {
      rawSize, rawCenter, scale, finalBox: new THREE.Box3().setFromObject(assembly),
      totalTris: parts.reduce((n, p) => n + p.tris, 0)
    };
    state.baseRadius = computeBaseRadius();
    state.radius = state.baseRadius;
    state.radiusTarget = state.baseRadius;
    state.target.set(0, 0, 0);
    state.targetTarget.set(0, 0, 0);
  }

  /* --------------------------------------------------------------------------
     SELECTION / MATERIALS
     -------------------------------------------------------------------------- */
  function restoreSelectedMaterial() {
    parts.forEach(p => {
      p.material.emissive.copy(p.baseEmissive);
      p.material.emissiveIntensity = p.baseEmissiveIntensity;
      if (p.outline) p.outline.visible = false;
    });
  }

  function applySelectedMaterial(part) {
    if (!part) return;
    part.material.emissive.setHex(0x981B2B);
    part.material.emissiveIntensity = 0;
    if (!part.outline) {
      const edgeMat = new THREE.MeshBasicMaterial({
        color: 0xF7F5F5, side: THREE.BackSide, transparent: true, opacity: .42,
        depthTest: true, depthWrite: false
      });
      const outline = new THREE.Mesh(part.mesh.geometry, edgeMat);
      outline.scale.setScalar(1.016);
      outline.renderOrder = 998;
      part.mesh.add(outline);
      part.outline = outline;
    }
    part.outline.visible = true;
  }

  function selectPart(index, opts) {
    opts = opts || {};
    if (index < 0 || index >= parts.length) return;
    if (state.driftActive) exitDrift(true);
    const prev = state.selected;
    restoreSelectedMaterial();
    state.selected = index;
    state._partFocusSized = -1;
    const part = parts[index];
    state.axial = true;
    state.mode = 'axial';
    state.focusLayer = part.layerIndex;
    state.layerFocusTarget = 1;
    state.autoRotate = false;
    if (state.progressTarget < .99) beginProgress(1, .92);
    state.assemblyRotTarget = -Math.PI / 2;
    applySelectedMaterial(part);
    setCameraPart(part);
    updatePartRows();
    updateInspector(true);
    setTab('part');
    updateLabels(true);
    sound.click();
    document.body.classList.add('interacted');
    if (prev !== index) {
      const row = $('.layer-part[data-index="' + index + '"]');
      if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    if (isMobile() && opts.openPanel !== false) {
      closePanel('left');
      openPanel('right');
    }
    updateHud();
  }

  function deselect() {
    if (state.selected < 0) {
      if (state.axial) setAssembledMode();
      return;
    }
    restoreSelectedMaterial();
    state.selected = -1;
    state._partFocusSized = -1;
    if (state.axial) {
      state.focusLayer = -1;
      state.layerFocusTarget = 0;
      setCameraAxial();
    } else {
      resetView();
    }
    updatePartRows();
    updateInspector(false);
    updateLabels(true);
    updateHud();
  }

  function syncVisibility() {
    parts.forEach(p => { p.mesh.visible = true; });
  }

  /* --------------------------------------------------------------------------
     EXPLOSION TRANSFORMS
     -------------------------------------------------------------------------- */
  function beginProgress(target, duration) {
    target = clamp(target, 0, 1);
    if (Math.abs(target - state.progressTarget) < .0005) return;
    state.progressFrom = state.progress;
    state.progressTarget = target;
    state.progressStart = performance.now();
    state.progressDuration = duration || clamp(Math.abs(target - state.progress) * 1.1, .28, .9);
  }

  function updatePartTransforms(dt) {
    const elapsed = (performance.now() - state.progressStart) / (state.progressDuration * 1000);
    if (elapsed >= 1) {
      state.progress = state.progressTarget;
    } else {
      state.progress = lerp(state.progressFrom, state.progressTarget, smooth(clamp(elapsed, 0, 1)));
    }
    const p = state.progress;
    state.layerFocus = damp(state.layerFocus, state.layerFocusTarget, 4.2, dt);
    if (Math.abs(state.layerFocus - state.layerFocusTarget) < .001) state.layerFocus = state.layerFocusTarget;
    state.driftBlend = damp(state.driftBlend, state.driftTarget, state.driftActive ? 2.7 : 6.2, dt);
    if (Math.abs(state.driftBlend - state.driftTarget) < .001) state.driftBlend = state.driftTarget;
    if (state.driftActive) state.driftClock += dt;
    state.assemblyRot = damp(state.assemblyRot, state.assemblyRotTarget, 4.6, dt);
    assembly.rotation.z = state.assemblyRot;

    parts.forEach(part => {
      let targetOffsetX = 0;
      let targetOffsetY = 0;
      let targetOffsetZ = 0;
      if (state.axial) {
        const layer = part.layerDef;
        const baseOffset = layer.shift * p;
        targetOffsetY = baseOffset;
        if (state.focusLayer === part.layerIndex && state.layerFocus > .001) {
          const n = layer.partObjs.length;
          let focusAxis = layer.station + (part.layerOrder - (n - 1) / 2) * layer.focusGap;
          if (part.index === state.selected) focusAxis += 5;
          targetOffsetY = lerp(baseOffset, focusAxis - part.axisCenterY, state.layerFocus);
        }
      }
      if ((state.driftActive || state.driftBlend > .001) && part.drift) {
        const d = part.drift, t = state.driftClock, db = state.driftBlend;
        const ang = d.angle + t * d.orbitSpeed;
        const breathing = Math.sin(t * d.sx + d.phase);
        const dx = Math.cos(ang) * d.radius + breathing * d.ax;
        const dy = Math.sin(ang) * d.radius * d.squash + Math.cos(t * d.sy + d.phase * 1.31) * d.ay;
        const dz = d.z + Math.sin(t * d.sz + d.phase * .73) * d.az;
        targetOffsetX = lerp(0, dx, db);
        targetOffsetY = lerp(targetOffsetY, dy, db);
        targetOffsetZ = lerp(0, dz, db);
      }
      const posK = state.driftActive ? 3.1 : 6.0;
      part.animOffset.x = damp(part.animOffset.x, targetOffsetX, posK, dt);
      part.animOffset.y = damp(part.animOffset.y, targetOffsetY, state.driftActive ? 2.5 : 5.4, dt);
      part.animOffset.z = damp(part.animOffset.z, targetOffsetZ, posK, dt);
      part.mesh.position.set(
        part.home.x + part.animOffset.x,
        part.home.y + part.animOffset.y,
        part.home.z + part.animOffset.z
      );
      part.mesh.quaternion.copy(part.homeQuat);
      if (state.driftBlend > .001 && part.drift) {
        const d = part.drift, t = state.driftClock;
        tmpQ.setFromAxisAngle(
          d.rotAxis,
          Math.sin(t * d.rotSpeed + d.phase) * d.rotAmp * state.driftBlend
        );
        part.mesh.quaternion.multiply(tmpQ);
      }
      if (part.fxPulse > 0) part.fxPulse = Math.max(0, part.fxPulse - dt * 2.9);
      if (state.driftActive || state.driftBlend > .01) {
        if (part.fxPulse > 0) {
          part.material.emissive.setHex(0xDB242A);
          part.material.emissiveIntensity = part.fxPulse * 1.9;
        } else {
          part.material.emissive.copy(part.baseEmissive);
          part.material.emissiveIntensity = part.baseEmissiveIntensity;
        }
      }

      let opTarget = 1;
      if (state.shellTransparent && isShellPart(part.index)) {
        opTarget = part.index === 5 ? .06 : .1;
      }
      part.opacity = damp(part.opacity, opTarget, 5.5, dt);
      const op = part.opacity;
      part.material.transparent = op < .995;
      part.material.opacity = op;
      part.material.depthWrite = op > .55;
      const hiddenLayer = state.focusLayer >= 0 && part.layerIndex !== state.focusLayer;
      const hiddenSibling = state.selected >= 0 && part.layerIndex === state.focusLayer && part.index !== state.selected;
      part.mesh.visible = !hiddenLayer && !hiddenSibling;
      part.mesh.castShadow = op > .45;
      part.mesh.receiveShadow = op > .45;
      if (part.xrayOverlay) part.xrayOverlay.visible = state.shellTransparent;
      if (part.redLiner) part.redLiner.visible = !state.shellTransparent;
    });
    if (state.floorShadow) state.floorShadow.visible = !state.driftActive && state.driftBlend < .18;
    if (state.nameplate && state.nameplatePart) {
      const np = state.nameplatePart;
      np.mesh.updateWorldMatrix(true, false);
      const nb = new THREE.Box3().setFromObject(np.mesh);
      if (!nb.isEmpty()) {
        state.nameplate.position.copy(nb.getCenter(new THREE.Vector3()));
        state.nameplate.position.z += 17.6;
      }
      state.nameplate.visible = state.entered && !state.driftActive &&
        !(state.focusLayer >= 0 && state.focusLayer !== np.layerIndex) &&
        !(state.selected >= 0 && state.selected !== np.index);
    }
    state.assembly = assembly;
  }

  /* --------------------------------------------------------------------------
     CAMERA / ORBIT
     -------------------------------------------------------------------------- */
  function computeBaseRadius() {
    const w = innerWidth, h = innerHeight;
    if (w < 700) return 320;
    if (w < 1180) return 285;
    const safeH = Math.max(400, h - 228);
    return clamp(233 * h / safeH, 220, 285);
  }

  function stageFraction() {
    if (innerWidth < 1180) return .92;
    const lw = $('#leftPanel') ? $('#leftPanel').getBoundingClientRect().width : 286;
    const rw = $('#rightPanel') ? $('#rightPanel').getBoundingClientRect().width : 354;
    return clamp((innerWidth - lw - rw - 86) / innerWidth, .34, .8);
  }

  function axialWorldSpan() {
    return Math.max(1, state.axialSpan * (state.model ? state.model.scale : 1));
  }

  function computeAxialRadius() {
    const fov = THREE.MathUtils.degToRad(camera.fov / 2);
    const denom = 2 * Math.tan(fov) * camera.aspect * stageFraction();
    return clamp(axialWorldSpan() / denom * 1.06, 250, 1600);
  }

  function computeLayerRadius(layer) {
    const n = layer.partObjs.length;
    const rawSpan = (n - 1) * layer.focusGap + Math.max(20, layer.max - layer.min);
    const world = rawSpan * state.model.scale;
    const fov = THREE.MathUtils.degToRad(camera.fov / 2);
    const denom = 2 * Math.tan(fov) * camera.aspect * stageFraction();
    return clamp(world / denom * 1.38, 120, 760);
  }

  function setCameraHero() {
    state.thetaTarget = .62;
    state.phiTarget = 1.17;
    state.radiusTarget = state.baseRadius;
    state.targetTarget.set(0, 0, 0);
  }

  function setCameraAxial() {
    state.thetaTarget = .02;
    state.phiTarget = 1.47;
    state.radiusTarget = computeAxialRadius();
    state.targetTarget.set(0, assembly.position.y, 0);
  }

  function setCameraLayer(layer) {
    state.thetaTarget = .03;
    state.phiTarget = 1.47;
    state.radiusTarget = computeLayerRadius(layer);
    state.targetTarget.set(layer.station * state.model.scale, assembly.position.y, 0);
  }

  function computeDriftRadius() {
    const fov = THREE.MathUtils.degToRad(camera.fov / 2);
    const sf = stageFraction();
    const scale = state.model ? state.model.scale : 1;
    const worldW = 2 * 235 * scale;
    const worldH = 2 * 72 * scale;
    const denomW = 2 * Math.tan(fov) * camera.aspect * sf;
    const denomH = 2 * Math.tan(fov) * sf;
    const margin = innerWidth > 1180 ? 1.95 : (innerWidth <= 560 ? 1.18 : 1.48);
    return clamp(Math.max(worldW / denomW, worldH / denomH) * margin, 280, 1900);
  }

  function setCameraDrift() {
    state.thetaTarget = .3;
    state.phiTarget = 1.3;
    state.radiusTarget = computeDriftRadius();
    state.targetTarget.set(0, assembly.position.y, 0);
  }

  function setCameraPart(part) {
    const layer = part.layerDef;
    const n = layer.partObjs.length;
    const focusY = layer.station + (part.layerOrder - (n - 1) / 2) * layer.focusGap + 5;
    state.thetaTarget = .05;
    state.phiTarget = 1.46;
    state.targetTarget.set(focusY * state.model.scale, 0, 0);
    state.radiusTarget = clamp(Math.max(part.rawSize.length() * state.model.scale * 2.2, 80), 80, 270);
  }

  function updateCamera(dt) {
    if (state.autoRotate && !state.introActive && !state.dragging && !state.axial && state.progress < .03) {
      state.thetaTarget += dt * .075;
    }
    if (state.driftActive && !state.dragging) state.thetaTarget += dt * .038;
    if (state.selected >= 0) {
      const p = parts[state.selected];
      p.mesh.updateWorldMatrix(true, false);
      const box = new THREE.Box3().setFromObject(p.mesh);
      if (!box.isEmpty()) {
        state.targetTarget.copy(box.getCenter(new THREE.Vector3()));
        if (state._partFocusSized !== state.selected) {
          const s = box.getSize(new THREE.Vector3());
          state.radiusTarget = clamp(Math.max(s.x, s.y, s.z) * 4.0, 100, 320);
          state._partFocusSized = state.selected;
        }
      }
    }
    state.theta = damp(state.theta, state.thetaTarget, 7, dt);
    state.phi = damp(state.phi, state.phiTarget, 7, dt);
    state.radius = damp(state.radius, state.radiusTarget, 4.8, dt);
    state.target.x = damp(state.target.x, state.targetTarget.x, 5, dt);
    state.target.y = damp(state.target.y, state.targetTarget.y, 5, dt);
    state.target.z = damp(state.target.z, state.targetTarget.z, 5, dt);

    const sp = Math.sin(state.phi);
    camera.position.set(
      state.target.x + state.radius * sp * Math.sin(state.theta),
      state.target.y + state.radius * Math.cos(state.phi),
      state.target.z + state.radius * sp * Math.cos(state.theta)
    );
    camera.lookAt(state.target);
  }

  function resetView() {
    state.thetaTarget = .62;
    state.phiTarget = 1.17;
    state.radiusTarget = state.baseRadius;
    state.targetTarget.set(0, 0, 0);
  }

  function playIntroCamera() {
    if (!state.baseRadius) return;
    state.introActive = true;
    state.theta = .94;
    state.phi = 1.02;
    state.radius = state.baseRadius * 1.16;
    state.thetaTarget = .62;
    state.phiTarget = 1.17;
    state.radiusTarget = state.baseRadius;
    state.targetTarget.set(0, 0, 0);
    clearTimeout(state._introTimer);
    state._introTimer = setTimeout(() => {
      state.introActive = false;
      state.lastFrame = performance.now();
    }, 1750);
  }

  function enterExperience() {
    if (state.entered) return;
    state.entered = true;
    sound.init();
    sound.setEnabled(!!state.launch.sound);
    state.autoRotate = !!state.launch.auto;
    state.particlesOn = !!state.launch.particles;
    if (particleField) particleField.visible = state.particlesOn;
    if (bokehField) bokehField.visible = state.particlesOn;
    if (goldField) goldField.visible = state.particlesOn;
    updateSoundUI();
    if (state.launch.intro) playIntroCamera();
    else {
      state.introActive = false;
      setCameraHero();
    }
    const btn = $('#enterBtn');
    if (btn) { btn.disabled = true; $('#enterText').textContent = '进入中'; }
    document.body.classList.add('loaded');
    $('#loader').classList.add('done');
    requestAnimationFrame(() => {
      updateScrollHint();
      updateHud();
      updateLayerTags(true);
    });
  }

  function bindLaunchOptions() {
    $$('.launch-opt').forEach(btn => {
      const key = btn.dataset.opt;
      btn.classList.toggle('is-on', !!state.launch[key]);
      btn.addEventListener('click', () => {
        state.launch[key] = !state.launch[key];
        btn.classList.toggle('is-on', state.launch[key]);
        sound.init();
        sound.ui();
      });
    });
    const enter = $('#enterBtn');
    if (enter) enter.addEventListener('click', enterExperience);
  }

  function focusPart(index) {
    if (state.selected === index) {
      const p = parts[index];
      if (p) setCameraPart(p);
      return;
    }
    selectPart(index);
  }

  function adjustZoom(f) {
    state.radiusTarget = clamp(state.radiusTarget * f, 55, 1100);
  }

  function pan(dx, dy) {
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const k = .0011 * state.radius;
    state.targetTarget.addScaledVector(right, -dx * k);
    state.targetTarget.addScaledVector(up, dy * k);
    state.targetTarget.x = clamp(state.targetTarget.x, -420, 420);
    state.targetTarget.y = clamp(state.targetTarget.y, -220, 220);
    state.targetTarget.z = clamp(state.targetTarget.z, -320, 320);
  }

  /* --------------------------------------------------------------------------
     AXIAL MODES
     -------------------------------------------------------------------------- */
  function setAxialAll() {
    if (state.driftActive) exitDrift(true);
    restoreSelectedMaterial();
    state.selected = -1;
    state._partFocusSized = -1;
    state.axial = true;
    state.mode = 'axial';
    state.focusLayer = -1;
    state.layerFocusTarget = 0;
    state.autoRotate = false;
    state.assemblyRotTarget = -Math.PI / 2;
    beginProgress(1, 1.12);
    setCameraAxial();
    updatePartRows();
    updateInspector(false);
    updateLabels(true);
    updateHud();
    sound.explode();
    document.body.classList.add('interacted');
  }

  function setAssembledMode() {
    if (state.driftActive) exitDrift(true);
    restoreSelectedMaterial();
    state.selected = -1;
    state._partFocusSized = -1;
    state.axial = false;
    state.mode = 'assembled';
    state.focusLayer = -1;
    state.layerFocusTarget = 0;
    state.assemblyRotTarget = 0;
    state.autoRotate = !!state.launch.auto;
    beginProgress(0, .95);
    setCameraHero();
    updatePartRows();
    updateInspector(false);
    updateLabels(true);
    updateHud();
    sound.assemble();
    document.body.classList.add('interacted');
  }

  function toggleAxial() {
    if (state.axial && state.progressTarget > .5) setAssembledMode();
    else setAxialAll();
  }

  function focusLayer(index) {
    if (index < 0 || index >= AXIAL_LAYERS.length) return;
    if (state.driftActive) exitDrift(true);
    restoreSelectedMaterial();
    state.selected = -1;
    state._partFocusSized = -1;
    state.axial = true;
    state.mode = 'axial';
    state.focusLayer = index;
    state.layerFocusTarget = 1;
    state.autoRotate = false;
    state.assemblyRotTarget = -Math.PI / 2;
    if (state.progressTarget < .99) beginProgress(1, 1.0);
    setCameraLayer(AXIAL_LAYERS[index]);
    updatePartRows();
    updateInspector(false);
    setTab('part');
    if (isMobile()) {
      closePanel('left');
      openPanel('right');
    }
    updateLabels(true);
    updateHud();
    sound.ui();
    document.body.classList.add('interacted');
  }

  function stepLayer(dir) {
    let next;
    if (state.focusLayer < 0) next = dir > 0 ? 0 : AXIAL_LAYERS.length - 1;
    else next = (state.focusLayer + dir + AXIAL_LAYERS.length) % AXIAL_LAYERS.length;
    focusLayer(next);
  }

  function toggleLabels() {
    state.showAllLabels = !state.showAllLabels;
    const b = $('#btnLabels');
    if (b) b.classList.toggle('on', state.showAllLabels);
    sound.ui();
    updateLabels(true);
    updateLayerTags(true);
  }

  /* --------------------------------------------------------------------------
     DOM / PART LIST
     -------------------------------------------------------------------------- */
  function buildPartList() {
    partListEl = $('#layerList');
    let html = '';
    AXIAL_LAYERS.forEach((layer, li) => {
      html += '<div class="layer-block" data-layer="' + li + '">' +
        '<button class="layer-head" data-layer="' + li + '" type="button">' +
        '<span class="layer-no">L' + (li + 1) + '</span>' +
        '<span class="layer-copy"><b>' + layer.name + '</b><em>' + layer.en + '</em></span>' +
        '<span class="layer-count">' + String(layer.partObjs.length).padStart(2, '0') + ' P</span>' +
        '</button><div class="layer-parts">';
      layer.partObjs.forEach(p => {
        html += '<button class="layer-part" data-index="' + p.index + '" type="button">' +
          '<span class="lp-id">' + p.id + '</span>' +
          '<span class="lp-copy"><b>' + p.name + '</b><em>' + fmt(p.tris) + ' TRIS · ' + (p.rawSize.y * state.model.scale).toFixed(1) + '</em></span>' +
          '<span class="lp-dot"></span></button>';
      });
      html += '</div></div>';
    });
    partListEl.innerHTML = html;

    partListEl.addEventListener('click', e => {
      const row = e.target.closest('.layer-part');
      if (row) {
        selectPart(Number(row.dataset.index), { openPanel: true });
        return;
      }
      const head = e.target.closest('.layer-head');
      if (head) focusLayer(Number(head.dataset.layer));
    });
    partListEl.addEventListener('pointerover', e => {
      const row = e.target.closest('.layer-part');
      if (row) setHovered(Number(row.dataset.index));
    });
    partListEl.addEventListener('pointerleave', () => setHovered(-1));
  }

  function updatePartRows() {
    $$('.layer-block').forEach(block => {
      const li = Number(block.dataset.layer);
      const active = li === state.focusLayer;
      block.classList.toggle('active', active);
      const head = block.querySelector('.layer-head');
      if (head) head.classList.toggle('active', active);
      block.querySelectorAll('.layer-part').forEach(row => {
        row.classList.toggle('active', Number(row.dataset.index) === state.selected);
      });
    });
    const lb = $('#leftLayer');
    if (lb) lb.textContent = state.focusLayer >= 0 ? 'L' + (state.focusLayer + 1) + ' / 8' : 'L— / 8';
  }

  /* --------------------------------------------------------------------------
     INSPECTOR
     -------------------------------------------------------------------------- */
  function renderModelOverview() {
    const pane = $('#paneMotor');
    const info = state.model;
    const size = info ? info.rawSize : new THREE.Vector3();
    const lRows = AXIAL_LAYERS.map(l =>
      '<div class="group-table-row"><b>' + l.id + '</b><span>' + l.name + '</span><em>' + String(l.partObjs.length).padStart(2, '0') + ' P</em></div>'
    ).join('');
    pane.innerHTML =
      '<div class="model-hero"><div class="eyebrow">SOLINK VIDEO REFERENCE / AXIAL SERVICE</div>' +
      '<h2>V6 PRO</h2><div class="sub">8 AXIAL LAYERS · 37 PARTS · 03OK.c4d</div>' +
      '<p>参考官方产品片的拆解方向重排：产品沿电机轴分层，从后盖、压圈、定子、PCB、转子、外转子壳、前端盖到输出齿轮，正好 8 个轴向层。</p></div>' +
      '<div class="stat-grid">' +
      '<div class="stat-box"><span>PARTS</span><b>37</b></div>' +
      '<div class="stat-box"><span>TRIANGLES</span><b>60 210</b></div>' +
      '<div class="stat-box"><span>AXIAL LAYERS</span><b>8</b></div>' +
      '<div class="stat-box"><span>MODEL BOX</span><b>' + size.x.toFixed(1) + ' × ' + size.y.toFixed(1) + ' × ' + size.z.toFixed(1) + ' <small>u</small></b></div>' +
      '</div>' +
      '<div class="section-label">AXIAL STACK / 轴向层级</div>' +
      '<div class="group-table">' + lRows + '</div>' +
      '<div class="section-label">SOURCE NOTE / 说明</div>' +
      '<div class="model-note"><b>视觉基准</b>：官方 Solink 产品片。黑 / 红 / 银 / 白为主色，绿色 PCB 与金色端子只用于真实材质，不再提供多色调色盘。<br><b>拆解</b>：8 层轴向服务顺序，层内再展开。C4D 原始 12 个总成名称仅作为几何来源记录。<br><b>参数</b>：V6 Pro 的电气/性能参数尚未提供，本页只展示几何、装配与轴向层级数据。</div>';
    requestAnimationFrame(updateScrollHint);
  }

  function updateInspector(forcePart) {
    const selected = state.selected >= 0 ? parts[state.selected] : null;
    const pane = $('#panePart');
    if (state.driftActive) {
      pane.innerHTML =
        '<div class="model-hero"><div class="eyebrow">SPACE FX / LIVE STORM</div>' +
        '<h2>空间漂移</h2><div class="sub">RANDOM DRIFT · ARC LIGHTNING · DUST</div>' +
        '<p>37 个零件离开轴向层，在空间中缓慢漂移。电弧每半秒左右随机穿过零件，点亮其中三个；背景、粒子与红色电弧共同构成风暴场。</p></div>' +
        '<div class="stat-grid">' +
        '<div class="stat-box"><span>PARTS</span><b>37</b></div>' +
        '<div class="stat-box"><span>MODE</span><b>DRIFT</b></div>' +
        '<div class="stat-box"><span>ARC</span><b>RANDOM</b></div>' +
        '<div class="stat-box"><span>ATMOSPHERE</span><b>STORM</b></div>' +
        '</div>' +
        '<div class="section-label">STORM CONTROL / 风暴控制</div>' +
        '<div class="fact-list storm-facts">' +
        '<li><b>漂移</b>：每个零件有独立浮动相位与缓慢自转，退出后回到轴向位置。</li>' +
        '<li><b>电弧</b>：背景闪电持续跳动，前景电弧在零件之间随机穿梭并短时点亮零件。</li>' +
        '<li><b>背景</b>：影棚灰与深空黑可随时切换；粒子与电弧在两种背景中都保留。</li>' +
        '</div>' +
        '<div class="detail-actions">' +
        '<button class="solid-btn" id="driftExitBtn" type="button">退出漂移</button>' +
        '<button class="line-btn" id="driftBgBtn" type="button">切换背景</button>' +
        '</div>';
      const eb = $('#driftExitBtn');
      if (eb) eb.addEventListener('click', () => exitDrift(false));
      const bb = $('#driftBgBtn');
      if (bb) bb.addEventListener('click', toggleBackground);
      setTab('part');
      requestAnimationFrame(updateScrollHint);
      return;
    }
    if (selected) {
      const layer = selected.layerDef;
      const g = selected.groupDef;
      const desc = PART_DESC[selected.index + 1] ||
        ('该零件位于轴向层 ' + layer.id + '，是 C4D 网格中的独立几何体。当前名称根据形状与装配位置推断' +
          (selected.uncertain ? '，仍需确认' : '') + '。');
      pane.innerHTML =
        '<div class="detail-top"><span class="detail-index">' + selected.id + ' / 37</span>' +
        '<span class="detail-cat">' + layer.id + ' · ' + layer.name + '</span></div>' +
        '<h2 class="detail-title">' + selected.name + '</h2>' +
        '<div class="detail-en">' + layer.en + ' / AXIAL SERVICE PART</div>' +
        '<div class="tag-row"><span class="tag hot">' + layer.id + '</span>' +
        '<span class="tag">' + fmt(selected.tris) + ' TRIS</span>' +
        '<span class="tag' + (selected.uncertain ? ' orange' : '') + '">' + (selected.uncertain ? 'INFERRED' : 'MESH PART') + '</span></div>' +
        '<p class="detail-desc">' + desc + '</p>' +
        '<div class="section-label">AXIAL DATA / 轴向数据</div>' +
        '<div class="spec-table">' +
        '<div class="spec-row"><dt>所属层</dt><dd>' + layer.id + ' · ' + layer.name + '</dd></div>' +
        '<div class="spec-row"><dt>层内顺序</dt><dd>' + (selected.layerOrder + 1) + ' / ' + layer.partObjs.length + '</dd></div>' +
        '<div class="spec-row"><dt>三角面</dt><dd>' + fmt(selected.tris) + '</dd></div>' +
        '<div class="spec-row"><dt>模型尺寸</dt><dd>' + selected.rawSize.x.toFixed(1) + ' × ' + selected.rawSize.y.toFixed(1) + ' × ' + selected.rawSize.z.toFixed(1) + ' u</dd></div>' +
        '<div class="spec-row"><dt>材质</dt><dd>' + (MATERIAL_LABELS[selected.material.userData.materialKey] || 'C4D PBR') + '</dd></div>' +
        '<div class="spec-row"><dt>C4D 总成</dt><dd>' + g.id + ' · ' + g.name + '</dd></div>' +
        '</div>' +
        '<div class="section-label">ASSEMBLY NOTE / 装配说明</div>' +
        '<ul class="fact-list">' +
        '<li>' + layer.desc + '</li>' +
        '<li>沿电机轴看，层内顺序为第 ' + (selected.layerOrder + 1) + ' 件；左侧层列表可回到整层。</li>' +
        '<li>颜色与材质按官方产品片重映射：黑色阳极氧化、红色内衬、银色轴系、绿色 PCB、金色端子。</li>' +
        '</ul>' +
        '<div class="detail-actions">' +
        '<button class="solid-btn" id="focusLayerBtn" type="button"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>回到整层</button>' +
        '<button class="line-btn" id="assembleBtn" type="button"><svg viewBox="0 0 24 24"><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/></svg>复位装配</button>' +
        '</div>';
      const lb = $('#focusLayerBtn');
      if (lb) lb.addEventListener('click', () => { focusLayer(layer.index); sound.click(); });
      const ab = $('#assembleBtn');
      if (ab) ab.addEventListener('click', () => { setAssembledMode(); });
      if (forcePart !== false) setTab('part');
    } else if (state.focusLayer >= 0) {
      const layer = AXIAL_LAYERS[state.focusLayer];
      const totalTris = layer.partObjs.reduce((n, p) => n + p.tris, 0);
      const rows = layer.partObjs.map(p =>
        '<button class="group-table-row layer-mini" data-index="' + p.index + '" type="button"><b>' + p.id + '</b><span>' + p.name + '</span><em>' + fmt(p.tris) + ' T</em></button>'
      ).join('');
      pane.innerHTML =
        '<div class="model-hero"><div class="eyebrow">AXIAL LAYER / ' + layer.id + '</div>' +
        '<h2>' + layer.name + '</h2><div class="sub">' + layer.en + ' · ' + layer.partObjs.length + ' PARTS</div>' +
        '<p>' + layer.desc + '</p></div>' +
        '<div class="stat-grid"><div class="stat-box"><span>PARTS</span><b>' + layer.partObjs.length + '</b></div>' +
        '<div class="stat-box"><span>TRIANGLES</span><b>' + fmt(totalTris) + '</b></div>' +
        '<div class="stat-box"><span>LAYER</span><b>' + layer.id + ' / 8</b></div>' +
        '<div class="stat-box"><span>STATION</span><b>' + (layer.station * state.model.scale).toFixed(1) + ' <small>u</small></b></div></div>' +
        '<div class="section-label">PARTS IN THIS LAYER / 层内零件</div>' +
        '<div class="group-table">' + rows + '</div>' +
        '<div class="detail-actions"><button class="solid-btn" id="axialAllBtn" type="button">返回整机轴向</button>' +
        '<button class="line-btn" id="assembleBtn" type="button">反向装配</button></div>';
      pane.querySelectorAll('.layer-mini').forEach(b => b.addEventListener('click', () => {
        selectPart(Number(b.dataset.index), { openPanel: true });
      }));
      const ab = $('#assembleBtn');
      if (ab) ab.addEventListener('click', () => setAssembledMode());
      const xb = $('#axialAllBtn');
      if (xb) xb.addEventListener('click', () => setAxialAll());
      if (forcePart === true) setTab('part');
    } else if (state.axial) {
      const rows = AXIAL_LAYERS.map((l, i) =>
        '<button class="group-table-row layer-mini" data-layer="' + i + '" type="button"><b>' + l.id + '</b><span>' + l.name + '</span><em>' + String(l.partObjs.length).padStart(2, '0') + ' P</em></button>'
      ).join('');
      pane.innerHTML =
        '<div class="model-hero"><div class="eyebrow">AXIAL SERVICE / 8 STATIONS</div>' +
        '<h2>轴向总览</h2><div class="sub">REAR COVER → OUTPUT PINION</div>' +
        '<p>整机已经沿电机轴展开为 8 个服务站。选一层查看层内零件，或直接点选 3D 中的单个零件。</p></div>' +
        '<div class="stat-grid"><div class="stat-box"><span>LAYERS</span><b>8</b></div>' +
        '<div class="stat-box"><span>PARTS</span><b>37</b></div>' +
        '<div class="stat-box"><span>TRIANGLES</span><b>60 210</b></div>' +
        '<div class="stat-box"><span>AXIS</span><b>Y <small>local</small></b></div></div>' +
        '<div class="section-label">SERVICE STACK / 轴向服务顺序</div>' +
        '<div class="group-table">' + rows + '</div>' +
        '<div class="detail-actions"><button class="solid-btn" id="startLayersBtn" type="button">从后盖开始</button>' +
        '<button class="line-btn" id="assembleBtn" type="button">反向装配</button></div>';
      pane.querySelectorAll('.layer-mini').forEach(b => b.addEventListener('click', () => focusLayer(Number(b.dataset.layer))));
      const sb = $('#startLayersBtn');
      if (sb) sb.addEventListener('click', () => focusLayer(0));
      const ab = $('#assembleBtn');
      if (ab) ab.addEventListener('click', () => setAssembledMode());
    } else {
      pane.innerHTML =
        '<div class="empty-state"><div class="empty-orbit"><i></i></div>' +
        '<b>沿轴线逐层拆解</b><p>点击左侧 8 个轴向层，或直接点击 3D 零件。每一层会沿电机轴展开，层内零件再按同一轴线精细分离。</p></div>' +
        '<div class="section-label">QUICK FACTS / 模型速览</div>' +
        '<div class="quick-specs">' +
        '<div class="qs"><span>PARTS</span><b>37</b></div>' +
        '<div class="qs"><span>LAYERS</span><b>8</b></div>' +
        '<div class="qs"><span>TRIANGLES</span><b>60 210</b></div>' +
        '<div class="qs"><span>SOURCE</span><b>C4D</b></div>' +
        '</div>' +
        '<div class="section-label">HOW TO EXPLORE / 探索</div>' +
        '<ul class="fact-list">' +
        '<li>先按“轴向拆解”把整机分成 8 层，再在左侧选择具体层。</li>' +
        '<li>点击层内零件，相机会自动对准该件，右侧显示几何与材质。</li>' +
        '<li>按 T 切换外壳透视，按 L 显示当前层标注。</li>' +
        '</ul>';
    }
    requestAnimationFrame(updateScrollHint);
  }

  /* --------------------------------------------------------------------------
     X-RAY / TABS
     -------------------------------------------------------------------------- */
  function setShellTransparent(on, silent) {
    state.shellTransparent = !!on;
    ['#btnXray', '#btnXrayTop'].forEach(sel => {
      const b = $(sel);
      if (b) b.classList.toggle('on', state.shellTransparent);
    });
    if (!silent) sound.ui();
  }

  function toggleXray() {
    setShellTransparent(!state.shellTransparent);
  }

  function setTab(name) {
    if (name === 'look') name = 'part';
    $$('.itab').forEach(b => {
      const on = b.dataset.tab === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    $$('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === name));
    if (inspectorScroll) inspectorScroll.scrollTop = 0;
    requestAnimationFrame(updateScrollHint);
  }

  function updateScrollHint() {
    if (!inspectorScroll) return;
    const can = inspectorScroll.scrollHeight - inspectorScroll.clientHeight > 6;
    const bottom = inspectorScroll.scrollTop + inspectorScroll.clientHeight >= inspectorScroll.scrollHeight - 6;
    if (scrollHint) scrollHint.classList.toggle('hidden', !can || bottom);
    if (scrollFade) scrollFade.classList.toggle('hidden', !can || bottom);
  }

  /* --------------------------------------------------------------------------
     LABELS
     -------------------------------------------------------------------------- */
  function buildLabels() {
    const layer = $('#labels');
    const svg = $('#leaders');
    parts.forEach(p => {
      const el = document.createElement('button');
      el.className = 'part-label';
      el.type = 'button';
      el.dataset.index = p.index;
      el.innerHTML = '<span class="l-no">' + p.id + '</span><span class="l-body"><span class="l-name">' +
        p.name + '</span><span class="l-spec">' + p.layerDef.id + ' · ' + fmt(p.tris) + ' TRIS</span></span>';
      el.addEventListener('click', e => { e.stopPropagation(); selectPart(p.index, { openPanel: true }); });
      layer.appendChild(el);
      labelEls[p.index] = el;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svg.appendChild(path); leaderEls[p.index] = path;
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '3'); svg.appendChild(dot); leaderDots[p.index] = dot;
    });
  }

  function buildLayerTags() {
    const host = $('#layerTags');
    if (!host) return;
    host.innerHTML = '';
    AXIAL_LAYERS.forEach((layer, i) => {
      const b = document.createElement('button');
      b.className = 'layer-tag';
      b.type = 'button';
      b.innerHTML = '<b>L' + (i + 1) + '</b><span>' + layer.name + '</span>';
      b.addEventListener('click', () => focusLayer(i));
      host.appendChild(b);
      layerTagEls[i] = b;
    });
  }

  function updateLayerTags(force) {
    const host = $('#layerTags');
    const axis = $('#axisLine');
    if (!host) return;
    const show = state.ready && state.axial && !state.driftActive && state.progress > .55;
    host.style.display = show ? 'block' : 'none';
    if (axis) axis.classList.toggle('show', show);
    if (!show) return;
    assembly.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();
    const w = innerWidth, h = innerHeight;
    const safeL = w < 1180 ? 24 : 300;
    const safeR = w < 1180 ? w - 24 : w - 380;
    AXIAL_LAYERS.forEach((layer, i) => {
      const b = layerTagEls[i];
      if (!b) return;
      if (state.focusLayer >= 0 && state.focusLayer !== i) { b.style.display = 'none'; return; }
      const world = assembly.localToWorld(new THREE.Vector3(0, layer.station, 0));
      const p = world.project(camera);
      if (p.z < -1 || p.z > 1) { b.style.display = 'none'; return; }
      const x = clamp((p.x * .5 + .5) * w, safeL, safeR);
      const y = clamp((-p.y * .5 + .5) * h - 58, 96, h - 170);
      b.style.display = 'flex';
      b.style.left = x + 'px';
      b.style.top = y + 'px';
      b.classList.toggle('active', state.focusLayer === i);
    });
  }

  function partWorldCenter(p) {
    return p.centerLocal.clone().add(p.animOffset).applyMatrix4(assembly.matrixWorld);
  }

  function shouldShowLabel(p, showAll) {
    if (isMobile() && p.index !== state.selected) return false;
    if (p.index === state.selected) return false;
    if (p.index === state.hovered) return true;
    if (state.selected >= 0) return false;
    if (state.axial && state.focusLayer >= 0 && showAll && p.layerIndex === state.focusLayer) return true;
    return false;
  }

  function updateLabels(force) {
    if (!state.ready) return;
    assembly.updateWorldMatrix(true, true);
    camera.updateMatrixWorld();
    const w = innerWidth, h = innerHeight;
    const small = w <= 760;
    const desktop = w > 1180;
    const safeL = desktop ? 322 : 18;
    const safeR = desktop ? w - 386 : w - 18;
    const safeT = 92;
    const safeB = (state.dockTop || h - 138) - 18;
    const showAll = state.showAllLabels;
    const items = [];

    parts.forEach(p => {
      const visible = p.mesh.visible && shouldShowLabel(p, showAll);
      const el = labelEls[p.index];
      if (!visible) {
        el.classList.remove('show');
        leaderEls[p.index].setAttribute('opacity', '0');
        leaderDots[p.index].setAttribute('opacity', '0');
        return;
      }
      const anchor = partWorldCenter(p).project(camera);
      if (anchor.z < -1 || anchor.z > 1) {
        el.classList.remove('show');
        leaderEls[p.index].setAttribute('opacity', '0');
        leaderDots[p.index].setAttribute('opacity', '0');
        return;
      }
      const ax = (anchor.x * .5 + .5) * w;
      const ay = (-anchor.y * .5 + .5) * h;
      const side = p.index % 2 === 0 ? 1 : -1;
      let lx = ax + side * (small ? 54 : 68);
      let ly = ay + (p.index % 5 - 2) * 22 - 26;
      items.push({ p, el, ax, ay, lx, ly });
    });

    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i], b = items[j];
          if (Math.abs(a.lx - b.lx) < 160 && Math.abs(a.ly - b.ly) < 34) {
            const push = (34 - Math.abs(a.ly - b.ly)) / 2 + 1;
            if (a.ly <= b.ly) { a.ly -= push; b.ly += push; }
            else { a.ly += push; b.ly -= push; }
          }
        }
      }
    }

    items.forEach(item => {
      const el = item.el, p = item.p;
      const ww = el.offsetWidth || 142, hh = el.offsetHeight || 31;
      item.lx = clamp(item.lx, safeL + ww / 2, safeR - ww / 2);
      item.ly = clamp(item.ly, safeT + hh / 2, safeB - hh / 2);
      el.style.transform = 'translate3d(' + item.lx + 'px,' + item.ly + 'px,0) translate(-50%,-50%)';
      el.classList.add('show');
      el.classList.toggle('active', p.index === state.selected);
      el.classList.toggle('hover', p.index === state.hovered);
      const side = item.ax < item.lx ? 1 : -1;
      const endX = item.lx + side * ww / 2;
      const elbowX = endX + side * 12;
      const path = leaderEls[p.index];
      path.setAttribute('d', 'M' + item.ax.toFixed(1) + ',' + item.ay.toFixed(1) + ' L' + elbowX.toFixed(1) + ',' + item.ly.toFixed(1) + ' L' + endX.toFixed(1) + ',' + item.ly.toFixed(1));
      path.setAttribute('opacity', '1');
      path.classList.toggle('active', p.index === state.selected);
      path.classList.toggle('hover', p.index === state.hovered);
      const dot = leaderDots[p.index];
      dot.setAttribute('cx', item.ax.toFixed(1));
      dot.setAttribute('cy', item.ay.toFixed(1));
      dot.setAttribute('opacity', '1');
      dot.classList.toggle('active', p.index === state.selected);
      dot.classList.toggle('hover', p.index === state.hovered);
    });

    updateSelectionDecorations();
    updateLayerTags(force);
  }

  function updateSelectionDecorations() {
    if (state.selected < 0) {
      $('#focusAura').style.opacity = '0';
      $('#bracket').classList.remove('show');
      if (selectedHalo) selectedHalo.material.opacity = 0;
      if (selectionLight) selectionLight.intensity = 0;
      return;
    }
    const p = parts[state.selected];
    const c = partWorldCenter(p);
    const proj = c.clone().project(camera);
    const w = innerWidth, h = innerHeight;
    if (proj.z > -1 && proj.z < 1) {
      const sx = (proj.x * .5 + .5) * w;
      const sy = (-proj.y * .5 + .5) * h;
      const aura = $('#focusAura');
      aura.style.left = sx + 'px'; aura.style.top = sy + 'px'; aura.style.opacity = '.55';
      if (selectedHalo) {
        selectedHalo.position.copy(c);
        const s = clamp(p.rawSize.length() * .55, 10, 52);
        selectedHalo.scale.set(s, s, 1);
        selectedHalo.material.opacity = .13 + .03 * Math.sin(performance.now() * .004);
      }
      if (selectionLight) {
        selectionLight.position.copy(c);
        selectionLight.intensity = .6;
      }
      updateBracket(p);
    }
  }

  function updateBracket(p) {
    const b = $('#bracket');
    const box = p.localBox.clone().applyMatrix4(p.mesh.matrixWorld);
    const min = box.min, max = box.max;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Vector3(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).project(camera);
      const sx = (v.x * .5 + .5) * innerWidth;
      const sy = (-v.y * .5 + .5) * innerHeight;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
      y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    const pad = 12;
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    if (x1 < 0 || y1 < 0 || x0 > innerWidth || y0 > innerHeight || x1 - x0 > innerWidth * .85 || y1 - y0 > innerHeight * .85) {
      b.classList.remove('show');
      return;
    }
    b.style.left = x0 + 'px'; b.style.top = y0 + 'px';
    b.style.width = (x1 - x0) + 'px'; b.style.height = (y1 - y0) + 'px';
    const tag = b.querySelector('.bracket-tag');
    if (tag) {
      tag.textContent = 'SELECTED / ' + p.id;
      tag.style.top = y0 < 86 ? '10px' : '-19px';
    }
    b.classList.add('show');
  }

  /* --------------------------------------------------------------------------
     HOVER / RAYCAST
     -------------------------------------------------------------------------- */
  function setHovered(index) {
    if (state.hovered === index) return;
    state.hovered = index;
    updatePartRows();
    const el = $('#tooltip');
    if (index >= 0) {
      const p = parts[index];
      el.innerHTML = '<i></i><span>' + p.id + ' · ' + p.name + '</span><em>' + p.layerDef.id + '</em>';
      el.classList.add('show');
      sound.hover();
      if (hoverHalo) {
        hoverHalo.position.copy(partWorldCenter(p));
        const s = clamp(p.rawSize.length() * .45, 8, 40);
        hoverHalo.scale.set(s, s, 1);
        hoverHalo.visible = true;
        hoverHalo.material.opacity = .13;
      }
    } else {
      el.classList.remove('show');
      if (hoverHalo) hoverHalo.visible = false;
    }
    updateLabels();
  }

  function pickAt(x, y) {
    const ndc = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(parts.map(p => p.mesh).filter(m => m.visible), false);
    for (const h of hits) {
      const idx = h.object.userData.partId;
      if (idx === undefined) continue;
      if (state.shellTransparent && isShellPart(idx)) continue;
      return idx;
    }
    return -1;
  }

  /* --------------------------------------------------------------------------
     SOUND UI
     -------------------------------------------------------------------------- */
  function updateSoundUI() {
    const b = $('#btnSound');
    b.classList.toggle('on', sound.enabled);
    b.classList.toggle('off', !sound.enabled);
    b.setAttribute('aria-pressed', String(sound.enabled));
    $('#soundMute').textContent = sound.enabled ? '静音' : '开启';
    $('#volOut').textContent = Math.round(sound.volume * 100) + '%';
    $('#volumeRange').value = Math.round(sound.volume * 100);
    document.body.classList.toggle('sound-off', !sound.enabled);
  }

  function toggleSoundPop(force) {
    const open = force !== undefined ? force : !state.soundOpen;
    state.soundOpen = open;
    $('#soundPop').classList.toggle('open', open);
    $('#soundPop').setAttribute('aria-hidden', String(!open));
    if (open) {
      sound.init();
      updateSoundUI();
    }
  }

  function toggleMute() {
    sound.init();
    sound.setEnabled(!sound.enabled);
    updateSoundUI();
    sound.ui();
  }

  /* --------------------------------------------------------------------------
     EVENTS
     -------------------------------------------------------------------------- */
  function resetCameraForMode() {
    if (state.driftActive) {
      setCameraDrift();
    } else if (state.selected >= 0) {
      state._partFocusSized = -1;
      setCameraPart(parts[state.selected]);
    } else if (state.axial && state.focusLayer >= 0) {
      setCameraLayer(AXIAL_LAYERS[state.focusLayer]);
    } else if (state.axial) {
      setCameraAxial();
    } else {
      setCameraHero();
    }
    sound.ui();
  }

  function bindUI() {
    inspectorScroll = $('#inspectorScroll');
    scrollHint = $('#scrollHint');
    scrollFade = $('#scrollFade');
    if (inspectorScroll) inspectorScroll.addEventListener('scroll', updateScrollHint, { passive: true });

    const axialBtn = $('#btnAxial');
    if (axialBtn) axialBtn.addEventListener('click', toggleAxial);
    const prevBtn = $('#btnStepPrev');
    if (prevBtn) prevBtn.addEventListener('click', () => stepLayer(-1));
    const nextBtn = $('#btnStepNext');
    if (nextBtn) nextBtn.addEventListener('click', () => stepLayer(1));
    const labelBtn = $('#btnLabels');
    if (labelBtn) labelBtn.addEventListener('click', toggleLabels);
    const driftBtn = $('#btnDrift');
    if (driftBtn) driftBtn.addEventListener('click', toggleDrift);
    const bgBtn = $('#btnBgMode');
    if (bgBtn) bgBtn.addEventListener('click', toggleBackground);
    const resetBtn = $('#btnReset');
    if (resetBtn) resetBtn.addEventListener('click', resetCameraForMode);
    ['#btnXray', '#btnXrayTop'].forEach(sel => {
      const b = $(sel);
      if (b) b.addEventListener('click', toggleXray);
    });

    const soundBtn = $('#btnSound');
    if (soundBtn) soundBtn.addEventListener('click', e => {
      e.stopPropagation();
      sound.init();
      toggleSoundPop();
    });
    const muteBtn = $('#soundMute');
    if (muteBtn) muteBtn.addEventListener('click', toggleMute);
    const vol = $('#volumeRange');
    if (vol) vol.addEventListener('input', e => {
      sound.setVolume(Number(e.target.value) / 100);
      updateSoundUI();
    });
    const testBtn = $('#soundTest');
    if (testBtn) testBtn.addEventListener('click', () => { sound.init(); sound.enabled = true; updateSoundUI(); sound.test(); });
    document.addEventListener('pointerdown', e => {
      sound.init();
      if (state.soundOpen && !e.target.closest('#soundPop') && !e.target.closest('#btnSound')) toggleSoundPop(false);
    }, true);

    const tabPart = $('#tabPart');
    if (tabPart) tabPart.addEventListener('click', () => setTab('part'));
    const tabMotor = $('#tabMotor');
    if (tabMotor) tabMotor.addEventListener('click', () => setTab('motor'));
    const openParts = $('#openParts');
    if (openParts) openParts.addEventListener('click', () => openPanel('left'));
    const closeParts = $('#closeParts');
    if (closeParts) closeParts.addEventListener('click', () => closePanel('left'));
    const openInfo = $('#openInfo');
    if (openInfo) openInfo.addEventListener('click', () => openPanel('right'));
    const closeInfo = $('#closeInfo');
    if (closeInfo) closeInfo.addEventListener('click', () => closePanel('right'));

    $('#openHelp').addEventListener('click', openHelp);
    $$('[data-close-help]').forEach(el => el.addEventListener('click', closeHelp));

    const range = $('#travelRange');
    if (range) {
      range.addEventListener('pointerdown', () => state.scrubbing = true);
      range.addEventListener('input', () => {
        const v = Number(range.value) / 100;
        if (state.driftActive) exitDrift(true);
        if (v < .01) {
          setAssembledMode();
          state.scrubbing = false;
          return;
        }
        state.axial = true;
        state.mode = 'axial';
        state.autoRotate = false;
        state.assemblyRotTarget = -Math.PI / 2;
        if (v < .98) {
          if (state.selected >= 0) restoreSelectedMaterial();
          state.selected = -1;
          state._partFocusSized = -1;
          state.focusLayer = -1;
          state.layerFocusTarget = 0;
          updatePartRows();
          updateInspector(false);
        }
        beginProgress(v, .12);
        setCameraAxial();
        updateHud();
        updateLabels(true);
        sound.hover();
      });
      range.addEventListener('change', () => { state.scrubbing = false; });
      range.addEventListener('pointerup', () => { state.scrubbing = false; });
    }

    document.addEventListener('keydown', e => {
      if (!state.entered) {
        if (e.key === 'Enter' && $('#enterBtn') && !$('#enterBtn').disabled) enterExperience();
        return;
      }
      if (document.body.classList.contains('showcase') && !document.body.classList.contains('lab-open')) return;
      if (document.body.classList.contains('showcase') &&
          document.body.classList.contains('lab-open') &&
          e.key === 'Escape') return;
      if (e.key === 'Escape') {
        if ($('#helpModal').classList.contains('open')) { closeHelp(); return; }
        if (state.soundOpen) { toggleSoundPop(false); return; }
        closeAllPanels();
        if (state.driftActive) { exitDrift(false); return; }
        if (state.selected >= 0) deselect();
        else if (state.axial) setAssembledMode();
        return;
      }
      if ($('#helpModal').classList.contains('open')) return;
      if (e.target.closest('input,textarea,select')) return;
      if (e.code === 'Space' && e.target.closest('button,a')) return;
      if (e.code === 'Space') { e.preventDefault(); toggleAxial(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepLayer(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepLayer(1); }
      else if (e.key === 'l' || e.key === 'L') toggleLabels();
      else if (e.key === 's' || e.key === 'S') toggleMute();
      else if (e.key === 't' || e.key === 'T') toggleXray();
      else if (e.key === 'f' || e.key === 'F') {
        if (state.axial) toggleDrift();
      } else if (e.key === 'b' || e.key === 'B') {
        if (state.axial) toggleBackground();
      } else if (e.key === 'r' || e.key === 'R') resetCameraForMode();
    });

    document.addEventListener('pointerdown', e => {
      if (!isMobile()) return;
      if (e.target.closest('.panel') || e.target.closest('#openParts') || e.target.closest('#openInfo') || e.target.closest('#btnAxial') || e.target.closest('.layer-tag')) return;
      closeAllPanels();
    }, true);

    window.addEventListener('resize', onResize);
  }

  function openHelp() {
    $('#helpModal').classList.add('open');
    $('#helpModal').setAttribute('aria-hidden', 'false');
  }
  function closeHelp() {
    $('#helpModal').classList.remove('open');
    $('#helpModal').setAttribute('aria-hidden', 'true');
  }
  function openPanel(side) {
    if (!isMobile()) return;
    $(side === 'left' ? '#leftPanel' : '#rightPanel').classList.add('open');
  }
  function closePanel(side) {
    if (!isMobile()) return;
    $(side === 'left' ? '#leftPanel' : '#rightPanel').classList.remove('open');
  }
  function closeAllPanels() {
    $('#leftPanel').classList.remove('open');
    $('#rightPanel').classList.remove('open');
  }

  function onResize() {
    if (!renderer || !camera) return;
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    state.baseRadius = computeBaseRadius();
    if (state.driftActive) {
      setCameraDrift();
    } else if (state.axial) {
      if (state.focusLayer >= 0) setCameraLayer(AXIAL_LAYERS[state.focusLayer]);
      else setCameraAxial();
    } else if (state.radiusTarget < state.baseRadius * 2) {
      state.radiusTarget = state.baseRadius;
    }
    state.dockTop = $('#dock').getBoundingClientRect().top;
    if (!isMobile()) closeAllPanels();
    updateLayerTags(true);
    requestAnimationFrame(updateScrollHint);
  }

  function bindPointer() {
    const canvas = $('#scene');
    const tooltip = $('#tooltip');
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.button !== 2) return;
      canvas.setPointerCapture(e.pointerId);
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (state.pointers.size === 1) {
        state.pointerDown = true; state.dragging = false; state.dragMoved = 0;
        state.dragMode = e.button === 2 ? 2 : 1;
        state.lastX = e.clientX; state.lastY = e.clientY;
        document.body.classList.add('interacted');
      } else if (state.pointers.size === 2) {
        const pts = [...state.pointers.values()];
        state.pinch = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        state.dragging = true; state.pointerDown = false;
      }
    });

    canvas.addEventListener('pointermove', e => {
      if (state.pointers.has(e.pointerId)) state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (state.pointers.size === 2) {
        const pts = [...state.pointers.values()];
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (state.pinch > 0) { adjustZoom(state.pinch / d); state.pinch = d; }
        return;
      }
      if (state.pointerDown) {
        const dx = e.clientX - state.lastX, dy = e.clientY - state.lastY;
        state.dragMoved += Math.abs(dx) + Math.abs(dy);
        if (state.dragMoved > 3) {
          state.dragging = true;
          if (state.dragMode === 1) {
            state.thetaTarget -= dx * .0052;
            state.phiTarget = clamp(state.phiTarget - dy * .0048, .28, 2.62);
          } else pan(dx, dy);
          state.lastX = e.clientX; state.lastY = e.clientY;
          setHovered(-1);
        }
        return;
      }
      const now = performance.now();
      if (now - (state._hoverAt || 0) > 45) {
        state._hoverAt = now;
        const id = pickAt(e.clientX, e.clientY);
        setHovered(id);
        tooltip.style.left = e.clientX + 'px';
        tooltip.style.top = e.clientY + 'px';
      }
    });

    canvas.addEventListener('pointerup', e => {
      const wasDown = state.pointerDown && state.dragMoved < 6;
      const mode = state.dragMode;
      state.pointers.delete(e.pointerId);
      if (state.pointers.size < 2) state.pinch = 0;
      if (state.pointers.size === 0) { state.pointerDown = false; state.dragging = false; }
      if (wasDown && mode === 1) {
        const id = pickAt(e.clientX, e.clientY);
        if (id >= 0) selectPart(id, { openPanel: true });
      }
    });

    canvas.addEventListener('pointercancel', e => {
      state.pointers.delete(e.pointerId);
      state.pointerDown = false; state.dragging = false;
    });
    canvas.addEventListener('pointerleave', () => { if (!state.dragging) setHovered(-1); });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      adjustZoom(1 + clamp(e.deltaY, -120, 120) * .0011);
    }, { passive: false });
    canvas.addEventListener('dblclick', e => {
      const id = pickAt(e.clientX, e.clientY);
      if (id >= 0) { selectPart(id, { openPanel: true }); focusPart(id); }
      else if (state.selected >= 0) focusPart(state.selected);
    });
  }

  /* --------------------------------------------------------------------------
     HUD
     -------------------------------------------------------------------------- */
  function updateHud() {
    const pct = Math.round(state.progress * 100);
    const targetPct = Math.round(state.progressTarget * 100);
    const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };
    setText('#travelOut', String(targetPct).padStart(2, '0') + '%');
    setText('#leftTravel', String(targetPct).padStart(2, '0') + '%');
    const fill = $('#travelFill'), knob = $('#travelKnob'), lbar = $('#leftTravelBar'), range = $('#travelRange');
    if (fill) fill.style.width = pct + '%';
    if (knob) knob.style.left = pct + '%';
    if (lbar) lbar.style.width = pct + '%';
    if (range) range.value = targetPct;
    const layerMode = state.axial && state.focusLayer >= 0;
    const drift = state.driftActive;
    setText('#modeOut', drift ? 'DRIFT FIELD' : (state.axial ? (layerMode ? 'LAYER FOCUS' : 'AXIAL ALL') : 'ASSEMBLED'));
    setText('#leftStatus', drift ? 'SPACE DRIFT' : (state.axial ? (layerMode ? 'LAYER L' + (state.focusLayer + 1) : 'AXIAL ALL') : 'ASSEMBLED'));
    setText('#leftLayer', drift ? '— / 8' : (layerMode ? 'L' + (state.focusLayer + 1) + ' / 8' : 'L— / 8'));
    const sel = state.selected >= 0 ? parts[state.selected] : null;
    setText('#partOut', sel ? sel.id : '—');
    setText('#layerOut', drift ? '—' : (layerMode ? 'L' + (state.focusLayer + 1) : (sel ? 'L' + (sel.layerIndex + 1) : '—')));
    const btn = $('#btnAxial');
    if (btn) {
      const on = state.axial && state.progressTarget > .5;
      btn.classList.toggle('on', on);
      const lbl = btn.querySelector('.act-label b');
      const em = btn.querySelector('.act-label em');
      if (lbl) lbl.textContent = on ? '反向装配' : '轴向拆解';
      if (em) em.textContent = on ? 'ASSEMBLE' : 'EXPLODE STACK';
    }
    const xb = $('#btnXray');
    if (xb) xb.classList.toggle('on', state.shellTransparent);
    const xt = $('#btnXrayTop');
    if (xt) xt.classList.toggle('on', state.shellTransparent);
    const lb = $('#btnLabels');
    if (lb) lb.classList.toggle('on', state.showAllLabels);
    updateFxUI();
  }

  /* --------------------------------------------------------------------------
     ANIMATION
     -------------------------------------------------------------------------- */
  function animate(now) {
    if (!state.ready) return;
    requestAnimationFrame(animate);
    const dt = Math.min(.2, (now - state.lastFrame) / 1000 || .016);
    state.lastFrame = now;

    updatePartTransforms(dt);
    updateFx(dt);
    updateCamera(dt);

    if (selectedHalo && state.selected >= 0) {
      const p = parts[state.selected];
      const c = partWorldCenter(p);
      selectedHalo.position.copy(c);
    }
    if (selectionLight && state.selected >= 0) {
      selectionLight.position.copy(partWorldCenter(parts[state.selected]));
    }
    if (particleField) particleField.rotation.y += dt * .008;
    if (bokehField) bokehField.rotation.y -= dt * .004;
    if (goldField) goldField.rotation.y += dt * .005;

    updateLabels();
    updateHud();
    renderer.render(scene, camera);
  }

  /* --------------------------------------------------------------------------
     BOOT
     -------------------------------------------------------------------------- */
  function setLoad(pct, text) {
    const bar = $('#loadBar'); const pctEl = $('#loadPct'); const txt = $('#loadText');
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
    if (txt && text) txt.textContent = text;
  }

  function buildSelectionFx() {
    const halo = makeCanvasTexture(256, 256, (ctx, w, h) => {
      const g = ctx.createRadialGradient(128, 128, 2, 128, 128, 126);
      g.addColorStop(0, 'rgba(247,245,245,.8)');
      g.addColorStop(.15, 'rgba(219,36,42,.5)');
      g.addColorStop(.42, 'rgba(152,27,43,.16)');
      g.addColorStop(1, 'rgba(152,27,43,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }, true);
    const mat = new THREE.SpriteMaterial({ map: halo, color: 0xF7F5F5, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true });
    selectedHalo = new THREE.Sprite(mat);
    selectedHalo.scale.set(28, 28, 1);
    scene.add(selectedHalo);
    hoverHalo = new THREE.Sprite(mat.clone());
    hoverHalo.material.color.setHex(0xF7F5F5);
    hoverHalo.scale.set(18, 18, 1);
    hoverHalo.visible = false;
    scene.add(hoverHalo);
    selectionLight = new THREE.PointLight(0xDB242A, 0, 90, 2);
    scene.add(selectionLight);
  }

  /* --------------------------------------------------------------------------
     SHOWCASE API
     -------------------------------------------------------------------------- */
  function showcaseClearSelection() {
    restoreSelectedMaterial();
    state.selected = -1;
    state._partFocusSized = -1;
    state.focusLayer = -1;
    state.layerFocusTarget = 0;
  }

  function showcaseHero() {
    if (!state.ready) return;
    if (state.driftActive) exitDrift(true);
    showcaseClearSelection();
    state.axial = false;
    state.mode = 'assembled';
    state.progress = state.progressTarget = state.progressFrom = 0;
    state.progressStart = performance.now();
    state.progressDuration = .02;
    state.assemblyRotTarget = 0;
    state.autoRotate = true;
    state.thetaTarget = .58;
    state.phiTarget = 1.18;
    state.radiusTarget = state.baseRadius * (innerWidth <= 560 ? 1.1 : .95);
    state.targetTarget.set(innerWidth > 1180 ? -34 : 0, 0, 0);
  }

  function showcaseAxial(p) {
    if (!state.ready) return;
    if (state.driftActive) exitDrift(true);
    showcaseClearSelection();
    const v = clamp(Number(p) || 0, 0, 1);
    const e = smooth(v);
    state.axial = true;
    state.mode = 'axial';
    state.autoRotate = false;
    state.assemblyRotTarget = -Math.PI / 2;
    state.progress = state.progressTarget = state.progressFrom = v;
    state.progressStart = performance.now();
    state.progressDuration = .02;
    state.thetaTarget = lerp(.58, .03, e);
    state.phiTarget = lerp(1.18, 1.47, e);
    state.radiusTarget = lerp(state.baseRadius * 1.08, computeAxialRadius() * 1.16, e);
    state.targetTarget.set(0, lerp(0, assembly.position.y, e), 0);
  }

  function showcaseStorm(on) {
    if (!state.ready) return;
    if (on === false) {
      if (state.driftActive) exitDrift(true);
      state.mode = 'axial';
      state.axial = true;
      state.progress = state.progressTarget = state.progressFrom = 1;
      state.assemblyRotTarget = -Math.PI / 2;
      setCameraAxial();
      return;
    }
    if (!state.axial) {
      state.axial = true;
      state.progress = state.progressTarget = state.progressFrom = 1;
      state.assemblyRotTarget = -Math.PI / 2;
    }
    showcaseClearSelection();
    state.driftActive = true;
    state.driftTarget = 1;
    state.driftClock = 0;
    state.mode = 'drift';
    state.axial = true;
    state.autoRotate = false;
    state.progress = state.progressTarget = state.progressFrom = 1;
    prepareDrift();
    if (!state.bgChosen) setBackground('space', true);
    setCameraDrift();
    document.body.classList.add('fx-mode');
    updateLabels(true);
  }

  function showcaseSetBackground(mode) {
    if (!state.ready) return;
    state.bgChosen = true;
    setBackground(mode === 'space' ? 'space' : 'studio', true);
  }

  function showcaseOpenLab() {
    if (!state.ready) return;
    if (state.driftActive) exitDrift(true);
    showcaseClearSelection();
    state.axial = true;
    state.mode = 'axial';
    state.autoRotate = false;
    state.assemblyRotTarget = -Math.PI / 2;
    state.progress = state.progressTarget = state.progressFrom = 1;
    state.progressStart = performance.now();
    state.progressDuration = .02;
    setCameraAxial();
    updatePartRows();
    updateInspector(false);
    updateLabels(true);
    updateHud();
  }

  window.SOLINK_API = {
    ready: () => state.ready,
    hero: showcaseHero,
    axial: showcaseAxial,
    storm: showcaseStorm,
    openLab: showcaseOpenLab,
    focusLayer: (i) => {
      if (!state.ready) return;
      focusLayer(i);
    },
    setBackground: showcaseSetBackground,
    getBackground: () => state.background,
    getState: () => ({
      mode: state.mode,
      drift: state.driftActive,
      progress: state.progress,
      background: state.background,
      entered: state.entered
    })
  };

  function boot() {
    bindLaunchOptions();
    setLoad(8, '初始化 WebGL…');
    try {
      initRenderer();
    } catch (e) {
      setLoad(0, 'WebGL 初始化失败：' + e.message);
      console.error(e);
      return;
    }
    requestAnimationFrame(() => {
      setLoad(24, '生成环境光与材质…');
      buildEnvironment();
      addLights();
      buildFloor();
      buildSelectionFx();
      setLoad(46, '解析 C4D 网格数据…');
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          buildModel();
          setLoad(76, '构建 37 个独立零件…');
          buildFx();
          buildPartList();
          buildLabels();
          buildLayerTags();
          renderModelOverview();
          updateInspector(false);
          setTab('part');
          bindUI();
          bindPointer();
          state.dockTop = $('#dock').getBoundingClientRect().top;
          state.ready = true;
          state.autoRotate = false;
          state.lastFrame = performance.now();
          state.progressStart = performance.now();
          $('#btnLabels').classList.add('on');
          updateSoundUI();
          updateHud();
          requestAnimationFrame(animate);
          setLoad(100, '就绪');
          const enter = $('#enterBtn');
          if (enter) enter.disabled = false;
          const enterText = $('#enterText');
          if (enterText) enterText.textContent = '进入轴向拆解台';
          requestAnimationFrame(() => {
            updateScrollHint();
            updateLayerTags(true);
          });
        } catch (e) {
          console.error(e);
          setLoad(100, '装配失败：' + e.message);
          $('#loadPct').textContent = '!';
        }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 80));
  else setTimeout(boot, 80);

})();
