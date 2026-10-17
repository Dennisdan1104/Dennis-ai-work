/* ============================================================
   无人泳池 / THE POOL REMEMBERS
   A dependency-free first-person liminal-pool dream.
   ============================================================ */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const TAU = Math.PI * 2;
  const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  document.body.classList.add(IS_TOUCH ? 'touch' : 'pointer-fine');

  // ---------------- DOM ----------------
  const canvas = $('#view');
  const ctx = canvas.getContext('2d', { alpha: false });
  const stage = $('#stage');
  const glitchBars = $('#glitch-bars');
  const flash = $('#flash');
  const titleScreen = $('#title-screen');
  const endingScreen = $('#ending-screen');
  const startButton = $('#start-button');
  const againButton = $('#again-button');
  const soundButton = $('#sound-button');
  const promptEl = $('#prompt');
  const promptText = $('#prompt-text');
  const reticle = $('#reticle');
  const dialogEl = $('#dialog');
  const dialogKicker = $('#dialog-kicker');
  const dialogText = $('#dialog-text');
  const dialogCount = $('#dialog-count');
  const dialogNext = $('#dialog-next');
  const dialogChoices = $('#dialog-choices');
  const promptProgressBar = $('#prompt-progress-bar');
  const endingKicker = $('#ending-kicker');
  const endingTitle = $('#ending-title');
  const endingEn = $('#ending-en');
  const endingCopy = $('#ending-copy');
  const endingMeta = $('#ending-meta');
  const broadcastEl = $('#broadcast');
  const broadcastText = $('#broadcast-text');
  const captionEl = $('#caption');
  const toastEl = $('#toast');
  const toastMain = $('#toast-main');
  const memoryCount = $('#memory-count');
  const memoryDots = [...document.querySelectorAll('.memory-dots i')];
  const objectiveText = $('#objective-text');
  const clockEl = $('#clock');
  const timecodeEl = $('#timecode');
  const joystick = $('#joystick');
  const joystickKnob = $('#joystick-knob');
  const touchAct = $('#touch-act');

  // ---------------- world constants ----------------
  const MAP_W = 26;
  const MAP_H = 30;
  const CEILING = 4.6;
  const EYE_DECK = 1.63;
  const EYE_WATER = 1.21;
  const POOL = { x1: 7, x2: 19, y1: 8, y2: 20 };
  const LIGHT_START = 4.5;
  const LIGHT_GAP = 4.65;
  const LIGHT_COUNT = 5;
  const FOG_R = 145;
  const FOG_G = 159;
  const FOG_B = 148;

  // ---------------- map ----------------
  // 0 empty | 1 tile wall | 2 pillar | 3 window | 4 red door | 5 service door
  const map = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(1));
  for (let y = 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) map[y][x] = 0;
  }

  // windows into the pale nowhere
  [4, 5, 6, 7, 21, 22, 23, 24].forEach(y => {
    map[y][0] = 3;
    map[y][MAP_W - 1] = 3;
  });
  // the red door at the deep end
  map[0][12] = 4;
  map[0][13] = 4;
  // a service door, painted over
  map[12][MAP_W - 1] = 5;
  // square columns
  [[4, 6], [21, 6], [4, 23], [21, 23]].forEach(([x, y]) => { map[y][x] = 2; });

  // ---------------- player state ----------------
  const state = {
    started: false,
    inputLocked: true,
    dialogOpen: false,
    ending: false,
    cutscene: false,
    x: 13.0,
    y: 26.15,
    angle: -Math.PI / 2,
    pitch: 0.012,
    eyeSmooth: EYE_DECK,
    bob: 0,
    bobPhase: 0,
    speed: 0,
    inWater: false,
    hasEnteredWater: false,
    memories: new Set(),
    doorUnlocked: false,
    muted: false,
    audioReady: false,
    nearest: null,
    nearestKey: '',
    stepTimer: 0,
    dwellTime: 0,
    gazeTime: 0,
    lookTarget: null,
    endingChoice: null,
    startedAt: 0,
    flickerUntil: 0,
    glitchUntil: 0,
    watcherUntil: 0,
    nextBroadcastAt: 0,
    nextAnomalyAt: 0,
    nextDripAt: 0,
    nextPhoneRingAt: 0,
    lastTimecode: 0,
    act2: false,
    frame: 0
  };

  // ---------------- hotspots / story ----------------
  const HOTSPOTS = [
    {
      id: 'chair',
      x: 21.45,
      y: 21.9,
      radius: 2.8,
      label: '记忆碎片 · 被看见',
      prompt: '抬头看向椅子',
      memoryName: '被看见',
      mode: 'gaze',
      lines: [
        '救生员椅空着。红色坐垫上有一圈尚未干透的水印。',
        '你下意识抬起头。高处的椅子上，没有人。',
        '椅背后面挂着一只旧哨子。它忽然自己响了一声。',
        '很短。像是有人看见你沉下去，却没有吹响它。'
      ]
    },
    {
      id: 'lockers',
      x: 1.45,
      y: 12.15,
      radius: 2.55,
      label: '记忆碎片 · 名字',
      prompt: '打开17号储物柜',
      memoryName: '名字',
      mode: 'touch',
      lines: [
        '一排储物柜。只有17号的门是开着的。',
        '里面挂着一件还没干透的泳衣。标签上写着你的名字，笔画被水泡得发胀。',
        '标签背面还有一行小字：「闭馆后，请勿下水。」',
        '可你记得，那天没有人来清场。'
      ]
    },
    {
      id: 'phone',
      x: 8.25,
      y: 15.0,
      radius: 2.45,
      requiresWater: true,
      label: '水底通话 · 未接来电',
      prompt: '接起水下的电话',
      memoryName: '未接来电',
      mode: 'call',
      lines: [
        '你从水底捞起那部红色电话。它还在响。',
        '听筒里先是气泡的声音。',
        '然后，是你自己的声音。它问：「闭馆广播响了吗？」',
        '另一个声音回答：「还没有。再等等。」',
        '你忽然不确定，自己是在打电话，还是在等电话。'
      ]
    },
    {
      id: 'drain',
      x: 13.0,
      y: 7.15,
      radius: 2.35,
      label: '记忆碎片 · 闭馆',
      prompt: '站上排水口 · 保持不动',
      memoryName: '闭馆',
      mode: 'dwell',
      lines: [
        '排水口没有排水。它正在缓慢地吸气。',
        '你蹲下去，看见格栅下面映着一片天花板上的灯。',
        '灯里有一个穿泳衣的人影。它没有脸。',
        '广播终于响起。可它念的，是明天的闭馆通知。'
      ]
    },
    {
      id: 'door',
      x: 13.0,
      y: 0.8,
      radius: 3.0,
      label: '出口 · 红门',
      prompt: '查看红门',
      mode: 'door',
      lines: []
    }
  ];

  const INTRO_LINES = [
    '你在池边醒来。灯还亮着，水面上没有你的倒影。',
    '空气里有氯水、旧瓷砖，还有一种很轻的、像是有人在数数的声音。',
    '你不记得自己是怎么来的。也不记得，为什么穿着泳衣。',
    '池子的尽头有一扇红门。广播说，闭馆前不要靠近它。',
    '可广播已经很久没有响过了。'
  ];

  const DOOR_LOCKED_LINES = [
    '门把手是温的，像刚刚被人握过。',
    '门缝下没有光，只有水慢慢渗出来。',
    '门后有人在数数。一、二、三……每一次都停在四。',
    '你听见自己的声音说：「等你想起来，门就会开。」'
  ];

  const DOOR_OPEN_LINES = [
    '门开了。门后没有走廊。',
    '还是这座泳池。只是水面比刚才更高了。',
    '岸边站着一个人，背对着你。它穿着你的泳衣。',
    '它慢慢回过头。',
    '那是你的脸。',
    '它问你：「这一次，你要留下，还是醒过来？」'
  ];

  const ENDINGS = {
    stay: {
      kicker: 'END OF RECORD / 03:17',
      title: '你留在了水里',
      en: 'THE POOL KEEPS YOU',
      copy: '你向后退了一步。水从脚踝漫上来，像有人替你盖好被子。<br>红门在身后合上。<br>救生员椅上多了一个人。<br><span class="dim">下一次有人推门进来，会看见它穿着你的泳衣，安静地等你回头。</span>',
      meta: ['记忆碎片 4 / 4', '出口 放弃', '水温 31.7°C'],
      button: '再次入水'
    },
    leave: {
      kicker: 'END OF RECORD / 06:04',
      title: '你终于上岸',
      en: 'THE POOL LETS GO',
      copy: '你向前走。水从脚边退开，像有人关掉了一个很远的开关。<br>广播第一次响起。它念出了你的名字。<br>你睁开眼。房间里没有泳池。<br><span class="dim">但氯水的味道，一直留到早上。</span>',
      meta: ['记忆碎片 4 / 4', '出口 找到', '水温 31.7°C'],
      button: '再次睁眼'
    }
  };

  const BROADCASTS_EARLY = [
    '请勿在池边奔跑。',
    '今日水温 31.7 摄氏度。',
    '闭馆前，请勿靠近红门。',
    '请照看好您的倒影。',
    '救生员不在岗。请勿向水面下看。',
    '请勿接听水下的电话。'
  ];
  const BROADCASTS_MID = [
    '请确认您的同行者仍在水中。',
    '广播测试。一、二、三、四。',
    '如果听见有人叫你的名字，请继续游泳。',
    '请勿在水中呼吸。',
    '闭馆时间已经过去四小时。',
    '池内没有儿童。重复：池内没有儿童。'
  ];
  const BROADCASTS_LATE = [
    '出口正在维修。请在池中等待。',
    '请勿背对水面。',
    '重复：泳池里没有其他人。',
    '水面上的倒影，不是你的。',
    '请留在原地。救生员正在赶来。'
  ];

  // ---------------- utility / textures ----------------
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }

  function paintTiles(g, rnd, accent = true) {
    const W = 128, H = 256;
    const tw = 32, th = 16;
    g.fillStyle = '#657466';
    g.fillRect(0, 0, W, H);

    for (let y = 0; y < H; y += th) {
      for (let x = 0; x < W; x += tw) {
        const n = rnd();
        let cool = n > 0.82 ? 10 : 0;
        let v = 193 + Math.floor(rnd() * 22);
        let r = v - 8;
        let gg = v + 2;
        let b = v - cool - 12;
        if (n < 0.045) { r -= 22; gg -= 20; b -= 16; }
        if (n > 0.975) { r += 12; gg += 12; b += 8; }
        g.fillStyle = `rgb(${r},${gg},${b})`;
        g.fillRect(x + 1, y + 1, tw - 2, th - 2);
        // glazed edge
        g.fillStyle = 'rgba(255,255,246,.10)';
        g.fillRect(x + 1, y + 1, tw - 2, 1);
        g.fillStyle = 'rgba(30,44,37,.09)';
        g.fillRect(x + 1, y + th - 2, tw - 2, 1);
        // tiny age marks
        if (rnd() > 0.9) {
          g.fillStyle = 'rgba(86,98,79,.16)';
          g.fillRect(x + 4 + rnd() * 20, y + 3 + rnd() * 9, 1, 1);
        }
      }
    }

    if (accent) {
      g.fillStyle = 'rgba(61,101,89,.42)';
      g.fillRect(0, 108, W, 5);
      g.fillStyle = 'rgba(22,53,45,.34)';
      g.fillRect(0, 113, W, 2);
    }

    // damp, creeping up from the floor
    const damp = g.createLinearGradient(0, 176, 0, H);
    damp.addColorStop(0, 'rgba(47,67,53,0)');
    damp.addColorStop(1, 'rgba(35,55,43,.48)');
    g.fillStyle = damp;
    g.fillRect(0, 176, W, H - 176);

    // water bloom stains
    for (let i = 0; i < 9; i++) {
      const x = rnd() * W, y = 40 + rnd() * 195, r = 8 + rnd() * 30;
      const grad = g.createRadialGradient(x, y, 1, x, y, r);
      grad.addColorStop(0, 'rgba(73,93,72,.16)');
      grad.addColorStop(1, 'rgba(73,93,72,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(x, y, r, r * (0.5 + rnd()), 0, 0, TAU);
      g.fill();
    }

    // hairline cracks
    g.strokeStyle = 'rgba(57,69,57,.28)';
    g.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      let x = 10 + rnd() * 100;
      let y = 20 + rnd() * 200;
      g.beginPath();
      g.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        x += (rnd() - 0.5) * 18;
        y += 5 + rnd() * 13;
        g.lineTo(x, y);
      }
      g.stroke();
    }

    // dark skirting
    const skirt = g.createLinearGradient(0, 236, 0, H);
    skirt.addColorStop(0, 'rgba(28,41,33,0)');
    skirt.addColorStop(1, 'rgba(23,35,29,.72)');
    g.fillStyle = skirt;
    g.fillRect(0, 236, W, 20);
  }

  function buildWallTextures() {
    const tile = makeCanvas(128, 256);
    paintTiles(tile.getContext('2d'), mulberry32(9103));

    // window wall
    const win = makeCanvas(128, 256);
    const wg = win.getContext('2d');
    paintTiles(wg, mulberry32(4417), false);
    wg.fillStyle = '#4c5d51';
    wg.fillRect(12, 23, 104, 184);
    wg.fillStyle = '#162623';
    wg.fillRect(17, 28, 94, 174);
    const glass = wg.createLinearGradient(0, 28, 0, 202);
    glass.addColorStop(0, 'rgba(185,199,180,.9)');
    glass.addColorStop(0.38, 'rgba(134,158,145,.82)');
    glass.addColorStop(0.74, 'rgba(103,132,122,.86)');
    glass.addColorStop(1, 'rgba(57,89,81,.9)');
    wg.fillStyle = glass;
    wg.fillRect(20, 31, 88, 168);
    // impossible pale horizon outside
    const outside = wg.createLinearGradient(0, 31, 0, 199);
    outside.addColorStop(0, 'rgba(236,238,218,.62)');
    outside.addColorStop(0.52, 'rgba(202,213,197,.2)');
    outside.addColorStop(1, 'rgba(25,45,40,.24)');
    wg.fillStyle = outside;
    wg.fillRect(20, 31, 88, 168);
    // glazing bars
    wg.fillStyle = 'rgba(41,58,50,.88)';
    wg.fillRect(62, 31, 4, 168);
    wg.fillRect(20, 96, 88, 3);
    wg.fillRect(20, 160, 88, 3);
    wg.fillStyle = 'rgba(241,242,220,.18)';
    wg.fillRect(23, 34, 2, 160);
    wg.fillRect(66, 34, 1, 160);
    // interior reflected fluorescent
    const refl = wg.createLinearGradient(35, 0, 80, 0);
    refl.addColorStop(0, 'rgba(242,241,211,0)');
    refl.addColorStop(.45, 'rgba(242,241,211,.2)');
    refl.addColorStop(.55, 'rgba(242,241,211,.2)');
    refl.addColorStop(1, 'rgba(242,241,211,0)');
    wg.fillStyle = refl;
    wg.fillRect(20, 36, 88, 22);
    // grime along sill
    wg.fillStyle = 'rgba(34,48,39,.28)';
    wg.fillRect(16, 193, 96, 6);
    wg.fillStyle = 'rgba(150,169,150,.4)';
    wg.fillRect(10, 205, 108, 2);

    // red door — closed
    const door = makeCanvas(128, 256);
    const dg = door.getContext('2d');
    paintTiles(dg, mulberry32(7681), false);
    dg.fillStyle = '#4d2623';
    dg.fillRect(8, 93, 112, 160);
    dg.fillStyle = '#842f2c';
    dg.fillRect(14, 100, 100, 150);
    dg.fillStyle = '#6e2827';
    dg.fillRect(21, 108, 86, 44);
    dg.fillRect(21, 162, 86, 77);
    dg.fillStyle = 'rgba(229,168,151,.18)';
    dg.fillRect(22, 109, 84, 2);
    dg.fillRect(22, 163, 84, 2);
    // grime and water damage
    dg.fillStyle = 'rgba(35,39,32,.32)';
    dg.fillRect(14, 238, 100, 12);
    dg.fillStyle = 'rgba(234,235,209,.55)';
    dg.fillRect(100, 181, 7, 2);
    dg.fillStyle = '#d5c6a0';
    dg.fillRect(101, 176, 5, 5);
    dg.fillStyle = 'rgba(14,26,22,.5)';
    dg.fillRect(14, 248, 100, 2);
    // exit sign
    dg.fillStyle = '#173c31';
    dg.fillRect(43, 72, 42, 15);
    dg.fillStyle = '#b8d4bd';
    dg.font = '8px "Cascadia Mono", monospace';
    dg.textAlign = 'center';
    dg.fillText('EXIT', 64, 83);
    dg.fillStyle = 'rgba(146,193,165,.24)';
    dg.fillRect(40, 69, 48, 1);
    // seep beneath
    dg.fillStyle = 'rgba(96,142,130,.42)';
    dg.fillRect(8, 251, 112, 3);

    // red door — ajar / unlocked
    const doorOpen = makeCanvas(128, 256);
    const og = doorOpen.getContext('2d');
    paintTiles(og, mulberry32(7681), false);
    og.fillStyle = '#0c1714';
    og.fillRect(8, 93, 112, 160);
    const voidGlow = og.createRadialGradient(64, 185, 3, 64, 185, 89);
    voidGlow.addColorStop(0, 'rgba(199,225,202,.48)');
    voidGlow.addColorStop(.42, 'rgba(105,157,139,.22)');
    voidGlow.addColorStop(1, 'rgba(5,14,12,0)');
    og.fillStyle = voidGlow;
    og.fillRect(8, 93, 112, 160);
    // door swung inward, one bright edge
    og.fillStyle = '#7b2e2c';
    og.beginPath();
    og.moveTo(14, 249);
    og.lineTo(14, 100);
    og.lineTo(54, 112);
    og.lineTo(54, 243);
    og.closePath();
    og.fill();
    og.fillStyle = 'rgba(26,49,41,.8)';
    og.beginPath();
    og.moveTo(92, 249);
    og.lineTo(120, 225);
    og.lineTo(120, 121);
    og.lineTo(92, 100);
    og.closePath();
    og.fill();
    og.fillStyle = 'rgba(225,238,208,.8)';
    og.fillRect(54, 112, 2, 131);
    og.fillStyle = 'rgba(227,191,158,.55)';
    og.fillRect(86, 177, 4, 3);
    og.fillStyle = 'rgba(114,174,151,.35)';
    og.fillRect(8, 251, 112, 2);

    // pillar
    const pillar = makeCanvas(128, 256);
    const pg = pillar.getContext('2d');
    paintTiles(pg, mulberry32(3001));
    const edge = pg.createLinearGradient(0, 0, 128, 0);
    edge.addColorStop(0, 'rgba(13,28,23,.48)');
    edge.addColorStop(.13, 'rgba(20,36,30,.1)');
    edge.addColorStop(.5, 'rgba(255,255,240,.06)');
    edge.addColorStop(.87, 'rgba(20,36,30,.12)');
    edge.addColorStop(1, 'rgba(11,26,21,.55)');
    pg.fillStyle = edge;
    pg.fillRect(0, 0, 128, 256);
    pg.fillStyle = 'rgba(47,89,77,.54)';
    pg.fillRect(0, 214, 128, 11);
    pg.fillStyle = 'rgba(221,224,200,.26)';
    pg.fillRect(0, 225, 128, 2);
    pg.fillStyle = 'rgba(25,39,31,.5)';
    pg.fillRect(0, 236, 128, 20);

    // service door
    const service = makeCanvas(128, 256);
    const sg = service.getContext('2d');
    paintTiles(sg, mulberry32(8823), false);
    sg.fillStyle = '#4e5f52';
    sg.fillRect(15, 100, 98, 150);
    sg.fillStyle = '#687b69';
    sg.fillRect(20, 105, 88, 140);
    sg.fillStyle = '#556856';
    sg.fillRect(28, 115, 72, 42);
    sg.fillRect(28, 166, 72, 66);
    sg.fillStyle = 'rgba(225,230,207,.5)';
    sg.fillRect(42, 136, 44, 2);
    sg.fillStyle = 'rgba(22,38,31,.55)';
    sg.fillRect(71, 194, 25, 4);
    sg.fillStyle = '#c3cdb6';
    sg.font = '6px "Cascadia Mono", monospace';
    sg.textAlign = 'center';
    sg.fillText('STAFF ONLY', 64, 152);
    sg.fillStyle = 'rgba(117,151,128,.2)';
    sg.fillRect(20, 238, 88, 10);

    return { tile, win, door, doorOpen, pillar, service };
  }

  // ---------------- sprites ----------------
  function makeChairSprite() {
    const c = makeCanvas(96, 192);
    const g = c.getContext('2d');
    const rnd = mulberry32(661);
    g.clearRect(0, 0, 96, 192);
    g.fillStyle = 'rgba(4,14,12,.28)';
    g.beginPath();
    g.ellipse(51, 184, 33, 6, 0, 0, TAU);
    g.fill();

    g.lineCap = 'round';
    g.lineJoin = 'round';
    // rear legs
    g.strokeStyle = '#a8b1a0';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(30, 179); g.lineTo(38, 62); g.stroke();
    g.beginPath(); g.moveTo(69, 179); g.lineTo(61, 62); g.stroke();
    // front ladder legs
    g.strokeStyle = '#d7d8c4';
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(23, 181); g.lineTo(31, 79); g.stroke();
    g.beginPath(); g.moveTo(77, 181); g.lineTo(69, 79); g.stroke();
    // braces
    g.strokeStyle = 'rgba(174,182,165,.8)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(25, 158); g.lineTo(73, 169); g.stroke();
    g.beginPath(); g.moveTo(73, 158); g.lineTo(25, 169); g.stroke();
    // ladder rungs
    for (let i = 0; i < 4; i++) {
      const y = 143 - i * 16;
      g.strokeStyle = '#c7cbb9';
      g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(28 + i * 1.8, y); g.lineTo(72 - i * 1.8, y + 3); g.stroke();
    }
    // seat
    g.fillStyle = '#8f3b37';
    g.fillRect(25, 77, 49, 8);
    g.fillStyle = 'rgba(238,190,166,.4)';
    g.fillRect(27, 78, 45, 1.5);
    g.fillStyle = '#6e2929';
    g.fillRect(29, 85, 41, 3);
    // back
    g.fillStyle = '#7d332f';
    g.fillRect(28, 33, 44, 7);
    g.fillRect(24, 52, 48, 7);
    g.fillStyle = 'rgba(239,191,166,.35)';
    g.fillRect(29, 34, 42, 1.5);
    g.fillRect(25, 53, 46, 1.5);
    g.strokeStyle = '#c8cbb9';
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(30, 70); g.lineTo(28, 34); g.stroke();
    g.beginPath(); g.moveTo(70, 70); g.lineTo(72, 34); g.stroke();
    // safety ring hanging
    g.strokeStyle = 'rgba(210,111,93,.85)';
    g.lineWidth = 4;
    g.beginPath(); g.arc(80, 94, 8, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(234,229,205,.7)';
    g.lineWidth = 1.5;
    g.beginPath(); g.arc(80, 94, 8, -0.7, 0.8); g.stroke();
    // wear
    for (let i = 0; i < 28; i++) {
      g.fillStyle = rnd() > 0.5 ? 'rgba(81,66,48,.3)' : 'rgba(235,235,215,.22)';
      g.fillRect(22 + rnd() * 56, 38 + rnd() * 135, 1, 1);
    }
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(52,91,79,.06)';
    g.fillRect(0, 0, 96, 192);
    return c;
  }

  function makeLockerSprite() {
    const c = makeCanvas(152, 194);
    const g = c.getContext('2d');
    const rnd = mulberry32(7117);
    g.clearRect(0, 0, 152, 194);
    g.fillStyle = 'rgba(3,12,10,.26)';
    g.beginPath(); g.ellipse(76, 190, 65, 6, 0, 0, TAU); g.fill();

    // bank frame
    g.fillStyle = '#526255';
    g.fillRect(6, 8, 140, 180);
    g.fillStyle = '#6f806d';
    g.fillRect(9, 11, 134, 172);
    const numbers = [14, 15, 16, 17, 18, 19, 20, 21, 22];
    let idx = 0;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = 12 + col * 43;
        const y = 15 + row * 55;
        const w = 39, h = 50;
        if (numbers[idx] === 17) {
          // dark, open locker
          g.fillStyle = '#0a1512';
          g.fillRect(x, y, w, h);
          const glow = g.createLinearGradient(x, y, x + w, y + h);
          glow.addColorStop(0, 'rgba(105,164,143,.16)');
          glow.addColorStop(1, 'rgba(4,14,11,0)');
          g.fillStyle = glow;
          g.fillRect(x, y, w, h);
          // hanger + empty swimsuit shape
          g.strokeStyle = 'rgba(206,217,198,.38)';
          g.lineWidth = 1;
          g.beginPath(); g.moveTo(x + 19, y + 8); g.lineTo(x + 9, y + 18); g.lineTo(x + 29, y + 18); g.closePath(); g.stroke();
          g.fillStyle = 'rgba(207,211,191,.28)';
          g.beginPath();
          g.moveTo(x + 12, y + 19);
          g.lineTo(x + 27, y + 19);
          g.lineTo(x + 25, y + 35);
          g.lineTo(x + 14, y + 35);
          g.closePath();
          g.fill();
          // open door edge
          g.fillStyle = '#849279';
          g.fillRect(x + w - 3, y, 3, h);
          g.fillStyle = 'rgba(215,220,199,.45)';
          g.fillRect(x, y + h - 1, w, 1);
        } else {
          g.fillStyle = '#778772';
          g.fillRect(x, y, w, h);
          g.fillStyle = 'rgba(29,43,35,.35)';
          g.fillRect(x + 3, y + 3, w - 6, h - 6);
          g.fillStyle = 'rgba(127,143,119,.8)';
          g.fillRect(x + 7, y + 7, w - 14, h - 14);
          // vents
          g.fillStyle = 'rgba(35,53,42,.42)';
          for (let v = 0; v < 3; v++) g.fillRect(x + 10, y + 10 + v * 3, 12, 1);
          // handle
          g.fillStyle = 'rgba(214,216,194,.6)';
          g.fillRect(x + w - 9, y + 27, 5, 1.5);
          g.fillStyle = 'rgba(26,41,33,.4)';
          g.font = '6px "Cascadia Mono", monospace';
          g.textAlign = 'center';
          g.fillText(String(numbers[idx]), x + w / 2, y + 41);
        }
        idx++;
      }
    }
    // header
    g.fillStyle = '#2d4036';
    g.fillRect(9, 11, 134, 8);
    g.fillStyle = 'rgba(210,218,198,.44)';
    g.font = '5px "Cascadia Mono", monospace';
    g.textAlign = 'left';
    g.fillText('LOCKERS / 更衣室', 13, 17);
    // rust and dripping
    for (let i = 0; i < 34; i++) {
      const x = 10 + rnd() * 130;
      const y = 20 + rnd() * 158;
      g.fillStyle = rnd() > .5 ? 'rgba(99,64,38,.25)' : 'rgba(224,225,201,.18)';
      g.fillRect(x, y, 1, 1 + rnd() * 3);
    }
    const damp = g.createLinearGradient(0, 138, 0, 188);
    damp.addColorStop(0, 'rgba(26,49,40,0)');
    damp.addColorStop(1, 'rgba(23,48,39,.42)');
    g.fillStyle = damp;
    g.fillRect(9, 138, 134, 50);
    return c;
  }

  function makePhoneSprite() {
    const c = makeCanvas(82, 64);
    const g = c.getContext('2d');
    g.clearRect(0, 0, 82, 64);
    g.fillStyle = 'rgba(2,15,13,.28)';
    g.beginPath(); g.ellipse(42, 55, 30, 5, 0, 0, TAU); g.fill();
    // cord
    g.strokeStyle = 'rgba(97,39,36,.9)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(20, 45);
    g.bezierCurveTo(5, 48, 8, 62, 26, 58);
    g.bezierCurveTo(43, 54, 28, 50, 40, 49);
    g.stroke();
    // base
    g.fillStyle = '#8f3733';
    g.beginPath();
    g.ellipse(42, 45, 26, 12, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#a7443d';
    g.beginPath();
    g.ellipse(42, 43, 24, 10, 0, 0, TAU);
    g.fill();
    // dial
    g.fillStyle = '#d7c7a7';
    g.beginPath(); g.arc(42, 43, 7, 0, TAU); g.fill();
    g.fillStyle = '#70433a';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      g.beginPath();
      g.arc(42 + Math.cos(a) * 4.4, 43 + Math.sin(a) * 4.4, 0.8, 0, TAU);
      g.fill();
    }
    // handset
    g.strokeStyle = '#6e2926';
    g.lineWidth = 8;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(21, 31);
    g.quadraticCurveTo(42, 21, 62, 31);
    g.stroke();
    g.strokeStyle = '#b94f45';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(21, 31);
    g.quadraticCurveTo(42, 21, 62, 31);
    g.stroke();
    g.fillStyle = '#b94b42';
    g.beginPath(); g.ellipse(20, 33, 7, 5, -.3, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(63, 33, 7, 5, .3, 0, TAU); g.fill();
    // bubbles
    g.strokeStyle = 'rgba(166,221,204,.55)';
    g.lineWidth = 1;
    [[12, 12, 2], [70, 18, 1.6], [62, 8, 1.1], [8, 28, 1.2]].forEach(([x, y, r]) => {
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    });
    // underwater cyan cast
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(47,123,111,.22)';
    g.fillRect(0, 0, 82, 64);
    return c;
  }

  function makeLadderSprite() {
    const c = makeCanvas(52, 100);
    const g = c.getContext('2d');
    g.clearRect(0, 0, 52, 100);
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(167,180,168,.82)';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(16, 96); g.lineTo(16, 31); g.bezierCurveTo(16, 16, 36, 16, 36, 31); g.lineTo(36, 96); g.stroke();
    g.strokeStyle = 'rgba(235,238,219,.68)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(14, 96); g.lineTo(14, 31); g.bezierCurveTo(14, 14, 38, 14, 38, 31); g.lineTo(38, 96); g.stroke();
    g.strokeStyle = 'rgba(154,168,155,.65)';
    g.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const y = 45 + i * 17;
      g.beginPath(); g.moveTo(17, y); g.lineTo(35, y); g.stroke();
    }
    g.fillStyle = 'rgba(3,16,13,.32)';
    g.beginPath(); g.ellipse(26, 96, 20, 3, 0, 0, TAU); g.fill();
    return c;
  }

  function makeRingSprite() {
    const c = makeCanvas(64, 64);
    const g = c.getContext('2d');
    g.clearRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(2,16,13,.2)';
    g.beginPath(); g.ellipse(32, 52, 24, 5, 0, 0, TAU); g.fill();
    g.lineWidth = 10;
    g.strokeStyle = '#c3554b';
    g.beginPath(); g.arc(32, 33, 19, 0, TAU); g.stroke();
    g.strokeStyle = '#ded9bf';
    g.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const a0 = i / 4 * TAU + .1;
      g.beginPath(); g.arc(32, 33, 19, a0, a0 + .55); g.stroke();
    }
    g.strokeStyle = 'rgba(235,227,200,.55)';
    g.lineWidth = 1;
    g.beginPath(); g.arc(32, 33, 24, 0, TAU); g.stroke();
    return c;
  }

  function makeSignSprite() {
    const c = makeCanvas(256, 84);
    const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 84);
    g.fillStyle = 'rgba(10,34,28,.92)';
    g.fillRect(4, 4, 248, 76);
    g.strokeStyle = 'rgba(169,196,168,.5)';
    g.lineWidth = 1;
    g.strokeRect(8, 8, 240, 68);
    g.fillStyle = 'rgba(206,221,193,.9)';
    g.textAlign = 'center';
    g.font = '500 29px "Songti SC","STSong","SimSun",serif';
    g.fillText('深  水  区', 128, 42);
    g.fillStyle = 'rgba(147,178,154,.7)';
    g.font = '9px "Cascadia Mono",monospace';
    g.fillText('DEEP END  /  2.2 M', 128, 61);
    g.fillStyle = 'rgba(180,71,67,.9)';
    g.fillRect(112, 48, 32, 2);
    return c;
  }

  function makeClockSprite() {
    const c = makeCanvas(96, 68);
    const g = c.getContext('2d');
    g.clearRect(0, 0, 96, 68);
    g.fillStyle = 'rgba(5,18,15,.34)';
    g.beginPath(); g.ellipse(48, 61, 33, 4, 0, 0, TAU); g.fill();
    g.fillStyle = '#3f5146';
    g.beginPath(); g.arc(48, 32, 24, 0, TAU); g.fill();
    g.fillStyle = '#c7caba';
    g.beginPath(); g.arc(48, 32, 20, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(68,83,69,.8)';
    g.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      g.beginPath();
      g.moveTo(48 + Math.cos(a) * 17, 32 + Math.sin(a) * 17);
      g.lineTo(48 + Math.cos(a) * 19, 32 + Math.sin(a) * 19);
      g.stroke();
    }
    g.strokeStyle = '#353b32';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(48, 32); g.lineTo(48 + Math.cos(-1.3) * 11, 32 + Math.sin(-1.3) * 11); g.stroke();
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(48, 32); g.lineTo(48 + Math.cos(-0.35) * 15, 32 + Math.sin(-0.35) * 15); g.stroke();
    g.fillStyle = '#6e2726';
    g.beginPath(); g.arc(48, 32, 2, 0, TAU); g.fill();
    g.fillStyle = 'rgba(230,231,215,.55)';
    g.font = '5px "Cascadia Mono",monospace';
    g.textAlign = 'center';
    g.fillText('03:17', 48, 57);
    return c;
  }

  function makeBalloonSprite() {
    const c = makeCanvas(66, 220);
    const g = c.getContext('2d');
    g.clearRect(0, 0, 66, 220);
    // string
    g.strokeStyle = 'rgba(223,220,196,.42)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(34, 58);
    g.bezierCurveTo(24, 100, 45, 135, 34, 171);
    g.bezierCurveTo(28, 190, 40, 204, 36, 218);
    g.stroke();
    // balloon
    const grad = g.createRadialGradient(26, 22, 4, 33, 36, 31);
    grad.addColorStop(0, '#d96d63');
    grad.addColorStop(.55, '#a73732');
    grad.addColorStop(1, '#6c2424');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(33, 35, 23, 28, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#7e2b28';
    g.beginPath();
    g.moveTo(27, 60); g.lineTo(39, 60); g.lineTo(33, 69); g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,221,201,.23)';
    g.beginPath(); g.ellipse(24, 22, 6, 10, -.55, 0, TAU); g.fill();
    return c;
  }

  function makeWatcherSprite() {
    const c = makeCanvas(72, 190);
    const g = c.getContext('2d');
    g.clearRect(0, 0, 72, 190);
    const grad = g.createLinearGradient(0, 0, 0, 190);
    grad.addColorStop(0, 'rgba(5,14,12,.86)');
    grad.addColorStop(.65, 'rgba(4,12,10,.9)');
    grad.addColorStop(1, 'rgba(4,12,10,.1)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(36, 28, 10, 13, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(28, 43);
    g.bezierCurveTo(19, 68, 17, 112, 23, 173);
    g.lineTo(33, 181);
    g.lineTo(37, 118);
    g.lineTo(41, 181);
    g.lineTo(51, 173);
    g.bezierCurveTo(56, 110, 53, 68, 45, 43);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(188,216,197,.28)';
    g.fillRect(31, 23, 2, 2);
    g.fillRect(40, 23, 2, 2);
    return c;
  }

  function makeGlowSprite(r, g, b) {
    const c = makeCanvas(128, 128);
    const x = c.getContext('2d');
    const grad = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, `rgba(${r},${g},${b},.62)`);
    grad.addColorStop(.22, `rgba(${r},${g},${b},.26)`);
    grad.addColorStop(.6, `rgba(${r},${g},${b},.055)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = grad;
    x.fillRect(0, 0, 128, 128);
    return c;
  }

  function makeBuoySprite(color) {
    const c = makeCanvas(32, 22);
    const g = c.getContext('2d');
    g.clearRect(0, 0, 32, 22);
    const grad = g.createLinearGradient(0, 2, 0, 20);
    if (color === 'red') {
      grad.addColorStop(0, '#e5c6a4');
      grad.addColorStop(.2, '#bc5147');
      grad.addColorStop(.8, '#8f312e');
      grad.addColorStop(1, '#5e2625');
    } else {
      grad.addColorStop(0, '#f0ead2');
      grad.addColorStop(.2, '#d5d2b7');
      grad.addColorStop(.8, '#a7ad98');
      grad.addColorStop(1, '#697c70');
    }
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(16, 11, 14, 8, 0, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,244,.3)';
    g.beginPath();
    g.ellipse(12, 7, 5, 2, -.2, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(49,83,73,.48)';
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(16, 14, 14, 4, 0, 0, Math.PI);
    g.stroke();
    return c;
  }

  const WALLS = buildWallTextures();
  const SPR = {
    chair: makeChairSprite(),
    lockers: makeLockerSprite(),
    phone: makePhoneSprite(),
    ladder: makeLadderSprite(),
    ring: makeRingSprite(),
    sign: makeSignSprite(),
    clock: makeClockSprite(),
    balloon: makeBalloonSprite(),
    watcher: makeWatcherSprite(),
    glowTeal: makeGlowSprite(124, 221, 196),
    glowRed: makeGlowSprite(213, 102, 91),
    glowWarm: makeGlowSprite(231, 221, 181),
    buoyRed: makeBuoySprite('red'),
    buoyWhite: makeBuoySprite('white')
  };

  // static objects in the world
  const STATIC_SPRITES = [
    { tex: SPR.chair, x: 21.45, y: 21.9, w: 1.22, h: 2.44, elev: 0, alpha: 1 },
    { tex: SPR.lockers, x: 1.32, y: 12.15, w: 1.95, h: 2.48, elev: 0, alpha: 1 },
    { tex: SPR.phone, x: 8.25, y: 15.0, w: 0.82, h: 0.56, elev: 0.02, alpha: 0.9 },
    { tex: SPR.ladder, x: 19.15, y: 18.65, w: 0.62, h: 1.04, elev: 0.03, alpha: .9 },
    { tex: SPR.ring, x: 16.15, y: 10.45, w: 0.7, h: 0.66, elev: 0.04, alpha: .9 },
    { tex: SPR.sign, x: 13.0, y: 2.5, w: 2.4, h: 0.78, elev: 3.14, alpha: .92 },
    { tex: SPR.clock, x: 24.2, y: 8.6, w: 1.02, h: 0.7, elev: 3.18, alpha: .88 }
  ];

  // lane buoys
  const LANE_SPRITES = [];
  for (let l = 0; l < 4; l++) {
    const lx = 8.55 + l * 2.65;
    for (let i = 0; i < 14; i++) {
      const ly = 8.85 + i * 0.8;
      LANE_SPRITES.push({
        tex: i % 2 ? SPR.buoyWhite : SPR.buoyRed,
        x: lx,
        y: ly,
        w: 0.29,
        h: 0.18,
        elev: 0.035,
        alpha: .95
      });
    }
  }

  // precomputed caustics, kept cheap enough for low-fi rendering
  const CAUSTIC_SIZE = 128;
  const CAUSTIC_MASK = CAUSTIC_SIZE - 1;
  const CAUSTIC = new Float32Array(CAUSTIC_SIZE * CAUSTIC_SIZE);
  for (let cy = 0; cy < CAUSTIC_SIZE; cy++) {
    const v = cy / CAUSTIC_SIZE * TAU;
    for (let cx = 0; cx < CAUSTIC_SIZE; cx++) {
      const u = cx / CAUSTIC_SIZE * TAU;
      const a = Math.sin(u * 2 + v * 3);
      const b = Math.sin(u * 5 - v * 4 + a * 0.9);
      const c = Math.sin(u * 9 + v * 7 + b * 0.55);
      let k = Math.max(0, a * b * 0.72 + b * c * 0.45);
      k = k * k;
      CAUSTIC[cy * CAUSTIC_SIZE + cx] = k;
    }
  }

  const FLOOR_DUST = Array.from({ length: 46 }, (_, i) => {
    const rnd = mulberry32(200 + i * 17);
    return {
      x: rnd(),
      y: rnd(),
      s: .3 + rnd() * 1.2,
      vx: (rnd() - .5) * .0025,
      vy: -.001 - rnd() * .0022,
      phase: rnd() * TAU,
      a: .025 + rnd() * .075
    };
  });

  // ---------------- renderer sizing ----------------
  let W = 1, H = 1, focal = 1, planeLen = 1;
  let sceneImage = null;
  let sceneData = null;
  let zBuffer = null;

  function resize() {
    const aspect = Math.min(2.08, Math.max(0.62, window.innerWidth / window.innerHeight));
    let bw, bh;
    if (aspect < 1) {
      bw = IS_TOUCH ? 188 : 232;
      bh = Math.round(bw / aspect);
    } else {
      bh = IS_TOUCH ? 164 : 200;
      bw = Math.round(bh * aspect);
    }
    const maxPixels = IS_TOUCH ? 56000 : 76000;
    const scale = Math.min(1, Math.sqrt(maxPixels / (bw * bh)));
    W = Math.max(180, Math.round(bw * scale));
    H = Math.max(180, Math.round(bh * scale));
    canvas.width = W;
    canvas.height = H;

    const vfov = aspect < 0.9 ? 78 : aspect < 1.35 ? 68 : 56;
    focal = H / (2 * Math.tan(vfov * Math.PI / 360));
    planeLen = W / (2 * focal);
    sceneImage = ctx.createImageData(W, H);
    sceneData = sceneImage.data;
    zBuffer = new Float32Array(W);
    ctx.imageSmoothingEnabled = false;
  }

  // ---------------- light ----------------
  function getLightLevels(now) {
    const levels = new Array(LIGHT_COUNT);
    for (let i = 0; i < LIGHT_COUNT; i++) {
      let v = 0.84 + 0.075 * Math.sin(now * 0.0017 + i * 1.93);
      if (i === 2) {
        const p = now % 9400;
        if (p > 8020) v *= 0.16;
      }
      if (i === 4) {
        v *= 0.9 + 0.07 * Math.sin(now * 0.00037 + 1.1);
      }
      if (now < state.flickerUntil && (i === 1 || i === 3)) v *= 0.18;
      if (state.act2) v *= 0.82;
      levels[i] = v;
    }
    return levels;
  }

  // ---------------- planes: water, tile, ceiling ----------------
  function renderPlanes(t, now, dirX, dirY, planeX, planeY, eye, horizon, levels) {
    const data = sceneData;
    // pre-fill the horizon line / any impossible gaps
    for (let i = 0; i < data.length; i += 4) {
      data[i] = FOG_R;
      data[i + 1] = FOG_G;
      data[i + 2] = FOG_B;
      data[i + 3] = 255;
    }

    const ceilEnd = Math.max(0, Math.min(H, Math.ceil(horizon)));
    const fogLimit = 38;
    const ceilSampleEnd = Math.max(0, Math.min(ceilEnd, Math.ceil(horizon - (CEILING - eye) * focal / fogLimit)));
    const floorSampleStart = Math.min(H, Math.max(Math.floor(horizon) + 1, Math.floor(horizon + eye * focal / fogLimit)));

    // ---- ceiling ----
    for (let y = 0; y < ceilSampleEnd; y++) {
      const dy = horizon - y;
      if (dy < 0.55) continue;
      const dist = (CEILING - eye) * focal / dy;
      if (dist <= 0 || !Number.isFinite(dist)) continue;
      let wx = state.x + (dirX - planeX) * dist;
      let wy = state.y + (dirY - planeY) * dist;
      const stepX = (2 * planeX / W) * dist;
      const stepY = (2 * planeY / W) * dist;
      const fog = Math.min(1, 1 - Math.exp(-dist * 0.054));
      const fogMul = fog * 0.84;
      let p = (y * W) << 2;

      for (let x = 0; x < W; x++, wx += stepX, wy += stepY, p += 4) {
        const n = hash2(Math.floor(wx * 0.83) + 12, Math.floor(wy * 0.83) + 37);
        let rr = 154 + n * 12;
        let gg = 156 + n * 12;
        let bb = 144 + n * 9;

        const px = ((wx % 2) + 2) % 2;
        const py = ((wy % 2) + 2) % 2;
        if (px < 0.032 || py < 0.032) {
          rr -= 42; gg -= 40; bb -= 33;
        }

        if (n > 0.91) {
          rr -= 11; gg -= 8; bb -= 4;
        }

        // long, humming fluorescent tubes
        if (wy > 3.1 && wy < 27.4) {
          const idxf = (wx - LIGHT_START) / LIGHT_GAP;
          const idx = Math.max(0, Math.min(LIGHT_COUNT - 1, Math.round(idxf)));
          const center = LIGHT_START + idx * LIGHT_GAP;
          const dx = wx - center;
          if (Math.abs(dx) < 1.28) {
            const lev = levels[idx];
            if (Math.abs(dx) < 0.17) {
              const housing = Math.abs(dx) < 0.065 ? 0.42 : 0.7;
              const target = 247 * lev;
              rr += (target - rr) * housing;
              gg += (target - gg) * housing;
              bb += (target - bb) * housing;
            } else {
              const glow = Math.max(0, 1 - Math.abs(dx) / 1.28);
              const g2 = glow * glow * 0.36 * lev;
              rr += (225 - rr) * g2;
              gg += (226 - gg) * g2;
              bb += (211 - bb) * g2;
            }
          }
        }

        // an almost-sky, seen through the roof
        const sdx = wx - 13.0;
        const sdy = wy - 14.0;
        const sr = sdx * sdx + sdy * sdy;
        if (sr < 16.2) {
          if (sr > 13.6) {
            rr = 68; gg = 81; bb = 75;
            if (sr > 15.2) { rr += 22; gg += 21; bb += 17; }
          } else {
            const cloud = Math.sin(wx * 0.81 + t * 0.06) * 0.5 + Math.sin(wy * 1.07 - t * 0.04) * 0.5;
            const v = 201 + cloud * 7 + n * 5;
            rr = v - 1;
            gg = v + 2;
            bb = v - 8;
            if (n > 0.91) { rr -= 9; gg -= 8; bb -= 6; }
          }
        }

        if (state.act2) {
          rr *= 0.89;
          gg *= 0.9;
          bb *= 0.92;
        }

        const dither = ((x + y) & 1) ? 0.6 : -0.6;
        rr = rr + (FOG_R - rr) * fogMul + dither;
        gg = gg + (FOG_G - gg) * fogMul + dither;
        bb = bb + (FOG_B - bb) * fogMul + dither;
        data[p] = rr < 0 ? 0 : rr > 255 ? 255 : rr;
        data[p + 1] = gg < 0 ? 0 : gg > 255 ? 255 : gg;
        data[p + 2] = bb < 0 ? 0 : bb > 255 ? 255 : bb;
      }
    }

    // ---- floor / deck / water ----
    for (let y = floorSampleStart; y < H; y++) {
      const dy = y - horizon;
      if (dy < 0.55) continue;
      const dist = eye * focal / dy;
      if (dist <= 0 || !Number.isFinite(dist)) continue;
      let wx = state.x + (dirX - planeX) * dist;
      let wy = state.y + (dirY - planeY) * dist;
      const stepX = (2 * planeX / W) * dist;
      const stepY = (2 * planeY / W) * dist;
      const fog = Math.min(1, 1 - Math.exp(-dist * 0.059));
      const fogMul = fog * 0.9;
      let p = (y * W) << 2;

      for (let x = 0; x < W; x++, wx += stepX, wy += stepY, p += 4) {
        let rr, gg, bb;
        const inPool = wx > POOL.x1 && wx < POOL.x2 && wy > POOL.y1 && wy < POOL.y2;

        if (inPool) {
          const edge = Math.min(wx - POOL.x1, POOL.x2 - wx, wy - POOL.y1, POOL.y2 - wy);
          if (edge < 0.17) {
            // wet coping, dark green stone
            const n = hash2(Math.floor(wx * 6) + 3, Math.floor(wy * 6) + 7);
            rr = 44 + n * 18;
            gg = 73 + n * 17;
            bb = 70 + n * 16;
          } else {
            const cx = Math.floor(wx * 13.0 + t * 19.0) & CAUSTIC_MASK;
            const cy = Math.floor(wy * 13.0 + t * 12.0) & CAUSTIC_MASK;
            const ca = CAUSTIC[(cy << 7) | cx];

            let refl = 0;
            const idxf = (wx - LIGHT_START) / LIGHT_GAP;
            const idx = Math.max(0, Math.min(LIGHT_COUNT - 1, Math.round(idxf)));
            const center = LIGHT_START + idx * LIGHT_GAP;
            const wobble = Math.sin(wy * 2.1 + t * 1.9) * (0.06 + dist * 0.002);
            const dxL = wx - (center + wobble);
            const spread = 0.34 + dist * 0.012;
            const rl = Math.max(0, 1 - Math.abs(dxL) / spread);
            refl += rl * rl * levels[idx] * 0.62;

            const sdx = wx - 13.0;
            const sdy = wy - 14.0;
            const sky = Math.max(0, 1 - (sdx * sdx + sdy * sdy) / 38);
            refl += sky * 0.38;

            const fres = Math.min(1, dist / 14);
            rr = 19 + fres * 19 + ca * 68 + refl * 43;
            gg = 55 + fres * 24 + ca * 98 + refl * 61;
            bb = 57 + fres * 26 + ca * 85 + refl * 55;

            const murk = hash2(Math.floor(wx * 2.2) + 8, Math.floor(wy * 2.2) + 17);
            rr += (murk - 0.5) * 5;
            gg += (murk - 0.5) * 5;
            bb += (murk - 0.5) * 4;

            // a lane rope remembered by the water
            const laneD = Math.min(
              Math.abs(wx - 8.55),
              Math.abs(wx - 11.2),
              Math.abs(wx - 13.85),
              Math.abs(wx - 16.5)
            );
            if (laneD < 0.035) {
              const dash = Math.sin(wy * 13.5 + 0.5) > -0.15 ? 1 : 0.35;
              rr += 7 * dash;
              gg += 21 * dash;
              bb += 16 * dash;
            }

            if (state.inWater) {
              const dxp = wx - state.x;
              const dyp = wy - state.y;
              const rd = Math.sqrt(dxp * dxp + dyp * dyp);
              const wave = (t * 1.25) % 3.6;
              const ring = Math.max(0, 1 - Math.abs(rd - wave) / 0.42) * Math.max(0, 1 - rd / 5.5);
              if (ring > 0) {
                rr += ring * 25;
                gg += ring * 37;
                bb += ring * 33;
              }
            }

            if (state.act2) {
              rr *= 0.8;
              gg *= 0.84;
              bb *= 0.86;
            }
          }
        } else {
          // deck tiles
          const tile = 0.53;
          const tx = wx / tile;
          const ty = wy / tile;
          const ix = Math.floor(tx);
          const iy = Math.floor(ty);
          const fx = tx - ix;
          const fy = ty - iy;
          const n = hash2(ix, iy);
          const seam = fx < 0.032 || fx > 0.968 || fy < 0.032 || fy > 0.968;

          rr = 147 + n * 24;
          gg = 151 + n * 25;
          bb = 137 + n * 19;

          if (seam) {
            rr -= 32; gg -= 31; bb -= 25;
          }
          if (n > 0.955) {
            rr -= 16; gg -= 13; bb -= 8;
          } else if (n < 0.035) {
            rr += 8; gg += 7; bb += 5;
          }

          if (n > 0.865) {
            rr *= 0.92;
            gg *= 0.93;
            bb *= 0.93;
          }

          // damp ring around the water
          const ddx = Math.max(POOL.x1 - wx, 0, wx - POOL.x2);
          const ddy = Math.max(POOL.y1 - wy, 0, wy - POOL.y2);
          const poolDist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (poolDist < 1.25) {
            const damp = (1 - poolDist / 1.25) * 0.12;
            rr -= 9 * damp;
            gg -= 3 * damp;
            bb += 7 * damp;
          }

          // the brass drain, north of the pool
          const dxd = wx - 13.0;
          const dyd = wy - 7.15;
          const dr = Math.sqrt(dxd * dxd + dyd * dyd);
          if (dr < 0.43) {
            if (dr < 0.33) {
              const ang = Math.atan2(dyd, dxd);
              const grate = Math.sin(ang * 13) > 0.15 ? 0.62 : 1;
              rr = (33 + (hash2(Math.floor(wx * 11), Math.floor(wy * 11)) * 11)) * grate;
              gg = (41 + (hash2(Math.floor(wx * 12), Math.floor(wy * 12)) * 12)) * grate;
              bb = (37 + (hash2(Math.floor(wx * 13), Math.floor(wy * 13)) * 10)) * grate;
            } else {
              rr = 102; gg = 110; bb = 94;
            }
          }
        }

        const dither = ((x + y) & 1) ? 0.55 : -0.55;
        rr = rr + (FOG_R - rr) * fogMul + dither;
        gg = gg + (FOG_G - gg) * fogMul + dither;
        bb = bb + (FOG_B - bb) * fogMul + dither;
        data[p] = rr < 0 ? 0 : rr > 255 ? 255 : rr;
        data[p + 1] = gg < 0 ? 0 : gg > 255 ? 255 : gg;
        data[p + 2] = bb < 0 ? 0 : bb > 255 ? 255 : bb;
      }
    }
  }

  // ---------------- walls ----------------
  function renderWalls(dirX, dirY, planeX, planeY, eye, horizon) {
    ctx.imageSmoothingEnabled = false;
    for (let x = 0; x < W; x++) {
      const cameraX = 2 * x / W - 1;
      const rayX = dirX + planeX * cameraX;
      const rayY = dirY + planeY * cameraX;

      let mapX = Math.floor(state.x);
      let mapY = Math.floor(state.y);
      const deltaX = rayX === 0 ? 1e30 : Math.abs(1 / rayX);
      const deltaY = rayY === 0 ? 1e30 : Math.abs(1 / rayY);
      let stepX, stepY, sideX, sideY;

      if (rayX < 0) {
        stepX = -1;
        sideX = (state.x - mapX) * deltaX;
      } else {
        stepX = 1;
        sideX = (mapX + 1 - state.x) * deltaX;
      }
      if (rayY < 0) {
        stepY = -1;
        sideY = (state.y - mapY) * deltaY;
      } else {
        stepY = 1;
        sideY = (mapY + 1 - state.y) * deltaY;
      }

      let side = 0;
      let hitType = 0;
      let steps = 0;
      while (steps < 80) {
        if (sideX < sideY) {
          sideX += deltaX;
          mapX += stepX;
          side = 0;
        } else {
          sideY += deltaY;
          mapY += stepY;
          side = 1;
        }
        if (mapY < 0 || mapY >= MAP_H || mapX < 0 || mapX >= MAP_W) break;
        hitType = map[mapY][mapX];
        if (hitType !== 0) break;
        steps++;
      }

      if (!hitType) {
        zBuffer[x] = 64;
        continue;
      }

      let perp;
      if (side === 0) perp = (mapX - state.x + (1 - stepX) / 2) / rayX;
      else perp = (mapY - state.y + (1 - stepY) / 2) / rayY;
      perp = Math.max(0.03, perp);
      zBuffer[x] = perp;

      let wallX;
      if (side === 0) wallX = state.y + perp * rayY;
      else wallX = state.x + perp * rayX;
      wallX -= Math.floor(wallX);

      let tex;
      if (hitType === 4) tex = state.doorUnlocked ? WALLS.doorOpen : WALLS.door;
      else if (hitType === 3) tex = WALLS.win;
      else if (hitType === 2) tex = WALLS.pillar;
      else if (hitType === 5) tex = WALLS.service;
      else tex = WALLS.tile;

      let texX = Math.floor(wallX * tex.width);
      if ((side === 0 && rayX > 0) || (side === 1 && rayY < 0)) {
        texX = tex.width - texX - 1;
      }
      if (texX < 0) texX = 0;
      if (texX >= tex.width) texX = tex.width - 1;

      const yTop = horizon - (CEILING - eye) * focal / perp;
      const yBottom = horizon + eye * focal / perp;
      const lineHeight = yBottom - yTop;

      if (yBottom > 0 && yTop < H && lineHeight > 0) {
        ctx.globalAlpha = 1;
        ctx.drawImage(tex, texX, 0, 1, tex.height, x, yTop, 1.02, lineHeight);

        if (side === 1) {
          ctx.fillStyle = 'rgba(7,20,17,.13)';
          ctx.fillRect(x, Math.max(0, yTop), 1.02, Math.min(H, yBottom) - Math.max(0, yTop));
        }

        const fog = Math.min(0.9, 1 - Math.exp(-perp * 0.082));
        if (fog > 0.008) {
          ctx.fillStyle = `rgba(${FOG_R},${FOG_G},${FOG_B},${(fog * 0.84).toFixed(3)})`;
          const top = Math.max(0, yTop);
          const bot = Math.min(H, yBottom);
          if (bot > top) ctx.fillRect(x, top, 1.02, bot - top);
        }
      }
    }
  }

  // ---------------- sprites ----------------
  function projectSprites(cam, now) {
    const list = [];
    const invDet = 1 / (cam.planeX * cam.dirY - cam.dirX * cam.planeY);

    const add = (s, extra) => {
      const dx = s.x - state.x;
      const dy = s.y - state.y;
      const tx = invDet * (cam.dirY * dx - cam.dirX * dy);
      const ty = invDet * (-cam.planeY * dx + cam.planeX * dy);
      if (ty <= 0.14) return;
      const sx = (W / 2) * (1 + tx / ty);
      const width = (s.w || .4) * focal / ty;
      const height = (s.h || .4) * focal / ty;
      if (sx + width / 2 < -4 || sx - width / 2 > W + 4) return;
      const baseY = cam.horizon + (cam.eye - (s.elev || 0)) * focal / ty;
      const topY = baseY - height;
      if (baseY < -4 || topY > H + 4) return;
      let fade = 1;
      if (ty > 7) fade = Math.max(0.34, 1 - (ty - 7) / 35);
      fade *= (s.alpha === undefined ? 1 : s.alpha);
      list.push({
        tex: s.tex,
        x: sx,
        top: topY,
        bottom: baseY,
        width,
        height,
        depth: ty,
        alpha: fade,
        blend: extra?.blend || 'source-over',
        glow: !!extra?.glow
      });
    };

    for (const s of STATIC_SPRITES) add(s);
    for (const s of LANE_SPRITES) add(s);

    if (now < state.watcherUntil) {
      add({
        tex: SPR.watcher,
        x: 13.0,
        y: 3.55,
        w: 0.8,
        h: 2.38,
        elev: 0,
        alpha: 0.78
      });
    }

    // objects animate slightly in the unmoving air
    add({
      tex: SPR.balloon,
      x: 10.1 + Math.sin(now * 0.00037) * 0.06,
      y: 5.8 + Math.cos(now * 0.00029) * 0.04,
      w: 0.72,
      h: 2.4,
      elev: 1.05,
      alpha: 0.9
    });

    list.sort((a, b) => b.depth - a.depth);

    const glows = [];
    for (const h of HOTSPOTS) {
      if (h.id !== 'door' && state.memories.has(h.id)) continue;
      let alpha;
      let tex;
      if (h.id === 'door') {
        tex = SPR.glowRed;
        alpha = state.doorUnlocked ? 0.76 + 0.16 * Math.sin(now * 0.0032) : 0.25 + 0.04 * Math.sin(now * 0.0017);
      } else {
        tex = SPR.glowTeal;
        alpha = 0.3 + 0.1 * Math.sin(now * 0.0021 + h.x);
        if (state.nearest && state.nearest.id === h.id) alpha += 0.13;
      }
      const isDrain = h.id === 'drain';
      const glowSize = h.id === 'door' ? 1.95 : isDrain ? 0.92 : 1.05;
      const draw = {
        tex,
        x: h.x,
        y: h.y,
        w: glowSize,
        h: glowSize,
        elev: h.id === 'phone' ? 0.16 : isDrain ? 0.46 : 1.28,
        alpha: isDrain ? alpha * 0.78 : alpha
      };
      const before = list.length;
      add(draw, { blend: 'lighter', glow: true });
      if (list.length > before) {
        const g = list.pop();
        glows.push(g);
      }
    }

    return { solids: list, glows };
  }

  function drawProjectedSprite(s) {
    const tex = s.tex;
    if (!tex) return;
    const w = s.width;
    const h = s.height;
    if (w < 0.55 || h < 0.55) return;
    const left = s.x - w / 2;
    const right = left + w;
    const sx0 = Math.max(0, Math.floor(left));
    const sx1 = Math.min(W, Math.ceil(right));
    if (sx1 <= sx0) return;
    if (s.top > H || s.bottom < 0) return;

    let fullyVisible = true;
    for (let x = sx0; x < sx1; x++) {
      if (zBuffer[x] < s.depth) { fullyVisible = false; break; }
    }

    ctx.globalAlpha = Math.min(1, Math.max(0, s.alpha));
    ctx.globalCompositeOperation = s.blend || 'source-over';
    if (fullyVisible) {
      ctx.drawImage(tex, left, s.top, w, h);
    } else {
      for (let x = sx0; x < sx1; x++) {
        if (zBuffer[x] < s.depth) continue;
        const u = (x - left) / w;
        if (u < 0 || u >= 1) continue;
        const srcX = Math.floor(u * tex.width);
        const srcW = Math.max(1, tex.width / w * 1.15);
        ctx.drawImage(tex, srcX, 0, Math.min(srcW, tex.width - srcX), tex.height, x, s.top, 1.04, h);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawDust(now) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of FLOOR_DUST) {
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
      if (p.x < -0.02) p.x = 1.02;
      if (p.x > 1.02) p.x = -0.02;
      const twinkle = 0.6 + 0.4 * Math.sin(now * 0.0011 + p.phase);
      ctx.globalAlpha = p.a * twinkle;
      ctx.fillStyle = '#e8edd9';
      const dx = Math.round(p.x * W);
      const dy = Math.round(p.y * H);
      ctx.fillRect(dx, dy, p.s, p.s);
    }
    ctx.restore();
  }

  function drawScene(now) {
    const t = now * 0.001;
    const dirX = Math.cos(state.angle);
    const dirY = Math.sin(state.angle);
    const planeX = -dirY * planeLen;
    const planeY = dirX * planeLen;
    const eye = state.eyeSmooth + state.bob;
    let horizon = H * 0.5 + Math.tan(state.pitch) * focal;
    if (now < state.glitchUntil) horizon += (Math.random() - 0.5) * 5;
    const levels = getLightLevels(now);

    renderPlanes(t, now, dirX, dirY, planeX, planeY, eye, horizon, levels);
    ctx.putImageData(sceneImage, 0, 0);
    ctx.imageSmoothingEnabled = false;

    renderWalls(dirX, dirY, planeX, planeY, eye, horizon);

    const projected = projectSprites({ dirX, dirY, planeX, planeY, eye, horizon }, now);
    for (const s of projected.solids) drawProjectedSprite(s);
    for (const s of projected.glows) drawProjectedSprite(s);

    drawDust(now);
  }

  // ---------------- audio ----------------
  const AUD = {
    ctx: null,
    master: null,
    echo: null,
    noiseBuffer: null,
    initialised: false,
    droneNodes: []
  };

  function makeNoiseBuffer(ac) {
    const seconds = 2.4;
    const len = Math.floor(ac.sampleRate * seconds);
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function initAudio() {
    if (AUD.initialised) {
      if (AUD.ctx && AUD.ctx.state === 'suspended') AUD.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      state.muted = true;
      updateSoundButton();
      return;
    }
    try {
      const ac = new AC();
      const master = ac.createGain();
      master.gain.value = 0.29;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 18;
      comp.ratio.value = 3;
      comp.attack.value = 0.012;
      comp.release.value = 0.3;
      master.connect(comp);
      comp.connect(ac.destination);

      const echo = ac.createDelay(1.4);
      echo.delayTime.value = 0.43;
      const feedback = ac.createGain();
      feedback.gain.value = 0.22;
      const echoWet = ac.createGain();
      echoWet.gain.value = 0.23;
      echo.connect(feedback);
      feedback.connect(echo);
      echo.connect(echoWet);
      echoWet.connect(master);

      AUD.ctx = ac;
      AUD.master = master;
      AUD.echo = echo;
      AUD.noiseBuffer = makeNoiseBuffer(ac);

      // low room drone
      const droneBus = ac.createGain();
      droneBus.gain.value = 0.5;
      droneBus.connect(master);

      const droneFilter = ac.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 210;
      droneFilter.Q.value = 1.2;
      droneFilter.connect(droneBus);

      [[55, 0.045, 'sine'], [82.41, 0.024, 'triangle'], [110, 0.011, 'sine']].forEach(([freq, gain, type], i) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = i === 1 ? -7 : i === 2 ? 5 : 0;
        g.gain.value = gain;
        osc.connect(g);
        g.connect(droneFilter);
        osc.start();
        AUD.droneNodes.push(osc);
      });

      // very slow filter breathing
      const lfo = ac.createOscillator();
      const lfoGain = ac.createGain();
      lfo.frequency.value = 0.037;
      lfoGain.gain.value = 45;
      lfo.connect(lfoGain);
      lfoGain.connect(droneFilter.frequency);
      lfo.start();
      AUD.droneNodes.push(lfo);

      // ventilation / distant water
      const noise = ac.createBufferSource();
      noise.buffer = AUD.noiseBuffer;
      noise.loop = true;
      const nf = ac.createBiquadFilter();
      nf.type = 'lowpass';
      nf.frequency.value = 440;
      nf.Q.value = 0.55;
      const ng = ac.createGain();
      ng.gain.value = 0.022;
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(master);
      noise.start();

      // fluorescent hum, barely there
      const hum = ac.createOscillator();
      const humGain = ac.createGain();
      hum.type = 'sine';
      hum.frequency.value = 100;
      humGain.gain.value = 0.0045;
      hum.connect(humGain);
      humGain.connect(master);
      hum.start();
      AUD.droneNodes.push(hum);

      AUD.initialised = true;
      state.audioReady = true;
      applyVolume();
    } catch (err) {
      console.warn('Pool audio unavailable', err);
      state.audioReady = false;
      state.muted = true;
      updateSoundButton();
    }
  }

  function applyVolume() {
    if (!AUD.ctx || !AUD.master) return;
    const target = state.muted ? 0.0001 : 0.29;
    AUD.master.gain.setTargetAtTime(target, AUD.ctx.currentTime, 0.08);
  }

  function updateSoundButton() {
    if (!soundButton) return;
    soundButton.textContent = state.muted ? '静' : '声';
    soundButton.classList.toggle('is-off', state.muted);
    soundButton.setAttribute('aria-label', state.muted ? '开启声音' : '关闭声音');
  }

  function toggleSound() {
    if (!state.audioReady) initAudio();
    state.muted = !state.muted;
    applyVolume();
    updateSoundButton();
    showCaption(state.muted ? '声音已关闭。' : '声音已开启。', 1400);
    if (!state.muted) sndUI();
  }

  function sndTone(freq, dur = 0.4, gain = 0.02, type = 'sine', endFreq = null, when = 0, echo = false) {
    if (!AUD.ctx) return;
    const ac = AUD.ctx;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(AUD.master);
    if (echo && AUD.echo) {
      const send = ac.createGain();
      send.gain.value = 0.28;
      g.connect(send);
      send.connect(AUD.echo);
    }
    osc.start(t0);
    osc.stop(t0 + dur + 0.08);
  }

  function sndNoise(dur = 0.4, freq = 900, gain = 0.04, type = 'bandpass', when = 0) {
    if (!AUD.ctx || !AUD.noiseBuffer) return;
    const ac = AUD.ctx;
    const t0 = ac.currentTime + when;
    const src = ac.createBufferSource();
    src.buffer = AUD.noiseBuffer;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = 0.7;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(AUD.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  const SND = {
    ui() { sndTone(560, 0.1, 0.009, 'sine', 500, 0, true); },
    drip() {
      sndTone(1350, 0.14, 0.008, 'sine', 520, 0, true);
      sndNoise(0.08, 1200, 0.006, 'bandpass', 0.015);
    },
    step(water) {
      if (water) {
        sndNoise(0.13, 540, 0.022, 'bandpass');
        sndNoise(0.22, 160, 0.009, 'lowpass', 0.03);
        sndTone(210 + Math.random() * 90, 0.1, 0.005, 'sine', 130, 0, false);
      } else {
        sndNoise(0.055, 260, 0.018, 'lowpass');
        sndNoise(0.08, 1200, 0.004, 'bandpass', 0.01);
      }
    },
    splash() {
      sndNoise(0.45, 560, 0.055, 'bandpass');
      sndNoise(0.7, 190, 0.025, 'lowpass', 0.02);
      sndTone(105, 0.24, 0.018, 'sine', 60);
    },
    memory() {
      [392, 523.25, 659.25].forEach((f, i) => {
        sndTone(f, 1.4, 0.016, 'sine', null, i * 0.14, true);
      });
      sndNoise(0.5, 2200, 0.008, 'highpass', 0.03);
    },
    phone() {
      for (let i = 0; i < 4; i++) {
        sndTone(740, 0.14, 0.012, 'sine', null, i * 0.2, true);
        sndTone(620, 0.14, 0.007, 'sine', null, i * 0.2 + 0.02, true);
      }
    },
    door() {
      sndTone(72, 0.9, 0.032, 'sine', 48);
      sndNoise(0.28, 160, 0.03, 'lowpass');
    },
    unlock() {
      sndTone(95, 1.1, 0.038, 'sine', 58);
      sndNoise(0.1, 2400, 0.025, 'highpass');
      sndNoise(0.55, 330, 0.018, 'bandpass', 0.12);
      sndTone(1046.5, 1.8, 0.006, 'sine', null, 0.3, true);
    },
    broadcast() {
      sndTone(880, 0.08, 0.01, 'sine');
      sndTone(660, 0.1, 0.007, 'sine', null, 0.12);
      sndNoise(0.18, 2600, 0.008, 'highpass', 0.03);
    },
    glitch() {
      sndNoise(0.12, 1900, 0.014, 'highpass');
      sndTone(70, 0.15, 0.008, 'square', 50);
    },
    final() {
      sndTone(55, 3.4, 0.055, 'sine', 32);
      sndTone(82.4, 2.6, 0.025, 'triangle', 41);
      sndNoise(1.3, 180, 0.03, 'lowpass');
      sndNoise(0.7, 2200, 0.012, 'highpass', 0.08);
      sndTone(660, 2.5, 0.007, 'sine', 330, 0.35, true);
    },
    leave() {
      [196, 246.94, 293.66].forEach((f, i) => {
        sndTone(f, 3.4, 0.015, 'sine', null, i * 0.24, true);
      });
      sndTone(392, 3.8, 0.008, 'triangle', null, 0.75, true);
      sndNoise(1.8, 760, 0.01, 'highpass', 0.05);
    }
  };

  // ---------------- ambient UI ----------------
  let captionTimer = 0;
  let toastTimer = 0;
  let broadcastTimer = 0;
  let glitchTimer = 0;
  let shakeTimer = 0;
  let updateFxTimer = 0;

  function showCaption(text, ms = 4300) {
    clearTimeout(captionTimer);
    captionEl.textContent = text;
    captionEl.classList.add('show');
    captionTimer = setTimeout(() => captionEl.classList.remove('show'), ms);
  }

  function showToast(text, ms = 3000) {
    clearTimeout(toastTimer);
    toastMain.textContent = text;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  function showBroadcast(text, ms = 5700) {
    clearTimeout(broadcastTimer);
    broadcastText.textContent = text;
    broadcastEl.classList.remove('show');
    void broadcastEl.offsetWidth;
    broadcastEl.classList.add('show');
    SND.broadcast();
    broadcastTimer = setTimeout(() => broadcastEl.classList.remove('show'), ms);
  }

  function triggerGlitch(ms = 260, shake = true) {
    if (!state.started) return;
    state.glitchUntil = performance.now() + ms;
    glitchBars.classList.remove('on');
    void glitchBars.offsetWidth;
    glitchBars.classList.add('on');
    SND.glitch();
    clearTimeout(glitchTimer);
    glitchTimer = setTimeout(() => glitchBars.classList.remove('on'), Math.max(300, ms));
    if (shake) {
      stage.classList.remove('is-shaking');
      void stage.offsetWidth;
      stage.classList.add('is-shaking');
      clearTimeout(shakeTimer);
      shakeTimer = setTimeout(() => stage.classList.remove('is-shaking'), 320);
    }
  }

  function flashScreen() {
    flash.classList.remove('pulse');
    void flash.offsetWidth;
    flash.classList.add('pulse');
    clearTimeout(updateFxTimer);
    updateFxTimer = setTimeout(() => flash.classList.remove('pulse'), 950);
  }

  function updateHudTime(now) {
    if (now - state.lastTimecode < 480) return;
    state.lastTimecode = now;
    if (!state.started) {
      timecodeEl.textContent = 'REC ● 00:00:00';
      return;
    }
    const total = Math.max(0, Math.floor((now - state.startedAt) / 1000));
    const mm = String(Math.floor(total / 60) % 60).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    timecodeEl.textContent = `REC ● 00:${mm}:${ss}`;
  }

  function updateMemoryUi() {
    const n = state.memories.size;
    memoryCount.textContent = String(n);
    memoryDots.forEach((dot, i) => dot.classList.toggle('on', i < n));
    if (n >= 4) {
      objectiveText.textContent = state.doorUnlocked ? '那扇红门已经打开' : '门锁正在松开';
    } else {
      objectiveText.textContent = n === 0 ? '寻找四段记忆，推开红门' : `还差 ${4 - n} 段记忆`;
    }
  }

  // ---------------- dialogue ----------------
  const dlg = {
    active: false,
    lines: [],
    index: 0,
    full: '',
    shown: 0,
    acc: 0,
    typing: false,
    onDone: null,
    auto: false,
    autoDelay: 1.6,
    autoWait: 0,
    choices: null,
    choicesShown: false,
    choiceWait: 0,
    onChoice: null,
    speed: 30
  };

  function openDialog(kicker, lines, onDone = null, count = 'SIGNAL / —', options = {}) {
    dlg.active = true;
    dlg.lines = lines;
    dlg.index = 0;
    dlg.onDone = onDone;
    dlg.typing = true;
    dlg.shown = 0;
    dlg.acc = 0;
    dlg.auto = !!options.auto;
    dlg.autoDelay = options.autoDelay === undefined ? 1.15 : options.autoDelay;
    dlg.autoWait = 0;
    dlg.speed = dlg.auto ? 42 : 30;
    dlg.choices = options.choices || null;
    dlg.choicesShown = false;
    dlg.choiceWait = 0;
    dlg.onChoice = options.onChoice || null;
    state.dialogOpen = true;
    clearKeys();
    document.body.classList.add('dialog-open');
    promptEl.classList.remove('show');
    touchAct.classList.remove('show');
    promptProgressBar.style.width = '0%';
    dialogKicker.textContent = kicker;
    dialogCount.textContent = count;
    dialogEl.classList.add('open');
    dialogEl.classList.toggle('is-call', dlg.auto);
    dialogEl.classList.toggle('is-choice', !!dlg.choices);
    dialogEl.setAttribute('aria-hidden', 'false');
    dialogNext.classList.remove('show');
    dialogChoices.classList.remove('show');
    dialogChoices.innerHTML = '';
    setDialogLine(0);
    if (!dlg.auto) SND.ui();
  }

  function setDialogLine(index) {
    dlg.index = index;
    dlg.full = dlg.lines[index] || '';
    dlg.shown = 0;
    dlg.acc = 0;
    dlg.typing = true;
    dlg.autoWait = 0;
    dlg.choiceWait = 0;
    dlg.choicesShown = false;
    dialogText.textContent = '';
    dialogNext.classList.remove('show');
    dialogChoices.classList.remove('show');
    dialogChoices.innerHTML = '';
  }

  function updateDialog(dt) {
    if (!dlg.active) return;

    if (dlg.typing) {
      dlg.acc += dt * dlg.speed;
      const n = Math.min(dlg.full.length, Math.floor(dlg.acc));
      if (n !== dlg.shown) {
        dlg.shown = n;
        dialogText.textContent = dlg.full.slice(0, n);
      }
      if (n >= dlg.full.length) {
        dlg.typing = false;
        if (dlg.auto) {
          dlg.autoWait = 0;
        } else if (dlg.choices && dlg.index === dlg.lines.length - 1) {
          dlg.choiceWait = 0;
        } else {
          dialogNext.classList.add('show');
        }
      }
      return;
    }

    if (dlg.auto) {
      dlg.autoWait += dt;
      if (dlg.autoWait >= dlg.autoDelay) {
        dlg.autoWait = 0;
        if (dlg.index < dlg.lines.length - 1) setDialogLine(dlg.index + 1);
        else closeDialog();
      }
      return;
    }

    if (dlg.choices && dlg.index === dlg.lines.length - 1 && !dlg.choicesShown) {
      dlg.choiceWait += dt;
      if (dlg.choiceWait > 0.8) showChoices();
    }
  }

  function showChoices() {
    if (!dlg.active || !dlg.choices || dlg.choicesShown) return;
    dlg.choicesShown = true;
    dialogNext.classList.remove('show');
    dialogChoices.innerHTML = dlg.choices
      .map(c => `<button type="button" data-choice="${c.id}">${c.label}</button>`)
      .join('');
    dialogChoices.classList.add('show');
    const first = dialogChoices.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }

  function chooseDialogOption(id) {
    if (!dlg.active || !dlg.choicesShown) return;
    const handler = dlg.onChoice;
    dlg.onChoice = null;
    dlg.onDone = null;
    SND.ui();
    closeDialog(false);
    setTimeout(() => {
      if (typeof handler === 'function') handler(id);
    }, 300);
  }

  function advanceDialog() {
    if (!dlg.active || dlg.auto) return;
    if (dlg.typing) {
      dlg.typing = false;
      dlg.shown = dlg.full.length;
      dialogText.textContent = dlg.full;
      if (dlg.choices && dlg.index === dlg.lines.length - 1) {
        dlg.choiceWait = 0;
      } else {
        dialogNext.classList.add('show');
      }
      SND.ui();
      return;
    }
    if (dlg.choicesShown) return;
    if (dlg.index < dlg.lines.length - 1) {
      setDialogLine(dlg.index + 1);
      SND.ui();
    } else if (dlg.choices) {
      showChoices();
    } else {
      closeDialog();
    }
  }

  function closeDialog(runCallback = true) {
    if (!dlg.active) return;
    const callback = dlg.onDone;
    dlg.active = false;
    dlg.onDone = null;
    dlg.onChoice = null;
    dlg.auto = false;
    dlg.choices = null;
    dlg.choicesShown = false;
    state.dialogOpen = false;
    document.body.classList.remove('dialog-open');
    dialogEl.classList.remove('open', 'is-call', 'is-choice');
    dialogEl.setAttribute('aria-hidden', 'true');
    dialogNext.classList.remove('show');
    dialogChoices.classList.remove('show');
    dialogChoices.innerHTML = '';
    if (promptProgressBar) promptProgressBar.style.width = '0%';
    setTimeout(() => {
      if (runCallback && typeof callback === 'function') callback();
    }, 260);
  }

  // ---------------- interactions ----------------
  function isSolid(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
    return map[Math.floor(y)][Math.floor(x)] !== 0;
  }

  function canStand(x, y) {
    const r = 0.238;
    if (isSolid(x - r, y - r) || isSolid(x + r, y - r) || isSolid(x - r, y + r) || isSolid(x + r, y + r)) {
      return false;
    }
    const chairDx = x - 21.45;
    const chairDy = y - 21.9;
    if (chairDx * chairDx + chairDy * chairDy < 0.34) return false;
    if (x < 2.15 && y > 11.05 && y < 13.25) return false;
    return true;
  }

  function lineOfSight(tx, ty) {
    const dx = tx - state.x;
    const dy = ty - state.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.4) return true;
    const steps = Math.ceil(dist / 0.23);
    for (let i = 1; i < steps; i++) {
      const k = (i / steps) * 0.88;
      if (isSolid(state.x + dx * k, state.y + dy * k)) return false;
    }
    return true;
  }

  function updateNearest() {
    if (!state.started || state.dialogOpen || state.ending || state.cutscene || state.inputLocked) {
      setNearest(null);
      return;
    }
    const dirX = Math.cos(state.angle);
    const dirY = Math.sin(state.angle);
    let best = null;
    let bestScore = Infinity;

    for (const h of HOTSPOTS) {
      if (h.id !== 'door' && state.memories.has(h.id)) continue;
      const dx = h.x - state.x;
      const dy = h.y - state.y;
      const d = Math.hypot(dx, dy);
      if (d > h.radius) continue;
      if (d > 1.6) {
        const dot = (dx * dirX + dy * dirY) / Math.max(0.001, d);
        if (dot < 0.18) continue;
      }
      if (h.id !== 'door' && !lineOfSight(h.x, h.y)) continue;
      if (d < bestScore) {
        bestScore = d;
        best = h;
      }
    }
    setNearest(best);
  }

  function setNearest(h) {
    const key = h ? `${h.id}:${state.inWater}:${state.doorUnlocked}` : '';
    state.nearest = h;
    if (key === state.nearestKey) return;
    state.nearestKey = key;

    if (!h) {
      promptEl.classList.remove('show', 'is-door', 'is-hint', 'is-auto', 'is-dwell', 'is-gaze');
      reticle.classList.remove('hot');
      touchAct.classList.remove('show');
      state.dwellTime = 0;
      state.gazeTime = 0;
      promptProgressBar.style.width = '0%';
      return;
    }

    let label = h.prompt;
    let isHint = false;
    if (h.id === 'door') {
      label = state.doorUnlocked ? '推开红门' : '查看红门';
    } else if (h.id === 'phone' && !state.inWater) {
      label = '走进水里 · 接电话';
      isHint = true;
    } else if (h.id === 'chair') {
      label = '抬头看向椅子';
    } else if (h.id === 'drain') {
      label = '站上排水口 · 保持不动';
    }

    promptText.textContent = label;
    const isAuto = h.mode === 'dwell';
    promptEl.classList.toggle('is-door', h.id === 'door' && state.doorUnlocked);
    promptEl.classList.toggle('is-hint', isHint);
    promptEl.classList.toggle('is-auto', isAuto);
    promptEl.classList.toggle('is-dwell', isAuto);
    promptEl.classList.toggle('is-gaze', h.mode === 'gaze');
    promptEl.classList.add('show');
    reticle.classList.add('hot');
    promptProgressBar.style.width = '0%';

    if (isAuto) {
      touchAct.classList.remove('show');
    } else {
      touchAct.classList.add('show');
      touchAct.textContent = h.id === 'door' && state.doorUnlocked
        ? '推门'
        : h.mode === 'gaze'
          ? '抬头'
          : '触碰';
    }
  }

  function updateSpecialTriggers(dt) {
    const h = state.nearest;
    if (!h || state.dialogOpen || state.ending || state.cutscene) {
      state.dwellTime = 0;
      state.gazeTime = 0;
      promptProgressBar.style.width = '0%';
      return;
    }

    if (h.mode === 'dwell') {
      const d = Math.hypot(state.x - h.x, state.y - h.y);
      if (d < 1.02 && state.speed < 0.14) {
        state.dwellTime = Math.min(2.0, state.dwellTime + dt);
      } else {
        state.dwellTime = Math.max(0, state.dwellTime - dt * 2.4);
      }
      const progress = Math.min(1, state.dwellTime / 1.65);
      promptProgressBar.style.width = `${(progress * 100).toFixed(1)}%`;
      promptText.textContent = state.dwellTime > 0.08
        ? '保持不动…'
        : '站上排水口 · 保持不动';
      if (progress >= 1) {
        state.dwellTime = 0;
        promptProgressBar.style.width = '0%';
        triggerMemory(h);
        return;
      }
    } else {
      state.dwellTime = Math.max(0, state.dwellTime - dt * 5);
      promptProgressBar.style.width = '0%';
    }

    if (h.mode === 'gaze') {
      if (state.pitch > 0.16) {
        state.gazeTime = Math.min(1.2, state.gazeTime + dt);
      } else {
        state.gazeTime = Math.max(0, state.gazeTime - dt * 3);
      }
      promptText.textContent = state.pitch > 0.1
        ? '再抬高一点…'
        : '抬头看向椅子';
      if (state.gazeTime >= 0.55) {
        state.gazeTime = 0;
        triggerMemory(h);
      }
    } else {
      state.gazeTime = 0;
    }
  }

  function triggerMemory(h) {
    if (!h || state.dialogOpen || state.ending || state.cutscene || state.inputLocked) return;
    if (h.id !== 'door' && state.memories.has(h.id)) return;
    const nextIndex = state.memories.size + 1;

    if (h.mode === 'call') {
      SND.phone();
      openDialog(h.label, h.lines, () => collectMemory(h), 'CALL / INCOMING', {
        auto: true,
        autoDelay: 1.2
      });
      return;
    }

    openDialog(h.label, h.lines, () => collectMemory(h), `MEMORY / ${String(nextIndex).padStart(2, '0')} OF 04`);
  }

  function interact() {
    if (!state.started || state.ending || state.cutscene || state.inputLocked) return;
    if (state.dialogOpen) {
      advanceDialog();
      return;
    }
    const h = state.nearest;
    if (!h) return;

    if (h.id === 'phone' && !state.inWater) {
      SND.ui();
      openDialog('池底 / 信号', [
        '电话沉在水面下。它还在响。',
        '你必须走进池子里，才能碰到它。'
      ], null, 'SIGNAL / —');
      return;
    }

    if (h.id === 'drain') {
      SND.drip();
      showCaption('格栅下面有人在数数。站上排水口，别动。', 3600);
      return;
    }

    if (h.mode === 'gaze') {
      state.lookTarget = 0.34;
      triggerMemory(h);
      return;
    }

    if (h.id === 'door') {
      if (!state.doorUnlocked) {
        SND.door();
        openDialog('出口 / 红门', DOOR_LOCKED_LINES, null, `MEMORY / ${String(state.memories.size).padStart(2, '0')} OF 04`);
      } else {
        SND.door();
        state.cutscene = true;
        openDialog('出口 / 红门', DOOR_OPEN_LINES, () => {
          if (!state.ending) state.cutscene = false;
        }, 'MEMORY / 04 OF 04', {
          choices: [
            { id: 'stay', label: '留 下' },
            { id: 'leave', label: '醒 过 来' }
          ],
          onChoice: choice => startEnding(choice)
        });
      }
      return;
    }

    triggerMemory(h);
  }

  function collectMemory(h) {
    if (state.memories.has(h.id)) return;
    state.memories.add(h.id);
    updateMemoryUi();
    const n = state.memories.size;
    showToast(`记忆 ${String(n).padStart(2, '0')} · ${h.memoryName}`);
    SND.memory();
    triggerGlitch(300, true);
    flashScreen();
    state.flickerUntil = performance.now() + 1800;

    if (h.id === 'chair') {
      showCaption('高处的灯闪了一下。', 3600);
    } else if (h.id === 'lockers') {
      showCaption('柜门在你身后轻轻合上。', 3800);
    } else if (h.id === 'phone') {
      showCaption('水面下，铃声停了。', 3600);
    } else if (h.id === 'drain') {
      showCaption('排水口停止了呼吸。', 3600);
    }

    if (n === 1) {
      setTimeout(() => {
        if (!state.ending && !state.dialogOpen) {
          state.watcherUntil = performance.now() + 420;
          SND.drip();
        }
      }, 1200);
    }

    if (n >= 4) {
      setTimeout(unlockDoor, 900);
    }
  }

  function unlockDoor() {
    if (state.doorUnlocked) return;
    state.doorUnlocked = true;
    state.act2 = true;
    document.body.classList.add('memory-complete', 'act2');
    updateMemoryUi();
    showCaption('很远的地方，一声锁响。', 5600);
    SND.unlock();
    triggerGlitch(600, true);
    flashScreen();
    state.flickerUntil = performance.now() + 3000;
    setTimeout(() => {
      if (!state.dialogOpen && !state.ending) {
        showBroadcast('出口已开放。请留在池中等待。', 6500);
      }
      state.watcherUntil = performance.now() + 300;
    }, 2600);
  }

  function startEnding(choice = 'stay') {
    if (state.ending) return;
    const data = ENDINGS[choice] || ENDINGS.stay;
    state.ending = true;
    state.endingChoice = choice;
    state.cutscene = true;
    state.speed = 0;

    endingKicker.textContent = data.kicker;
    endingTitle.textContent = data.title;
    endingEn.textContent = data.en;
    endingCopy.innerHTML = data.copy;
    endingMeta.innerHTML = data.meta.map(item => `<span>${item}</span>`).join('');
    againButton.textContent = data.button;
    endingScreen.dataset.ending = choice;

    document.body.classList.add('ending');
    document.body.classList.toggle('ending-leave', choice === 'leave');
    promptEl.classList.remove('show');
    touchAct.classList.remove('show');
    dialogEl.classList.remove('open');
    if (choice === 'leave') SND.leave();
    else SND.final();
    triggerGlitch(1100, true);
    flashScreen();
    setTimeout(() => {
      endingScreen.classList.remove('is-hidden');
      endingScreen.setAttribute('aria-hidden', 'false');
    }, 1250);
  }

  function startExperience() {
    if (state.started) return;
    state.started = true;
    state.startedAt = performance.now();
    state.inputLocked = true;
    state.x = 13.0;
    state.y = 26.15;
    state.angle = -Math.PI / 2;
    state.pitch = 0.012;
    state.lookTarget = null;
    state.dwellTime = 0;
    state.gazeTime = 0;
    document.body.classList.add('started');
    titleScreen.classList.add('is-hidden');
    initAudio();
    updateSoundButton();
    state.nextBroadcastAt = state.startedAt + 28000;
    state.nextAnomalyAt = state.startedAt + 11000;
    state.nextDripAt = state.startedAt + 7000;
    state.nextPhoneRingAt = state.startedAt + 5000;
    state.lastTimecode = 0;
    SND.broadcast();
    setTimeout(() => {
      openDialog('泳池 / 03:17', INTRO_LINES, () => {
        state.inputLocked = false;
        showCaption(IS_TOUCH
          ? '拖动画面环顾 · 左侧摇杆移动 · 靠近事物后触碰'
          : '拖动环顾 · WASD 移动 · 靠近事物后按 E', 7000);
      }, 'SIGNAL / 00');
    }, 1150);
  }

  // ---------------- movement / input ----------------
  const keys = new Set();
  const joy = { active: false, id: null, x: 0, y: 0, cx: 0, cy: 0, radius: 38 };
  let dragging = false;
  let dragId = null;
  let lastPointerX = 0;
  let lastPointerY = 0;

  function clearKeys() {
    keys.clear();
  }

  function tryMove(dx, dy) {
    if (!dx && !dy) return false;
    let moved = false;
    if (canStand(state.x + dx, state.y)) {
      state.x += dx;
      moved = true;
    }
    if (canStand(state.x, state.y + dy)) {
      state.y += dy;
      moved = true;
    }
    return moved;
  }

  function updatePlayer(dt, now) {
    const inDialog = state.dialogOpen || state.inputLocked || state.cutscene || state.ending;
    let f = 0;
    let s = 0;

    if (!inDialog) {
      if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1;
      f += joy.y;
      s += joy.x;
    }

    const mag = Math.hypot(f, s);
    if (mag > 1) {
      f /= mag;
      s /= mag;
    }
    const inputMag = Math.min(1, mag);
    const slower = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const maxSpeed = (state.inWater ? 1.34 : 2.12) * (slower ? 0.52 : 1);
    const targetSpeed = inputMag * maxSpeed;
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 11);

    if (inputMag > 0.02 && state.speed > 0.03) {
      const dirX = Math.cos(state.angle);
      const dirY = Math.sin(state.angle);
      const rightX = -dirY;
      const rightY = dirX;
      const forward = f / Math.max(1, mag);
      const side = s / Math.max(1, mag);
      const dx = (dirX * forward + rightX * side) * state.speed * dt;
      const dy = (dirY * forward + rightY * side) * state.speed * dt;
      tryMove(dx, dy);
    }

    if (state.lookTarget !== null) {
      const diff = state.lookTarget - state.pitch;
      if (Math.abs(diff) < 0.003) {
        state.pitch = state.lookTarget;
        state.lookTarget = null;
      } else {
        state.pitch += diff * Math.min(1, dt * 5.4);
      }
    }

    const wasInWater = state.inWater;
    const nowInWater = state.x > POOL.x1 && state.x < POOL.x2 && state.y > POOL.y1 && state.y < POOL.y2;
    if (nowInWater !== wasInWater) {
      state.inWater = nowInWater;
      document.body.classList.toggle('wading', nowInWater);
      if (nowInWater) {
        SND.splash();
        if (!state.hasEnteredWater) {
          state.hasEnteredWater = true;
          showCaption('水漫过膝盖。比你记忆里更深。', 5200);
        }
      } else {
        SND.step(false);
      }
      state.nearestKey = '';
    }

    const targetEye = state.inWater ? EYE_WATER : EYE_DECK;
    state.eyeSmooth += (targetEye - state.eyeSmooth) * Math.min(1, dt * 5.2);

    const moving = state.speed > 0.16;
    state.bobPhase += dt * (moving ? (state.inWater ? 9.4 : 7.1) : 1.1);
    const amp = moving ? (state.inWater ? 0.031 : 0.019) : 0.006;
    state.bob += (Math.sin(state.bobPhase) * amp - state.bob) * Math.min(1, dt * 10);

    state.stepTimer -= dt;
    if (moving && state.stepTimer <= 0) {
      SND.step(state.inWater);
      state.stepTimer = state.inWater ? 0.47 : 0.6;
    } else if (!moving && state.stepTimer < 0) {
      state.stepTimer = 0;
    }

    if (!state.started) {
      state.bob = Math.sin(now * 0.0012) * 0.004;
    }
  }

  function maybeAmbient(now) {
    if (!state.started || state.dialogOpen || state.ending || state.cutscene) return;

    if (now > state.nextBroadcastAt) {
      let pool;
      if (state.memories.size >= 4) pool = BROADCASTS_LATE;
      else if (state.memories.size >= 2) pool = BROADCASTS_MID;
      else pool = BROADCASTS_EARLY;
      const text = pool[Math.floor(Math.random() * pool.length)];
      showBroadcast(text);
      state.nextBroadcastAt = now + 26000 + Math.random() * 24000;
    }

    if (now > state.nextAnomalyAt) {
      const r = Math.random();
      if (r < 0.58) {
        triggerGlitch(130 + Math.random() * 240, r < 0.24);
      } else if (r < 0.78 && state.memories.size >= 2) {
        state.watcherUntil = now + 230;
        triggerGlitch(180, false);
      } else {
        SND.drip();
      }
      state.nextAnomalyAt = now + 12000 + Math.random() * 19000;
    }

    if (state.audioReady && now > state.nextDripAt) {
      SND.drip();
      state.nextDripAt = now + 6500 + Math.random() * 12000;
    }

    if (!state.memories.has('phone')) {
      const dPhone = Math.hypot(state.x - 8.25, state.y - 15.0);
      if (dPhone < 6 && now > state.nextPhoneRingAt) {
        SND.phone();
        state.nextPhoneRingAt = now + 10500;
      }
    }
  }

  // ---------------- events ----------------
  function onKeyDown(e) {
    if (e.code === 'KeyE') {
      if (!state.started) return;
      e.preventDefault();
      if (e.repeat) return;
      if (state.dialogOpen) advanceDialog();
      else interact();
      return;
    }
    if (e.code === 'Escape') {
      if (state.dialogOpen) {
        e.preventDefault();
        closeDialog();
      }
      return;
    }
    if (e.code === 'KeyM') {
      if (e.repeat) return;
      if (state.started) {
        e.preventDefault();
        toggleSound();
      }
      return;
    }
    if (!state.started) {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        startExperience();
      }
      return;
    }
    if (state.dialogOpen || state.ending || state.cutscene) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
      e.preventDefault();
      keys.add(e.code);
    }
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function updateJoystick(e) {
    const dx = e.clientX - joy.cx;
    const dy = e.clientY - joy.cy;
    const len = Math.hypot(dx, dy);
    const r = joy.radius;
    const nx = len > r ? dx / len * r : dx;
    const ny = len > r ? dy / len * r : dy;
    joystickKnob.style.transform = `translate(${nx}px, ${ny}px)`;
    joy.x = nx / r;
    joy.y = -ny / r;
  }

  function bindEvents() {
    startButton.addEventListener('click', e => {
      e.stopPropagation();
      startExperience();
    });

    againButton.addEventListener('click', e => {
      e.stopPropagation();
      window.location.reload();
    });

    soundButton.addEventListener('click', e => {
      e.stopPropagation();
      toggleSound();
    });

    promptEl.addEventListener('click', e => {
      e.stopPropagation();
      interact();
    });

    promptEl.addEventListener('keydown', e => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        interact();
      }
    });

    touchAct.addEventListener('click', e => {
      e.stopPropagation();
      interact();
    });

    dialogEl.addEventListener('click', e => {
      if (e.target.closest('#dialog-choices')) return;
      advanceDialog();
    });

    dialogChoices.addEventListener('click', e => {
      e.stopPropagation();
      const btn = e.target.closest('button[data-choice]');
      if (btn) chooseDialogOption(btn.dataset.choice);
    });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);

    canvas.addEventListener('pointerdown', e => {
      if (!state.started || state.dialogOpen || state.ending || state.cutscene || state.inputLocked) return;
      dragging = true;
      dragId = e.pointerId;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      canvas.classList.add('is-dragging');
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });

    window.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== dragId) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      if (state.dialogOpen || state.ending) return;
      state.lookTarget = null;
      state.angle += dx * 0.0031;
      state.pitch = Math.max(-0.58, Math.min(0.58, state.pitch - dy * 0.0028));
    }, { passive: true });

    const endDrag = e => {
      if (!dragging || (dragId !== null && e.pointerId !== dragId)) return;
      dragging = false;
      dragId = null;
      canvas.classList.remove('is-dragging');
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    // a small, odd comfort: clicking the world does not move you, only looking does
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // joystick
    joystick.addEventListener('pointerdown', e => {
      if (!state.started) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = joystick.getBoundingClientRect();
      joy.cx = rect.left + rect.width / 2;
      joy.cy = rect.top + rect.height / 2;
      joy.active = true;
      joy.id = e.pointerId;
      joystick.classList.add('active');
      try { joystick.setPointerCapture(e.pointerId); } catch (_) {}
      updateJoystick(e);
    });
    joystick.addEventListener('pointermove', e => {
      if (!joy.active || e.pointerId !== joy.id) return;
      e.preventDefault();
      updateJoystick(e);
    });
    const endJoy = e => {
      if (!joy.active || (joy.id !== null && e.pointerId !== joy.id)) return;
      joy.active = false;
      joy.id = null;
      joy.x = 0;
      joy.y = 0;
      joystick.classList.remove('active');
      joystickKnob.style.transform = 'translate(0,0)';
    };
    joystick.addEventListener('pointerup', endJoy);
    joystick.addEventListener('pointercancel', endJoy);

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 300));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearKeys();
    });
  }

  // ---------------- main loop ----------------
  let lastFrame = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - (lastFrame || now)) / 1000));
    lastFrame = now;

    if (!state.started) {
      state.angle = -Math.PI / 2 + Math.sin(now * 0.00013) * 0.022;
      state.pitch = 0.012 + Math.sin(now * 0.00021) * 0.004;
    }

    updatePlayer(dt, now);
    updateDialog(dt);
    updateNearest();
    updateSpecialTriggers(dt);
    maybeAmbient(now);
    updateHudTime(now);
    drawScene(now);
    state.frame++;
  }

  // ---------------- boot ----------------
  if (IS_TOUCH) {
    const notes = $('.title-notes');
    if (notes) {
      notes.innerHTML = [
        '<div class="note"><b>DRAG</b><span>拖动环顾</span></div>',
        '<div class="note"><b>STICK</b><span>摇杆移动</span></div>',
        '<div class="note"><b>触碰</b><span>互动</span></div>',
        '<div class="note"><b>声</b><span>静音</span></div>'
      ].join('');
    }
    const hint = dialogNext.querySelector('span');
    if (hint) hint.textContent = '点击继续';
  }
  updateSoundButton();
  updateMemoryUi();
  updateHudTime(0);
  resize();
  bindEvents();
  requestAnimationFrame(loop);

})();
