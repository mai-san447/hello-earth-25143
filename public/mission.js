(() => {
  const $ = selector => document.querySelector(selector);
  const app = $('#mission-app');
  const canvas = $('#orbit-canvas');
  const context = canvas.getContext('2d');
  const wishInput = $('#wish');
  const launchButton = $('#deposit');
  const depositSheet = $('#deposit-sheet');
  const depositStatus = $('#deposit-status');
  const returnCard = $('#return-card');
  const sampleButton = $('#sample-trigger');
  const cloud = $('#sync-mode')?.dataset.sync === 'cloud';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stars = Array.from({length: 185}, () => ({
    x: Math.random(), y: Math.random(), size: 0.25 + Math.random() * 1.15,
    phase: Math.random() * Math.PI * 2, speed: 0.15 + Math.random() * 0.55,
  }));
  let database;
  let wishes = [];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let returningWish = null;
  let returnFlight = null;
  let launchFlight = null;
  let landed = false;
  let motionActive = false;
  let lastShakeAt = 0;
  let audioContext;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('hello-earth-25143', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('wishes', {keyPath: 'id'});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function localStore(mode, operation) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('wishes', mode);
      const request = operation(transaction.objectStore('wishes'));
      let result;
      request.onsuccess = () => { result = request.result; };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async function cloudRequest(method, item) {
    const response = await fetch('/api/wishes', {
      method,
      headers: method === 'POST' ? {'Content-Type': 'application/json'} : {},
      body: item ? JSON.stringify(item) : undefined,
    });
    if (!response.ok) throw Error(response.status === 401 ? 'ログインし直してください。' : '通信を確認してください。');
    return response.json();
  }

  function store(mode, operation) {
    if (!cloud) return localStore(mode, operation);
    const request = operation({getAll: () => ({type: 'all'}), put: item => ({type: 'put', item})});
    return request.type === 'all' ? cloudRequest('GET') : cloudRequest('POST', request.item);
  }

  function orbiting() {
    return wishes.filter(wish => wish.status === 'waiting');
  }

  function recovered() {
    return wishes.filter(wish => wish.status !== 'waiting').sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function dispositionLabel(status) {
    return ({returned: '帰還・未整理', doing: 'やってみる', later: '保留', expired: '手放した', done: '完了'})[status] || '地球に保管';
  }

  function refreshInterface() {
    const count = orbiting().length;
    $('#archive-count').textContent = String(recovered().length);
    $('#shake').disabled = $('#fallback').disabled = count === 0 || Boolean(returningWish) || Boolean(returnFlight);
    $('#gesture-hint').textContent = landed
      ? '着地したサンプルをタップして、あの日の言葉を開いてください'
      : count ? 'スマホを振ると、星がひとつ地球へ帰還します' : '願いを預けると、星がイトカワの軌道に浮かびます';
    const list = $('#archive-list');
    list.replaceChildren();
    for (const wish of recovered()) {
      const row = document.createElement('li');
      const text = document.createElement('span');
      const disposition = document.createElement('span');
      const date = document.createElement('time');
      text.textContent = wish.text;
      disposition.className = 'archive-state';
      disposition.textContent = dispositionLabel(wish.status);
      date.textContent = new Intl.DateTimeFormat('ja-JP', {month: 'short', day: 'numeric'}).format(wish.updatedAt);
      row.append(text, disposition, date);
      list.append(row);
    }
    $('#archive-empty').hidden = recovered().length > 0;
  }

  function geometry() {
    const unit = Math.min(width, height);
    return {
      centerX: width * 0.51,
      centerY: height * 0.455,
      orbitX: Math.min(width * 0.405, unit * 0.52),
      orbitY: unit * 0.295,
      asteroid: Math.min(130, Math.max(64, unit * 0.17)),
      earthY: height * 0.91,
    };
  }

  function resize() {
    const bounds = app.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    pixelRatio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function syncVisualViewport() {
    const viewport = window.visualViewport;
    const visibleHeight = viewport?.height ?? window.innerHeight;
    app.style.setProperty('--visual-height', `${Math.round(visibleHeight)}px`);
    app.style.setProperty('--visual-offset-top', `${Math.round(viewport?.offsetTop ?? 0)}px`);
    app.classList.toggle('keyboard-open', document.activeElement === wishInput && matchMedia('(max-width: 900px)').matches);
    resize();
  }

  function hash(text) {
    let value = 2166136261;
    for (const character of text) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
    return value >>> 0;
  }

  function createWishId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function orbitPosition(wish, index, time) {
    const {centerX, centerY, orbitX, orbitY} = geometry();
    const seed = hash(wish.id);
    const lane = 0.76 + (seed % 23) / 100;
    const angle = seed % 628 / 100 + index * 0.37 + (reducedMotion ? 0 : time * (0.000025 + seed % 11 * 0.000001));
    return {x: centerX + Math.cos(angle) * orbitX * lane, y: centerY + Math.sin(angle) * orbitY * lane};
  }

  function drawSpace(time) {
    const sky = context.createLinearGradient(0, 0, width * 0.65, height);
    sky.addColorStop(0, '#050812');
    sky.addColorStop(0.54, '#091522');
    sky.addColorStop(1, '#101a25');
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    const haze = context.createRadialGradient(width * 0.59, height * 0.49, 1, width * 0.59, height * 0.49, width * 0.75);
    haze.addColorStop(0, 'rgba(77, 107, 120, .16)');
    haze.addColorStop(0.55, 'rgba(33, 62, 78, .06)');
    haze.addColorStop(1, 'rgba(4, 8, 15, 0)');
    context.fillStyle = haze;
    context.fillRect(0, 0, width, height);

    for (const star of stars) {
      const alpha = 0.26 + (Math.sin(time * 0.001 * star.speed + star.phase) + 1) * 0.29;
      context.globalAlpha = alpha;
      context.fillStyle = star.size > 1 ? '#f3dbac' : '#d9e7ed';
      context.beginPath();
      context.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawEarth() {
    const {earthY} = geometry();
    const atmosphere = context.createLinearGradient(0, earthY - 10, 0, height);
    atmosphere.addColorStop(0, '#8be0e2');
    atmosphere.addColorStop(0.035, '#254e65');
    atmosphere.addColorStop(0.18, '#142e45');
    atmosphere.addColorStop(1, '#08101e');
    context.save();
    context.shadowColor = 'rgba(114, 222, 232, .62)';
    context.shadowBlur = 25;
    context.fillStyle = atmosphere;
    context.beginPath();
    context.ellipse(width * 0.5, earthY + height * 0.32, width * 0.91, height * 0.31, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.strokeStyle = 'rgba(181, 244, 239, .7)';
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(width * 0.5, earthY + height * 0.32, width * 0.91, height * 0.31, 0, Math.PI, Math.PI * 2);
    context.stroke();
    context.fillStyle = 'rgba(207, 232, 226, .78)';
    context.textAlign = 'center';
    context.font = '9px ui-monospace, monospace';
    context.fillText('EARTH / CAPSULE RECOVERY', width * 0.5, height - 26);
  }

  function drawItokawa(time) {
    const {centerX, centerY, asteroid} = geometry();
    const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 0.0005) * 0.012;
    const radius = asteroid * pulse;
    const outline = [[-.95,-.08],[-.81,-.5],[-.51,-.68],[-.21,-.59],[.02,-.78],[.36,-.67],[.55,-.47],[.83,-.39],[.91,-.11],[.76,.14],[.85,.39],[.53,.51],[.3,.71],[-.04,.61],[-.31,.78],[-.57,.61],[-.83,.48],[-.75,.19]];
    context.save();
    context.translate(centerX, centerY);
    context.rotate(-0.14);
    context.scale(1.18, 0.83);
    const surface = context.createRadialGradient(-radius * .35, -radius * .45, radius * .06, radius * .05, radius * .06, radius * 1.1);
    surface.addColorStop(0, '#c9c0a9');
    surface.addColorStop(.23, '#928d83');
    surface.addColorStop(.55, '#62666a');
    surface.addColorStop(.82, '#3c4650');
    surface.addColorStop(1, '#202b35');
    context.beginPath();
    outline.forEach(([x, y], index) => index ? context.lineTo(x * radius, y * radius) : context.moveTo(x * radius, y * radius));
    context.closePath();
    context.shadowColor = 'rgba(205, 184, 142, .25)';
    context.shadowBlur = 28;
    context.fillStyle = surface;
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = 'rgba(228, 215, 190, .36)';
    context.lineWidth = 1;
    context.stroke();
    const craters = [[-.48,-.18,.115],[.12,-.38,.075],[.43,.13,.13],[-.12,.42,.09],[.61,-.25,.05]];
    for (const [x, y, size] of craters) {
      context.fillStyle = 'rgba(20, 27, 34, .24)';
      context.beginPath();
      context.ellipse(x * radius, y * radius, size * radius, size * radius * .62, -.3, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'rgba(237, 224, 193, .18)';
      context.beginPath();
      context.arc(x * radius, y * radius, size * radius, Math.PI * 1.12, Math.PI * 1.92);
      context.stroke();
    }
    context.restore();
    context.fillStyle = 'rgba(240, 223, 188, .82)';
    context.textAlign = 'center';
    context.font = '9px ui-monospace, monospace';
    context.fillText('25143 ITOKAWA', centerX, centerY + asteroid + 23);
  }

  function drawOrbit(time) {
    const {centerX, centerY, orbitX, orbitY} = geometry();
    context.save();
    context.strokeStyle = 'rgba(197, 215, 218, .23)';
    context.setLineDash([2, 7]);
    context.lineWidth = .8;
    context.beginPath();
    context.ellipse(centerX, centerY, orbitX, orbitY, -.12, 0, Math.PI * 2);
    context.stroke();
    context.restore();

    drawHayabusa(centerX - orbitX * .48, centerY - orbitY * .82, -.22, 1);

    orbiting().forEach((wish, index) => {
      if (launchFlight?.wish.id === wish.id) return;
      const point = orbitPosition(wish, index, time);
      context.save();
      context.shadowColor = '#ffe4a6';
      context.shadowBlur = 13;
      context.fillStyle = '#fff1ce';
      context.beginPath();
      context.arc(point.x, point.y, 2.2 + index % 3 * .45, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  }

  function drawHayabusa(x, y, rotation, scale = 1) {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.scale(scale, scale);
    context.shadowColor = 'rgba(255, 221, 155, .42)';
    context.shadowBlur = 9;
    context.strokeStyle = '#ead8aa';
    context.lineWidth = .7;
    for (const side of [-1, 1]) {
      context.fillStyle = '#263e4c';
      context.fillRect(side * 6, -2.7, side * 13, 5.4);
      context.strokeRect(side * 6, -2.7, side * 13, 5.4);
      context.strokeStyle = 'rgba(155, 206, 211, .58)';
      for (let cell = 1; cell < 4; cell++) {
        context.beginPath();
        context.moveTo(side * (6 + cell * 3.25), -2.7);
        context.lineTo(side * (6 + cell * 3.25), 2.7);
        context.stroke();
      }
      context.strokeStyle = '#ead8aa';
    }
    context.fillStyle = '#d7c49a';
    context.beginPath();
    context.moveTo(-5, -4);
    context.lineTo(2, -5);
    context.lineTo(6, -2);
    context.lineTo(5, 3);
    context.lineTo(-2, 4);
    context.lineTo(-6, 1);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = '#f5e7c5';
    context.beginPath();
    context.arc(0, -1, 1.4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(226, 218, 191, .9)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(-1, -4);
    context.lineTo(-4, -9);
    context.lineTo(-8, -10);
    context.stroke();
    context.beginPath();
    context.arc(-8, -11, 2.2, Math.PI * 1.05, Math.PI * 1.95);
    context.stroke();
    context.restore();
  }

  function drawFlight(time) {
    if (launchFlight) {
      const progress = Math.min(1, (time - launchFlight.startedAt) / 1750);
      const target = orbitPosition(launchFlight.wish, Math.max(0, orbiting().length - 1), time);
      drawComet(width * .5, height + 8, target.x, target.y, progress);
      if (progress >= 1) launchFlight = null;
    }
    if (returnFlight) {
      const progress = Math.min(1, (time - returnFlight.startedAt) / (reducedMotion ? 60 : 2600));
      drawComet(returnFlight.from.x, returnFlight.from.y, width * .5, geometry().earthY, progress);
    }
    if (landed) {
      const {earthY} = geometry();
      const pulse = reducedMotion ? 1 : .85 + Math.sin(time * .006) * .15;
      context.save();
      context.globalAlpha = pulse;
      context.shadowColor = '#ffe3a0';
      context.shadowBlur = 24;
      context.fillStyle = '#fff6d9';
      context.beginPath();
      context.arc(width * .5, earthY - 4, 5, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  function drawComet(startX, startY, endX, endY, progress) {
    const easing = progress * progress;
    const x = startX + (endX - startX) * easing;
    const y = startY + (endY - startY) * easing;
    const tail = context.createLinearGradient(startX, startY, x, y);
    tail.addColorStop(0, 'rgba(255, 223, 159, 0)');
    tail.addColorStop(.65, 'rgba(255, 223, 159, .28)');
    tail.addColorStop(1, 'rgba(255, 246, 218, .9)');
    context.strokeStyle = tail;
    context.lineWidth = 2 + progress * 2;
    context.beginPath();
    context.moveTo(startX, startY);
    context.quadraticCurveTo((startX + x) / 2 + 24, (startY + y) / 2, x, y);
    context.stroke();
    const glow = context.createRadialGradient(x, y, 0, x, y, 36);
    glow.addColorStop(0, 'rgba(255, 251, 225, .96)');
    glow.addColorStop(.22, 'rgba(255, 208, 127, .8)');
    glow.addColorStop(1, 'rgba(255, 176, 81, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(x, y, 38, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fff6dd';
    context.beginPath();
    context.arc(x, y, 3.4, 0, Math.PI * 2);
    context.fill();
    return {x, y};
  }

  function render(time) {
    drawSpace(time);
    drawEarth();
    drawOrbit(time);
    drawFlight(time);
    drawItokawa(time);
    requestAnimationFrame(render);
  }

  async function finishReturn(wish) {
    if (!returnFlight || returnFlight.wish.id !== wish.id) return;
    returnFlight = null;
    const returned = {...wish, status: 'returned', updatedAt: Date.now()};
    try {
      await store('readwrite', object => object.put(returned));
      wishes = wishes.map(item => item.id === wish.id ? returned : item);
      returningWish = returned;
      landed = true;
      sampleButton.hidden = false;
      setTimeout(() => sampleButton.classList.add('sample-arrived'), 20);
      $('#mission-status').textContent = 'カプセル帰還 / オーストラリアで回収';
      refreshInterface();
      playRecoveryTone();
    } catch {
      returningWish = null;
      $('#mission-status').textContent = '帰還記録を保存できません。通信を確認してください';
    }
  }

  function playReturnWhoosh() {
    try {
      audioContext ||= new AudioContext();
      if (audioContext.state === 'suspended') audioContext.resume();
      const duration = reducedMotion ? .45 : 2.6;
      const now = audioContext.currentTime;
      const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * duration), audioContext.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index++) {
        samples[index] = Math.random() * 2 - 1;
      }

      const source = audioContext.createBufferSource();
  const lowFilter = audioContext.createBiquadFilter();
  const midFilter = audioContext.createBiquadFilter();
  const lowGain = audioContext.createGain();
  const midGain = audioContext.createGain();
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-20, now);
  compressor.knee.setValueAtTime(16, now);
  compressor.ratio.setValueAtTime(4, now);
  compressor.attack.setValueAtTime(.004, now);
  compressor.release.setValueAtTime(.2, now);
  compressor.connect(audioContext.destination);
      source.buffer = buffer;
  lowFilter.type = 'lowpass';
  lowFilter.frequency.setValueAtTime(150, now);
  lowFilter.frequency.exponentialRampToValueAtTime(820, now + duration * .38);
  lowFilter.frequency.exponentialRampToValueAtTime(220, now + duration);
  midFilter.type = 'bandpass';
  midFilter.frequency.setValueAtTime(340, now);
  midFilter.frequency.exponentialRampToValueAtTime(760, now + duration * .34);
  midFilter.frequency.exponentialRampToValueAtTime(280, now + duration);
  midFilter.Q.setValueAtTime(.7, now);
  lowGain.gain.setValueAtTime(.0001, now);
  lowGain.gain.exponentialRampToValueAtTime(.24, now + duration * .16);
  lowGain.gain.setValueAtTime(.2, now + duration * .55);
  lowGain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  midGain.gain.setValueAtTime(.0001, now);
  midGain.gain.exponentialRampToValueAtTime(.11, now + duration * .2);
  midGain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  source.connect(lowFilter).connect(lowGain).connect(compressor);
  source.connect(midFilter).connect(midGain).connect(compressor);
      source.start(now);
      source.stop(now + duration);

      const rumble = audioContext.createOscillator();
      const rumbleGain = audioContext.createGain();
      rumble.type = 'triangle';
  rumble.frequency.setValueAtTime(92, now);
  rumble.frequency.exponentialRampToValueAtTime(48, now + duration);
      rumbleGain.gain.setValueAtTime(.0001, now);
  rumbleGain.gain.exponentialRampToValueAtTime(.1, now + duration * .12);
  rumbleGain.gain.setValueAtTime(.075, now + duration * .58);
      rumbleGain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  rumble.connect(rumbleGain).connect(compressor);
      rumble.start(now);
      rumble.stop(now + duration);

  const impact = audioContext.createOscillator();
  const impactGain = audioContext.createGain();
  impact.type = 'triangle';
  impact.frequency.setValueAtTime(118, now);
  impact.frequency.exponentialRampToValueAtTime(46, now + .32);
  impactGain.gain.setValueAtTime(.0001, now);
  impactGain.gain.exponentialRampToValueAtTime(.16, now + .018);
  impactGain.gain.exponentialRampToValueAtTime(.0001, now + .34);
  impact.connect(impactGain).connect(compressor);
  impact.start(now);
  impact.stop(now + .36);
    } catch {}
  }

  function playRecoveryTone() {
    try {
      audioContext ||= new AudioContext();
      if (audioContext.state === 'suspended') audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + .42);
      gain.gain.setValueAtTime(.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.075, audioContext.currentTime + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .48);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + .5);
    } catch {}
  }

  function playLaunchTone() {
    try {
      audioContext ||= new AudioContext();
      if (audioContext.state === 'suspended') audioContext.resume();
      const now = audioContext.currentTime;
      const duration = reducedMotion ? .32 : .72;
      const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * duration), audioContext.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index++) {
        samples[index] = Math.random() * 2 - 1;
      }

      const source = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();
      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(260, now);
      filter.frequency.exponentialRampToValueAtTime(1450, now + duration * .62);
      filter.frequency.exponentialRampToValueAtTime(620, now + duration);
      filter.Q.setValueAtTime(.8, now);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(.11, now + .08);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      source.connect(filter).connect(gain).connect(audioContext.destination);
      source.start(now);
      source.stop(now + duration);

      const tone = audioContext.createOscillator();
      const toneGain = audioContext.createGain();
      tone.type = 'sine';
      tone.frequency.setValueAtTime(240, now);
      tone.frequency.exponentialRampToValueAtTime(720, now + duration * .72);
      toneGain.gain.setValueAtTime(.0001, now);
      toneGain.gain.exponentialRampToValueAtTime(.055, now + .1);
      toneGain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      tone.connect(toneGain).connect(audioContext.destination);
      tone.start(now);
      tone.stop(now + duration);
    } catch {}
  }

  function returnOne() {
    if (returningWish || returnFlight) return;
    const candidates = orbiting();
    if (!candidates.length) {
      $('#mission-status').textContent = 'すべての願いは地球にあります';
      return;
    }
    returningWish = candidates[Math.floor(Math.random() * candidates.length)];
    returnFlight = {
      wish: returningWish,
      startedAt: performance.now(),
      from: orbitPosition(returningWish, candidates.indexOf(returningWish), performance.now()),
    };
    playReturnWhoosh();
    setTimeout(() => finishReturn(returningWish), reducedMotion ? 60 : 2700);
    landed = false;
    sampleButton.hidden = true;
    $('#mission-status').textContent = '2005 — イトカワで採取したサンプルを地球へ';
    $('#gesture-hint').textContent = '星はひとつだけ。はやぶさの帰還を見届けてください';
    setTimeout(() => {
      if (returnFlight) $('#mission-status').textContent = '2007 — イオンエンジンで地球帰還の航路へ';
    }, 1150);
    setTimeout(() => {
      if (returnFlight) $('#mission-status').textContent = '2010 — 帰還カプセルを分離';
    }, 2050);
    refreshInterface();
  }

  function openCard() {
    if (!returningWish || !landed) return;
    $('#returned-text').textContent = returningWish.text;
    const createdAt = new Date(returningWish.createdAt);
    $('#returned-date').textContent = `預けた日 ${new Intl.DateTimeFormat('ja-JP', {year: 'numeric', month: 'long', day: 'numeric'}).format(createdAt)}`;
    $('#returned-date').dateTime = createdAt.toISOString();
    returnCard.hidden = false;
    setTimeout(() => returnCard.classList.add('card-open'), 20);
    $('#mission-status').textContent = '2010 — カプセル帰還 / WISH SAMPLE RETURNED';
    $('#card-close').focus({preventScroll: true});
  }

  async function chooseDisposition(status) {
    if (!returningWish || !landed) return;
    const actions = [...document.querySelectorAll('#try-wish, #return-to-orbit, #finish-wish')];
    actions.forEach(button => { button.disabled = true; });
    const updated = {...returningWish, status, updatedAt: Date.now()};
    try {
      await store('readwrite', object => object.put(updated));
      wishes = wishes.map(wish => wish.id === updated.id ? updated : wish);
      returningWish = updated;
      if (status === 'waiting') launchFlight = {wish: updated, startedAt: performance.now()};
      closeCard();
      refreshInterface();
    } catch {
      $('#mission-status').textContent = '保存できませんでした。もう一度お試しください';
    } finally {
      actions.forEach(button => { button.disabled = false; });
    }
  }

  function closeCard() {
    returnCard.classList.remove('card-open');
    setTimeout(() => {
      returnCard.hidden = true;
      $('#deposit-open').focus({preventScroll: true});
    }, 300);
    returningWish = null;
    landed = false;
    sampleButton.hidden = true;
    sampleButton.classList.remove('sample-arrived');
    $('#mission-status').textContent = '';
    refreshInterface();
  }

  function openDeposit() {
    try {
      audioContext ||= new AudioContext();
      if (audioContext.state === 'suspended') audioContext.resume();
    } catch {}
    depositSheet.hidden = false;
    setTimeout(() => depositSheet.classList.add('sheet-open'), 20);
    setTimeout(() => {
      wishInput.focus({preventScroll: true});
      syncVisualViewport();
      setTimeout(() => wishInput.scrollIntoView({block: 'nearest', behavior: 'smooth'}), 160);
    }, 220);
  }

  function closeDeposit() {
    depositSheet.classList.remove('sheet-open');
    setTimeout(() => { depositSheet.hidden = true; }, 330);
  }

  async function launchWish() {
    const text = wishInput.value.trim();
    if (!text) {
      depositStatus.textContent = '未来へ預ける言葉を入力してください。';
      wishInput.focus();
      return;
    }
    launchButton.disabled = true;
    const now = Date.now();
    const wish = {id: createWishId(), text, status: 'waiting', createdAt: now, updatedAt: now};
    try {
      await store('readwrite', object => object.put(wish));
      wishes = [...wishes, wish];
      refreshInterface();
      wishInput.value = '';
      $('#wish-length').textContent = '0';
      depositStatus.textContent = '送信完了';
      $('#mission-status').textContent = '2003 — 地球を出発 / 願いを軌道へ投入';
        playLaunchTone();
        launchFlight = {wish, startedAt: performance.now()};
      closeDeposit();
      setTimeout(() => {
        if (!returnFlight) $('#mission-status').textContent = '2005 — イトカワの軌道に願いの星を確認';
      }, 1850);
    } catch (error) {
      depositStatus.textContent = `送信に失敗しました。入力は残しています。${error.message || ''}`;
    } finally {
      launchButton.disabled = false;
    }
  }

  async function enableMotion() {
    if (!orbiting().length || returningWish || returnFlight) return;
    try {
      audioContext ||= new AudioContext();
      if (audioContext.state === 'suspended') await audioContext.resume();
      if (typeof DeviceMotionEvent === 'undefined') throw Error('unsupported');
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        if (await DeviceMotionEvent.requestPermission() !== 'granted') throw Error('denied');
      }
      if (!motionActive) {
        window.addEventListener('devicemotion', event => {
          const acceleration = event.acceleration;
          if (!acceleration) return;
          const magnitude = Math.hypot(acceleration.x || 0, acceleration.y || 0, acceleration.z || 0);
          if (magnitude >= 15 && Date.now() - lastShakeAt > 1500) {
            lastShakeAt = Date.now();
            returnOne();
          }
        });
        motionActive = true;
      }
      $('#mission-status').textContent = '探査機との接続完了。スマホを振ってください';
      $('#shake').classList.add('motion-enabled');
    } catch {
      $('#mission-status').textContent = 'この端末では振動センサーが使えません。タップで回収できます';
      $('#fallback').classList.add('fallback-ready');
    }
  }

  $('#deposit-open').addEventListener('click', openDeposit);
  $('#deposit-close').addEventListener('click', closeDeposit);
  launchButton.addEventListener('click', launchWish);
  wishInput.addEventListener('input', () => { $('#wish-length').textContent = String(wishInput.value.length); });
  $('#shake').addEventListener('click', enableMotion);
  $('#fallback').addEventListener('click', returnOne);
  sampleButton.addEventListener('click', openCard);
  $('#card-close').addEventListener('click', closeCard);
  $('#try-wish').addEventListener('click', () => chooseDisposition('doing'));
  $('#return-to-orbit').addEventListener('click', () => chooseDisposition('waiting'));
  $('#finish-wish').addEventListener('click', () => chooseDisposition('done'));
  $('#archive-open').addEventListener('click', () => { $('#archive-sheet').hidden = false; });
  $('#archive-close').addEventListener('click', () => { $('#archive-sheet').hidden = true; });
  window.addEventListener('keydown', event => {
    if (event.key === 'Tab' && !returnCard.hidden) {
      const focusable = [...returnCard.querySelectorAll('button:not([disabled])')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.code === 'Space' && !event.repeat && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      returnOne();
    }
    if (event.key === 'Escape') {
      if (!returnCard.hidden) closeCard();
      else if (!depositSheet.hidden) closeDeposit();
      else $('#archive-sheet').hidden = true;
    }
  });
  window.addEventListener('resize', syncVisualViewport);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncVisualViewport);
    window.visualViewport.addEventListener('scroll', syncVisualViewport);
  }
  wishInput.addEventListener('focus', syncVisualViewport);
  wishInput.addEventListener('blur', () => setTimeout(syncVisualViewport, 80));

  async function init() {
    try {
      database = await openDatabase();
      if (cloud) {
        const remote = await cloudRequest('GET');
        const local = await localStore('readonly', object => object.getAll());
        const remoteIds = new Set(remote.map(item => item.id));
        for (const item of local.filter(candidate => !remoteIds.has(candidate.id))) {
          await cloudRequest('POST', {id: item.id, text: item.text || '以前、声で預けた願い', status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt});
        }
      }
      wishes = await store('readonly', object => object.getAll());
      refreshInterface();
      syncVisualViewport();
      requestAnimationFrame(render);
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission !== 'function') {
        $('#shake').addEventListener('click', () => $('#mission-status').textContent = 'スマホを振ると、ひとつの願いが帰還します', {once: true});
      }
      $('#mission-status').textContent = orbiting().length
        ? '2005 — イトカワ到着・サンプル採取'
        : '2003 — はやぶさ、地球を出発';
    } catch (error) {
      $('#mission-status').textContent = cloud ? `同期できません。${error.message || '通信を確認してください'}` : '願いを読み込めません。ブラウザを確認してください';
      launchButton.disabled = $('#shake').disabled = $('#fallback').disabled = true;
    }
  }

  init();
})();
