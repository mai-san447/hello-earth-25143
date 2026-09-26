(() => {
  const $ = selector => document.querySelector(selector);
  const app = $('#mission-app');
  const canvas = $('#orbit-canvas');
  const starfieldCanvas = $('#starfield-canvas');
  const locationModal = $('#location-modal');
  const locationAllow = $('#location-allow');
  const locationSkip = $('#location-skip');
  const locationStatus = $('#location-status');
  const itokawaLabel = $('#itokawa-label');
  const telemetryLabel = $('.telemetry');
  const observerReading = $('#observer-reading');
  const accountTrigger = $('#account-open');
  const accountSheet = $('#account-sheet');
  const missionDock = $('#mission-dock');
  const stepButtons = [...document.querySelectorAll('[data-mission-step]')];
  const splashScreen = $('#splash-screen');
  const context = canvas.getContext('2d');
  const wishInput = $('#wish');
  const launchButton = $('#deposit');
  const depositSheet = $('#deposit-sheet');
  const depositStatus = $('#deposit-status');
  const returnCard = $('#return-card');
  const sampleButton = $('#sample-trigger');
  const cloud = $('#sync-mode')?.dataset.sync === 'cloud';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (splashScreen) {
    setTimeout(() => {
      splashScreen.classList.add('splash-screen-dismissed');
      setTimeout(() => splashScreen.remove(), 1300);
    }, 2000);
  }

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    if (!button || button.disabled || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate([15]);
    } catch {
      // Haptics are optional and can be blocked by the browser or device.
    }
  }, true);
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
  let threeScene;
  let threeCamera;
  let skyGroup;
  let starfieldGroup;
  let starMaterial;
  let itokawaMesh;
  let hayabusaOrbit;
  let hayabusaCraft;
  let updateItokawaLabel = () => {};
  let pendingLocation;
  let threeReady = false;

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

  function setMissionStep(step) {
    missionDock.dataset.step = step;
    for (const button of stepButtons) {
      const selected = button.dataset.missionStep === step;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    for (const panel of document.querySelectorAll('[data-step-panel]')) {
      panel.hidden = panel.dataset.stepPanel !== step;
    }
    requestAnimationFrame(alignTelemetryToDock);
  }

  function alignTelemetryToDock() {
    const appBounds = app.getBoundingClientRect();
    const dockBounds = missionDock.getBoundingClientRect();
    const gap = 16;
    telemetryLabel.style.setProperty('--telemetry-dock-offset', `${Math.max(0, appBounds.bottom - dockBounds.top + gap)}px`);
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
    $('#choose-status').textContent = landed ? '帰還カプセルを回収しました' : 'カプセルの帰還を待っています';
    $('#gesture-hint').textContent = landed
      ? '着地したカプセルを開いて、あの日の言葉を受信してください'
      : count ? 'シグナルを探すと、想いがひとつ地球へ帰還します' : '願いを預けると、星がイトカワの軌道に浮かびます';
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

  function applyLocation(latitude, longitude) {
    const lat = Math.max(-90, Math.min(90, latitude));
    const lon = ((longitude + 180) % 360 + 360) % 360 - 180;
    pendingLocation = {lat, lon};
    const latitudeLabel = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
    const longitudeLabel = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
    observerReading.textContent = `OBSERVER: EARTH [ ${latitudeLabel}, ${longitudeLabel} ]`;
    if (starfieldGroup) {
      starfieldGroup.rotation.x = lat * Math.PI / 180 * 0.1;
      starfieldGroup.rotation.y = -lon * Math.PI / 180 * 0.0045;
      updateItokawaLabel();
    }
    locationStatus.textContent = `星空を現在地に合わせました（緯度 ${lat.toFixed(1)}°）。`;
    setTimeout(() => locationModal.classList.add('is-hidden'), 650);
  }

  async function initializeThreeBackground() {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const renderer = new THREE.WebGLRenderer({canvas: starfieldCanvas, alpha: true, antialias: false, powerPreference: 'low-power'});
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 240);
    threeCamera.position.set(0, 0, 0);
    skyGroup = new THREE.Group();
    threeScene.add(skyGroup);
    starfieldGroup = new THREE.Group();
    skyGroup.add(starfieldGroup);

    const starCount = 4600;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const phases = new Float32Array(starCount);
    const rates = new Float32Array(starCount);
    for (let index = 0; index < starCount; index++) {
      const y = Math.random() * 2 - 1;
      const angle = Math.random() * Math.PI * 2;
      const radius = 95 + Math.random() * 65;
      const ring = Math.sqrt(1 - y * y);
      positions[index * 3] = Math.cos(angle) * ring * radius;
      positions[index * 3 + 1] = y * radius;
      positions[index * 3 + 2] = Math.sin(angle) * ring * radius;
      sizes[index] = 0.65 + Math.pow(Math.random(), 3) * 2.7;
      phases[index] = Math.random() * Math.PI * 2;
      rates[index] = 0.3 + Math.random() * 1.2;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    starGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    starGeometry.setAttribute('aRate', new THREE.BufferAttribute(rates, 1));
    starMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {uTime: {value: 0}, uPixelRatio: {value: renderer.getPixelRatio()}},
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        attribute float aRate;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        void main() {
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          float pulse = 0.7 + 0.3 * sin(uTime * aRate + aPhase);
          vAlpha = pulse;
          gl_PointSize = min(aSize * uPixelRatio * pulse * (220.0 / -viewPosition.z), 6.0);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float radius = length(gl_PointCoord - vec2(0.5));
          if (radius > 0.5) discard;
          float glow = 1.0 - smoothstep(0.02, 0.5, radius);
          gl_FragColor = vec4(vec3(0.76, 0.86, 0.98), glow * vAlpha * 0.9);
        }
      `,
    });
    starfieldGroup.add(new THREE.Points(starGeometry, starMaterial));

    const peanutProfile = [
      [-7.4, 0.12], [-6.8, 1.05], [-5.7, 2.05], [-4.2, 2.65],
      [-2.8, 2.8], [-1.4, 2.35], [0, 1.85], [1.4, 2.2],
      [2.8, 3.0], [4.3, 3.45], [5.5, 3.35], [6.5, 2.7],
      [7.2, 1.45], [7.45, 0.12],
    ].map(([axis, radius]) => new THREE.Vector2(radius, axis));
    const asteroidGeometry = new THREE.LatheGeometry(new THREE.SplineCurve(peanutProfile).getPoints(96), 64);
    asteroidGeometry.rotateZ(-Math.PI / 2);
    const vertices = asteroidGeometry.attributes.position;
    const rockColors = new Float32Array(vertices.count * 3);
    for (let index = 0; index < vertices.count; index++) {
      const x = vertices.getX(index);
      const y = vertices.getY(index);
      const z = vertices.getZ(index);
      const seed = Math.sin(Math.round(x * 10000) * 127.1 + Math.round(y * 10000) * 311.7 + Math.round(z * 10000) * 74.7) * 43758.5453;
      const grain = seed - Math.floor(seed);
      const ridges = Math.sin(x * 2.7 + y * 1.9) * Math.cos(z * 3.1 - y * 1.4);
      const relief = (grain - 0.5) * 0.16 + ridges * 0.055;
      const scale = 1 + relief;
      vertices.setXYZ(index, x * scale, y * scale * 0.98, z * scale * 1.06);
      const tone = 0.43 + (grain - 0.5) * 0.18 + ridges * 0.06;
      rockColors[index * 3] = tone * 0.93;
      rockColors[index * 3 + 1] = tone * 0.96;
      rockColors[index * 3 + 2] = tone;
    }
    asteroidGeometry.setAttribute('color', new THREE.BufferAttribute(rockColors, 3));
    asteroidGeometry.computeVertexNormals();
    itokawaMesh = new THREE.Mesh(asteroidGeometry, new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.03,
      emissive: 0x37332e,
      emissiveIntensity: 0.12,
      flatShading: true,
    }));
    itokawaMesh.position.set(0, 0, -68);
    skyGroup.add(itokawaMesh);
    const asteroidLight = new THREE.PointLight(0xe8d8b6, 5, 28, 2);
    asteroidLight.position.copy(itokawaMesh.position).add(new THREE.Vector3(-8, 9, 14));
    skyGroup.add(asteroidLight);

    hayabusaOrbit = new THREE.Group();
    hayabusaOrbit.position.copy(itokawaMesh.position);
    skyGroup.add(hayabusaOrbit);
    hayabusaCraft = new THREE.Group();
    hayabusaOrbit.add(hayabusaCraft);

    const blanketMaterial = new THREE.MeshStandardMaterial({color: 0xc5a75f, metalness: 0.92, roughness: 0.34, emissive: 0x4a3512, emissiveIntensity: 0.3});
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x244b6c,
      metalness: 0.92,
      roughness: 0.3,
      emissive: 0x173954,
      emissiveIntensity: 0.4,
    });
    const panelGridMaterial = new THREE.MeshStandardMaterial({color: 0x8cb7c6, metalness: 0.42, roughness: 0.34, emissive: 0x4d879b, emissiveIntensity: 0.24});
    const antennaMaterial = new THREE.MeshStandardMaterial({color: 0xc2baa7, metalness: 0.68, roughness: 0.32, side: THREE.DoubleSide});
    const samplerMaterial = new THREE.MeshStandardMaterial({color: 0xb6a782, metalness: 0.58, roughness: 0.46});

    const spacecraftBody = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.78, 0.9), blanketMaterial);
    hayabusaCraft.add(spacecraftBody);
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.09, 1.28), panelMaterial);
      panel.position.set(side * 2.22, 0, 0);
      hayabusaCraft.add(panel);
      for (let cell = 1; cell < 4; cell++) {
        const divider = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.018, 1.22), panelGridMaterial);
        divider.position.set(panel.position.x + side * (cell - 2) * 0.78, 0.055, 0);
        hayabusaCraft.add(divider);
      }
      for (const row of [-0.4, 0.4]) {
        const busbar = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.018, 0.025), panelGridMaterial);
        busbar.position.set(panel.position.x, 0.055, row);
        hayabusaCraft.add(busbar);
      }
    }

    const antennaMast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.36, 10), antennaMaterial);
    antennaMast.position.y = 0.55;
    hayabusaCraft.add(antennaMast);
    const highGainDish = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.22, 28, 1, true), antennaMaterial);
    highGainDish.rotation.x = Math.PI;
    highGainDish.position.y = 0.78;
    hayabusaCraft.add(highGainDish);
    const samplerHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.19, 0.48, 14), samplerMaterial);
    samplerHorn.position.y = -0.61;
    hayabusaCraft.add(samplerHorn);
    hayabusaCraft.scale.setScalar(1.12);
    const spacecraftBeacon = new THREE.PointLight(0x9dc9df, 1.8, 11, 2);
    spacecraftBeacon.position.set(0, 1.1, 1.4);
    hayabusaCraft.add(spacecraftBeacon);
    const craftGlowCanvas = document.createElement('canvas');
    craftGlowCanvas.width = craftGlowCanvas.height = 96;
    const craftGlowContext = craftGlowCanvas.getContext('2d');
    const craftGlowGradient = craftGlowContext.createRadialGradient(48, 48, 2, 48, 48, 48);
    craftGlowGradient.addColorStop(0, 'rgba(145,210,245,.34)');
    craftGlowGradient.addColorStop(.38, 'rgba(110,175,220,.12)');
    craftGlowGradient.addColorStop(1, 'rgba(90,145,200,0)');
    craftGlowContext.fillStyle = craftGlowGradient;
    craftGlowContext.fillRect(0, 0, 96, 96);
    const craftGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(craftGlowCanvas),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      opacity: 0.62,
    }));
    craftGlow.position.set(0, 0, -0.25);
    craftGlow.scale.set(12, 8, 1);
    hayabusaCraft.add(craftGlow);
    const hayabusaRimLight = new THREE.DirectionalLight(0x83b9dc, 1.35);
    hayabusaRimLight.position.set(-4, 3, -8);
    hayabusaRimLight.target.position.set(0, 0, 0);
    hayabusaCraft.add(hayabusaRimLight, hayabusaRimLight.target);

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 128;
    const glowContext = glowCanvas.getContext('2d');
    const glowGradient = glowContext.createRadialGradient(64, 64, 2, 64, 64, 64);
    glowGradient.addColorStop(0, 'rgba(255,232,176,.72)');
    glowGradient.addColorStop(.2, 'rgba(243,190,105,.3)');
    glowGradient.addColorStop(1, 'rgba(238,174,89,0)');
    glowContext.fillStyle = glowGradient;
    glowContext.fillRect(0, 0, 128, 128);
    const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(glowCanvas),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }));
    glowSprite.position.copy(itokawaMesh.position);
    glowSprite.scale.set(23, 23, 1);
    skyGroup.add(glowSprite);
    threeScene.add(new THREE.AmbientLight(0x9aa9ba, 0.32));
    const asteroidKey = new THREE.DirectionalLight(0xd8e2eb, 1.1);
    asteroidKey.position.set(-16, 20, 22);
    threeScene.add(asteroidKey);

    function updateSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      threeCamera.aspect = width / height;
      threeCamera.fov = width < 560 ? 74 : 58;
      threeCamera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      const halfViewWidth = 68 * Math.tan(THREE.MathUtils.degToRad(threeCamera.fov / 2)) * width / height;
      const asteroidX = Math.min(width < 560 ? 12 : 36, halfViewWidth * 0.52);
      itokawaMesh.position.set(asteroidX, width < 560 ? -4.5 : -3, -68);
      asteroidLight.position.copy(itokawaMesh.position).add(new THREE.Vector3(-8, 9, 14));
      hayabusaOrbit.position.copy(itokawaMesh.position);
      glowSprite.position.copy(itokawaMesh.position);
      const radiusX = width < 560 ? 13 : width < 900 ? 12 : 24;
      const radiusY = width < 560 ? 8 : width < 900 ? 10 : 14;
      const startAngle = 2.2;
      const tangentX = -radiusX * Math.sin(startAngle);
      const tangentY = radiusY * Math.cos(startAngle);
      hayabusaCraft.position.set(radiusX * Math.cos(startAngle), radiusY * Math.sin(startAngle), 0);
      hayabusaCraft.rotation.z = Math.atan2(tangentY, tangentX);
    }

    function updateLabel() {
      const worldPosition = itokawaMesh.getWorldPosition(new THREE.Vector3());
      worldPosition.y += 8.5;
      const projected = worldPosition.project(threeCamera);
      const visible = projected.z > -1 && projected.z < 1;
      itokawaLabel.hidden = !visible;
      if (visible) {
        itokawaLabel.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
        itokawaLabel.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight - 12}px`;
      }
    }
    updateItokawaLabel = updateLabel;

    if (pendingLocation) applyLocation(pendingLocation.lat, pendingLocation.lon);
    updateSize();
    threeReady = true;
    window.addEventListener('resize', updateSize, {passive: true});
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      starMaterial.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
      if (!reducedMotion) {
        starfieldGroup.rotation.y += 0.000035;
        itokawaMesh.rotation.y += 0.0008;
        itokawaMesh.rotation.z += 0.00018;
        hayabusaOrbit.rotation.z += 0.00055;
        hayabusaCraft.rotation.y += 0.0007;
      }
      renderer.render(threeScene, threeCamera);
      updateLabel();
    }
    animate();
  }

  locationAllow.addEventListener('click', () => {
    if (!navigator.geolocation) {
      locationStatus.textContent = '位置情報に対応していません。位置情報なしで続けられます。';
      return;
    }
    locationAllow.disabled = true;
    locationStatus.textContent = '現在地を確認しています…';
    navigator.geolocation.getCurrentPosition(
      ({coords}) => {
        applyLocation(coords.latitude, coords.longitude);
        locationAllow.disabled = false;
      },
      () => {
        locationStatus.textContent = '位置情報を取得できませんでした。位置情報なしで続けられます。';
        locationAllow.disabled = false;
      },
      {enableHighAccuracy: false, timeout: 10000, maximumAge: 300000},
    );
  });
  locationSkip.addEventListener('click', () => locationModal.classList.add('is-hidden'));

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

    if (!threeReady) drawHayabusa(centerX - orbitX * .48, centerY - orbitY * .82, -.22, 1);

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
    if (threeReady) context.clearRect(0, 0, width, height);
    else drawSpace(time);
    drawEarth();
    drawOrbit(time);
    drawFlight(time);
    if (!threeReady) drawItokawa(time);
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
      setMissionStep('choose');
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
      setMissionStep(status === 'waiting' ? 'receive' : 'deposit');
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
      $('#mission-status').textContent = '探査機との接続完了。シグナルを探してください';
      $('#shake').classList.add('motion-enabled');
    } catch {
      $('#mission-status').textContent = 'この端末では振動センサーが使えません。カプセルを開いて回収できます';
      $('#fallback').classList.add('fallback-ready');
    }
  }

  $('#deposit-open').addEventListener('click', openDeposit);
  $('#deposit-close').addEventListener('click', closeDeposit);
  stepButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      const step = button.dataset.missionStep;
      setMissionStep(step);
      if (step === 'deposit') $('#deposit-open').focus({preventScroll: true});
      if (step === 'receive') {
        if (!orbiting().length) $('#mission-status').textContent = '軌道に星はありません';
        else $('#fallback').focus({preventScroll: true});
      }
      if (step === 'choose') {
        if (landed) sampleButton.focus({preventScroll: true});
        else $('#choose-status').textContent = 'カプセルの帰還を待っています';
      }
    });
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? stepButtons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : stepButtons.length - 1)) % stepButtons.length;
      stepButtons[nextIndex].click();
      stepButtons[nextIndex].focus({preventScroll: true});
    });
  });
  accountTrigger.addEventListener('click', () => {
    const open = accountSheet.hidden;
    accountSheet.hidden = !open;
    accountTrigger.setAttribute('aria-expanded', String(open));
    if (open) $('#account-close').focus({preventScroll: true});
  });
  $('#account-close').addEventListener('click', () => {
    accountSheet.hidden = true;
    accountTrigger.setAttribute('aria-expanded', 'false');
    accountTrigger.focus({preventScroll: true});
  });
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
      else if (!accountSheet.hidden) {
        accountSheet.hidden = true;
        accountTrigger.setAttribute('aria-expanded', 'false');
        accountTrigger.focus({preventScroll: true});
      }
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
  const dockResizeObserver = new ResizeObserver(alignTelemetryToDock);
  dockResizeObserver.observe(missionDock);
  window.addEventListener('resize', alignTelemetryToDock, {passive: true});
  if (window.visualViewport) window.visualViewport.addEventListener('resize', alignTelemetryToDock, {passive: true});
  requestAnimationFrame(alignTelemetryToDock);

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
      setMissionStep('deposit');
      syncVisualViewport();
      requestAnimationFrame(render);
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission !== 'function') {
        $('#shake').addEventListener('click', () => $('#mission-status').textContent = 'シグナルを探すと、ひとつの想いが帰還します', {once: true});
      }
      $('#mission-status').textContent = '';
    } catch (error) {
      $('#mission-status').textContent = cloud ? `同期できません。${error.message || '通信を確認してください'}` : '願いを読み込めません。ブラウザを確認してください';
      launchButton.disabled = $('#shake').disabled = $('#fallback').disabled = true;
    }
  }

  initializeThreeBackground().catch(() => {
    locationStatus.textContent = '3D星空を読み込めません。簡易表示で続けます。';
  });
  init();
})();
