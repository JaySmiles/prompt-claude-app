import './style.css';

const startBtn = document.getElementById('start-btn');
const statusText = document.getElementById('status-text');
const countdown = document.getElementById('countdown');
const intervalInput = document.getElementById('interval');
const intervalVal = document.getElementById('interval-val');
const vibrationSelect = document.getElementById('vibration');
const customVibrationContainer = document.getElementById('custom-vibration-container');
const customVibrationInput = document.getElementById('custom-vibration');

let timer = null;
let endTime = null;

// Initialize Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then((reg) => {
      console.log('Service Worker registered');
      // If a timer was running, let the SW know just in case it restarted
      if (localStorage.getItem('isTimerRunning') === 'true') {
        const remaining = parseInt(localStorage.getItem('endTime')) - Date.now();
        if (remaining > 0) {
          navigator.serviceWorker.ready.then(r => {
            r.active.postMessage({
              action: 'scheduleNotification',
              delay: remaining,
              pattern: JSON.parse(localStorage.getItem('vibrationPattern'))
            });
          });
        }
      }
    })
    .catch((err) => console.error('Service Worker registration failed', err));
}

// Restore UI State
window.addEventListener('load', () => {
  const isRunning = localStorage.getItem('isTimerRunning') === 'true';
  const savedEndTime = parseInt(localStorage.getItem('endTime'));
  const savedInterval = localStorage.getItem('interval');
  const savedVibration = localStorage.getItem('vibration');

  if (savedInterval) {
    intervalInput.value = savedInterval;
    intervalVal.textContent = `${savedInterval}h`;
  }
  if (savedVibration) {
    vibrationSelect.value = savedVibration;
    if (savedVibration === 'custom') customVibrationContainer.classList.remove('hidden');
  }

  if (isRunning && savedEndTime > Date.now()) {
    endTime = savedEndTime;
    startTimerUI();
  }
});

// Update interval value display
intervalInput.addEventListener('input', () => {
  intervalVal.textContent = `${intervalInput.value}h`;
  localStorage.setItem('interval', intervalInput.value);
});

vibrationSelect.addEventListener('change', () => {
  localStorage.setItem('vibration', vibrationSelect.value);
  if (vibrationSelect.value === 'custom') {
    customVibrationContainer.classList.remove('hidden');
  } else {
    customVibrationContainer.classList.add('hidden');
  }
});

startBtn.addEventListener('click', async () => {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('Please enable notifications to use this app!');
    return;
  }

  if (timer) {
    stopTimer();
    return;
  }

  const hours = parseInt(intervalInput.value);
  const durationMs = hours * 60 * 60 * 1000;
  endTime = Date.now() + durationMs;

  // Persist State
  localStorage.setItem('isTimerRunning', 'true');
  localStorage.setItem('endTime', endTime.toString());
  localStorage.setItem('vibrationPattern', JSON.stringify(getVibrationPattern()));

  startTimerUI();

  // Schedule in SW
  const registration = await navigator.serviceWorker.ready;
  registration.active.postMessage({
    action: 'scheduleNotification',
    delay: durationMs,
    pattern: getVibrationPattern()
  });
});

function startTimerUI() {
  startBtn.querySelector('.btn-text').textContent = 'Stop Reminder';
  statusText.textContent = 'Notification scheduled for';
  countdown.classList.remove('hidden');
  updateCountdown();
  timer = setInterval(updateCountdown, 1000);
}

function stopTimer() {
  clearInterval(timer);
  timer = null;
  localStorage.setItem('isTimerRunning', 'false');
  
  startBtn.querySelector('.btn-text').textContent = 'Start Reminder';
  statusText.textContent = 'Ready to start';
  countdown.classList.add('hidden');

  // Cancel in SW
  navigator.serviceWorker.ready.then(registration => {
    registration.active.postMessage({ action: 'cancelNotification' });
  });
}

function updateCountdown() {
  const now = Date.now();
  const diff = endTime - now;

  if (diff <= 0) {
    clearInterval(timer);
    timer = null;
    localStorage.setItem('isTimerRunning', 'false');
    startBtn.querySelector('.btn-text').textContent = 'Start Reminder';
    statusText.textContent = 'Notification sent!';
    countdown.textContent = '00:00:00';
    return;
  }

  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  countdown.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function pad(num) {
  return num.toString().padStart(2, '0');
}

function getVibrationPattern() {
  const type = vibrationSelect.value;
  switch (type) {
    case 'short': return [100];
    case 'long': return [500];
    case 'triple': return [100, 50, 100, 50, 100];
    case 'custom':
      const val = customVibrationInput.value;
      if (!val) return [200, 100, 200];
      return val.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    default: return [200, 100, 200];
  }
}
