'use strict';
(() => {
  const start = document.querySelector('#start-timer');
  const stop = document.querySelector('#stop-timer');
  const reset = document.querySelector('#reset-timer');
  const status = document.querySelector('#timer-status');
  const output = document.querySelector('#time-left');
  const image = document.querySelector('#redeployInfo');
  const keyImage = document.querySelector('#uKeyImg');
  const duration = 10000;
  let remaining = duration;
  let deadline = 0;
  let interval = null;
  let state = 'Ready';
  let lastFrame = '';

  function render() {
    const seconds = Math.max(0, Math.ceil(remaining / 1000));
    // Keep the live region quiet between actual state changes.
    if (output.textContent !== String(seconds)) output.textContent = seconds;
    if (status.textContent !== state) status.textContent = state;
    document.querySelector('#timer-idle').hidden = state !== 'Ready';
    const frame = state === 'Ready' ? '0' : state === 'Complete' ? 'Love' : String(Math.min(10, 11 - seconds));
    if (frame !== lastFrame) {
      image.src = `pic/redeploy/redeploy${frame}.png`;
      image.alt = state === 'Complete' ? 'Original CBMC redeploy completion image' : `Redeploy practice: ${seconds} seconds remaining`;
      lastFrame = frame;
    }
    start.disabled = state === 'Running' || state === 'Complete';
    stop.disabled = state !== 'Running';
    start.lastChild.textContent = state === 'Paused' ? 'Resume' : 'Start';
    keyImage.src = state === 'Running' ? 'pic/u%20key%20logo.png' : 'pic/u%20logo%20off.png';
  }
  function clearTimer() {
    if (interval !== null) clearInterval(interval);
    interval = null;
  }
  function tick() {
    // Deadline-based time avoids accumulating setInterval drift on slow frames.
    remaining = Math.max(0, deadline - performance.now());
    if (remaining === 0) {
      clearTimer();
      state = 'Complete';
    }
    render();
  }
  function run() {
    if (state === 'Running' || state === 'Complete') return;
    deadline = performance.now() + remaining;
    state = 'Running';
    render();
    interval = setInterval(tick, 50);
  }
  function pause() {
    if (state !== 'Running') return;
    remaining = Math.max(0, deadline - performance.now());
    clearTimer();
    state = remaining === 0 ? 'Complete' : 'Paused';
    render();
  }
  function restart() {
    clearTimer();
    remaining = duration;
    state = 'Ready';
    render();
  }
  start.addEventListener('click', run);
  stop.addEventListener('click', pause);
  reset.addEventListener('click', restart);
  document.addEventListener('keydown', event => {
    const isTyping = event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
    if (event.code !== 'KeyU' || event.repeat || event.ctrlKey || event.altKey || event.metaKey || isTyping || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    if (state === 'Running') pause();
    else if (state === 'Complete') restart();
    else run();
  });
  window.addEventListener('pagehide', clearTimer);
  render();
})();
