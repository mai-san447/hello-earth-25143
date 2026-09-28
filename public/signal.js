// 応援する人が開くページの動き（/signal?to=軌道ID）。
// 送るのは「信号が1回届いた」という事実だけ。名前・言葉・端末の情報は送らない。
(async () => {
  const $ = selector => document.querySelector(selector);
  const button = $('#signal-send');
  const status = $('#signal-status');
  const star = $('#signal-star');
  const hint = $('#signal-hint');
  const orbitId = new URLSearchParams(location.search).get('to') || '';
  const validOrbit = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(orbitId);
  let sent = 0;
  let sending = false;
  let lastSentAt = 0;
  let motionReady = false;

  if (!validOrbit) {
    status.textContent = 'リンクを確認してください。送り先の星が見つかりません。';
    hint.hidden = true;
    return;
  }

  try {
    const response = await fetch(`/api/signals?orbit=${encodeURIComponent(orbitId)}`);
    const data = await response.json();
    if (!data.enabled) {
      status.textContent = 'この星への信号は、まだ受け付けていません。';
      hint.hidden = true;
      return;
    }
  } catch {
    status.textContent = 'ネットにつながったときに、もう一度開いてください。';
    return;
  }
  button.disabled = false;

  async function send() {
    // 連打で数が膨らまないよう、1回ごとに少し間をあける
    if (sending || Date.now() - lastSentAt < 2500) return;
    sending = true;
    button.disabled = true;
    try {
      const response = await fetch('/api/signals', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({orbitId}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || '信号を送れませんでした。');
      sent++;
      lastSentAt = Date.now();
      star.style.setProperty('--glow', String(Math.min(2.2, 1 + Math.log2(1 + sent) * 0.25)));
      star.classList.remove('signal-pulse');
      void star.offsetWidth;
      star.classList.add('signal-pulse');
      try { navigator.vibrate?.([12, 40, 12]); } catch { /* 振動は任意 */ }
      status.textContent = sent === 1 ? '信号を送りました。星が少し明るくなりました。' : `信号を送りました（${sent}回）。`;
    } catch (error) {
      status.textContent = error.message || '信号を送れませんでした。';
    } finally {
      sending = false;
      button.disabled = false;
    }
  }

  async function enableMotion() {
    if (motionReady || typeof DeviceMotionEvent === 'undefined') return;
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function' && await DeviceMotionEvent.requestPermission() !== 'granted') return;
      window.addEventListener('devicemotion', event => {
        const a = event.acceleration;
        if (a && Math.hypot(a.x || 0, a.y || 0, a.z || 0) >= 15) send();
      });
      motionReady = true;
    } catch {
      // 振れない端末でもボタンで送れる
    }
  }

  button.addEventListener('click', () => {
    enableMotion();
    send();
  });
})();
