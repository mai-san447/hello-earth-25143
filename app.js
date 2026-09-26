(() => {
  const $ = selector => document.querySelector(selector);
  const wish = $('#wish');
  const deposit = $('#deposit'), depositStatus = $('#deposit-status');
  const count = $('#count'), shake = $('#shake'), fallback = $('#fallback');
  const universe = $('#universe'), distanceText = $('#distance-text');
  const flightCaption = $('#flight-caption'), returnStatus = $('#return-status');
  const arrival = $('#arrival'), returnedText = $('#returned-text'), legacyPlay = $('#legacy-play');
  const choices = $('#choices'), history = $('#history');
  const desk = $('.desk');
  const labels = { doing:'取り組み中', expired:'用済み', done:'対応済み' };
  let db, items = [], current = null, traveling = false, lastId = null;
  let motionListening = false, lastMotion = 0, audioUrl = null;
  let historyPage = 0;

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('hello-earth-25143', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('wishes', {keyPath:'id'});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  function store(mode, operation) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('wishes', mode), request = operation(tx.objectStore('wishes'));
      let result;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  async function refresh() { items = await store('readonly', object => object.getAll()); render(); }
  function waiting() { return items.filter(item => item.status === 'waiting'); }
  function render() {
    count.textContent = `イトカワに ${waiting().length} 件 ／ 地球で取り組み中 ${items.filter(item => item.status === 'doing').length} 件`;
    shake.disabled = fallback.disabled = !waiting().length || Boolean(current) || traveling;
    const settled = items.filter(item => labels[item.status]).sort((a,b) => b.updatedAt - a.updatedAt);
    const pageCount = Math.max(1, Math.ceil(settled.length / 3));
    historyPage = Math.min(historyPage, pageCount - 1);
    $('#log-count').textContent = `${settled.length} 件`;
    $('#history-empty').hidden = Boolean(settled.length);
    $('#history-page').textContent = settled.length ? `${historyPage + 1} / ${pageCount}` : '';
    $('#history-prev').disabled = historyPage === 0;
    $('#history-next').disabled = historyPage >= pageCount - 1;
    $('.log-pages').hidden = settled.length <= 3;
    history.replaceChildren();
    for (const item of settled.slice(historyPage * 3, historyPage * 3 + 3)) {
      const li = document.createElement('li'), title = document.createElement('span'), status = document.createElement('span');
      title.textContent = item.text || '以前、声で預けた願い'; status.textContent = labels[item.status];
      li.append(title, status); history.append(li);
    }
  }
  async function saveWish() {
    const text = wish.value.trim();
    if (!text) { depositStatus.textContent = '願いを文字にしてから預けてください。'; wish.focus(); return; }
    deposit.disabled = true;
    try {
      await store('readwrite', object => object.put({id:crypto.randomUUID(),text,status:'waiting',createdAt:Date.now(),updatedAt:Date.now()}));
      wish.value = ''; depositStatus.textContent = 'イトカワへ預けました。';
      returnStatus.textContent = 'スマホを振ると、はやぶさが一つ連れ帰ります。';
      await refresh();
      desk.dataset.view = 'deposit';
    } catch (_) { depositStatus.textContent = '保存できませんでした。入力は残しています。ブラウザの空き容量を確認してください。'; }
    finally { deposit.disabled = false; }
  }
  function chooseOne() {
    const pool = waiting(), alternatives = pool.filter(item => item.id !== lastId);
    const choices = alternatives.length ? alternatives : pool;
    return choices[Math.floor(Math.random() * choices.length)];
  }
  function returnOne() {
    if (current || traveling) return;
    const item = chooseOne(); if (!item) return;
    current = item; lastId = item.id; traveling = true; render();
    universe.classList.remove('departing'); universe.classList.add('returning');
    distanceText.textContent = 'ひとつの願いを地球へ'; flightCaption.textContent = 'イトカワを離れました';
    returnStatus.textContent = '遠いイトカワから、ひとつの願いが近づいています…';
    setTimeout(() => { flightCaption.textContent = '長い宇宙の航路を進んでいます'; }, 900);
    setTimeout(() => { flightCaption.textContent = '地球が見えてきました'; }, 1900);
    setTimeout(() => {
      returnedText.textContent = item.text || '以前、声で預けた願い';
      legacyPlay.hidden = !item.audio; arrival.hidden = false;
      flightCaption.textContent = '地球に帰還しました'; returnStatus.textContent = '届いた願いを確かめてください。';
      traveling = false; desk.dataset.view = 'arrival'; render();
    }, 2700);
  }
  async function decide(action) {
    if (!current || traveling) return;
    const next = {...current,status:action === 'later' ? 'waiting' : action,updatedAt:Date.now()};
    choices.querySelectorAll('button').forEach(button => { button.disabled = true; });
    try {
      await store('readwrite', object => object.put(next));
      current = null; arrival.hidden = true; traveling = true;
      desk.dataset.view = 'deposit';
      if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
      const result = {doing:'「これやろう」を地球に残しました。',later:'またいつか、イトカワから連れ帰ります。',expired:'用済みとして記録しました。',done:'対応済みとして記録しました。'};
      returnStatus.textContent = result[action] + ' はやぶさは次の願いを迎えに行きます。';
      universe.classList.remove('returning'); universe.classList.add('departing');
      distanceText.textContent = '次の願いを迎えに'; flightCaption.textContent = '地球を離れ、イトカワへ';
      setTimeout(() => { flightCaption.textContent = 'また長い航路を進んでいます'; }, 1200);
      await refresh();
      setTimeout(() => { traveling = false; universe.classList.remove('departing'); distanceText.textContent = '長い航路を、ひとつずつ'; flightCaption.textContent = 'はやぶさはイトカワで待っています'; render(); }, 2700);
    } catch (_) { returnStatus.textContent = '保存できませんでした。もう一度選んでください。'; }
    finally { choices.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
  }
  function installMotion() {
    if (motionListening) return;
    window.addEventListener('devicemotion', event => {
      const a = event.accelerationIncludingGravity; if (!a) return;
      const force = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
      if (force > 30 && Date.now() - lastMotion > 1400) { lastMotion = Date.now(); returnOne(); }
    });
    motionListening = true;
  }
  async function requestMotion() {
    if (!waiting().length || current || traveling) return;
    try {
      if (typeof DeviceMotionEvent === 'undefined') throw Error('unsupported');
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const permission = await DeviceMotionEvent.requestPermission(); if (permission !== 'granted') throw Error('denied');
      }
      installMotion(); returnStatus.textContent = 'スマホを軽く振ってください。反応しないときは「タップで帰還」を押してください。';
    } catch (_) { returnStatus.textContent = '動きのセンサーを使えません。「タップで帰還」を押してください。'; }
  }
  deposit.addEventListener('click', saveWish);
  shake.addEventListener('click', requestMotion); fallback.addEventListener('click', returnOne);
  choices.addEventListener('click', event => { const action = event.target.closest('button')?.dataset.action; if (action) decide(action); });
  $('#show-history').addEventListener('click', () => { desk.dataset.view = 'history'; });
  $('#hide-history').addEventListener('click', () => { desk.dataset.view = 'deposit'; });
  $('#history-prev').addEventListener('click', () => { historyPage--; render(); });
  $('#history-next').addEventListener('click', () => { historyPage++; render(); });
  legacyPlay.addEventListener('click', async () => {
    if (!current?.audio) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(current.audio);
    try { await new Audio(audioUrl).play(); } catch (_) { returnStatus.textContent = '以前の録音を再生できませんでした。'; }
  });
  window.addEventListener('beforeunload', () => { if (audioUrl) URL.revokeObjectURL(audioUrl); });
  openDB().then(database => { db = database; return refresh(); }).then(() => {
    returnStatus.textContent = waiting().length ? 'スマホを振ると、はやぶさが一つ連れ帰ります。' : 'まず願いを預けてください。';
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission !== 'function') installMotion();
  }).catch(() => { deposit.disabled = shake.disabled = fallback.disabled = true; count.textContent = '端末内の保存を利用できません。'; depositStatus.textContent = '通常モードのブラウザで開き直してください。'; });
})();
