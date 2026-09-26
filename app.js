(() => {
  const $ = selector => document.querySelector(selector);
  const wish = $('#wish'), speak = $('#speak'), speechNote = $('#speech-note');
  const deposit = $('#deposit'), depositStatus = $('#deposit-status');
  const count = $('#count'), shake = $('#shake'), fallback = $('#fallback');
  const universe = $('#universe'), distanceText = $('#distance-text');
  const flightCaption = $('#flight-caption'), returnStatus = $('#return-status');
  const arrival = $('#arrival'), returnedText = $('#returned-text'), legacyPlay = $('#legacy-play');
  const choices = $('#choices'), history = $('#history');
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const labels = { doing:'取り組み中', expired:'用済み', done:'対応済み' };
  let db, items = [], current = null, traveling = false, lastId = null;
  let recognition, listening = false, motionListening = false, lastMotion = 0, audioUrl = null;

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
    $('#log-count').textContent = `${settled.length} 件`;
    $('#history-empty').hidden = Boolean(settled.length);
    history.replaceChildren();
    for (const item of settled) {
      const li = document.createElement('li'), title = document.createElement('span'), status = document.createElement('span');
      title.textContent = item.text || '以前、声で預けた願い'; status.textContent = labels[item.status];
      li.append(title, status); history.append(li);
    }
  }
  function speakWish() {
    if (!Recognition) { depositStatus.textContent = 'このブラウザでは音声入力を利用できません。キーボードのマイクか文字入力を使ってください。'; return; }
    if (listening) { recognition.stop(); return; }
    recognition = new Recognition(); recognition.lang = 'ja-JP'; recognition.interimResults = false; recognition.continuous = false;
    recognition.onresult = event => {
      const text = Array.from(event.results).map(result => result[0]?.transcript || '').join('');
      wish.value = [wish.value.trim(), text.trim()].filter(Boolean).join(' ');
      depositStatus.textContent = '声を文字にしました。内容を確認して預けてください。';
    };
    recognition.onerror = event => { depositStatus.textContent = event.error === 'not-allowed' ? 'マイクが許可されませんでした。文字入力を使ってください。' : '聞き取れませんでした。もう一度話すか、文字で入力してください。'; };
    recognition.onend = () => { listening = false; speak.classList.remove('listening'); speak.textContent = '🎙 音声で入力'; speechNote.textContent = '文字で入力してもOK'; };
    try { recognition.start(); listening = true; speak.classList.add('listening'); speak.textContent = '■ 入力を終了'; speechNote.textContent = '話してください'; depositStatus.textContent = '聞いています…'; }
    catch (_) { depositStatus.textContent = '音声入力を開始できませんでした。文字入力を使ってください。'; }
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
      traveling = false; render(); arrival.scrollIntoView({behavior:'smooth',block:'nearest'});
    }, 2700);
  }
  async function decide(action) {
    if (!current || traveling) return;
    const next = {...current,status:action === 'later' ? 'waiting' : action,updatedAt:Date.now()};
    choices.querySelectorAll('button').forEach(button => { button.disabled = true; });
    try {
      await store('readwrite', object => object.put(next));
      current = null; arrival.hidden = true; traveling = true;
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
  speak.addEventListener('click', speakWish); deposit.addEventListener('click', saveWish);
  shake.addEventListener('click', requestMotion); fallback.addEventListener('click', returnOne);
  choices.addEventListener('click', event => { const action = event.target.closest('button')?.dataset.action; if (action) decide(action); });
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
