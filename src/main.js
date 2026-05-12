import './style.css';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const startBtn = document.getElementById('start-btn');
const statusText = document.getElementById('status-text');
const countdown = document.getElementById('countdown');
const modeSelect = document.getElementById('mode');
const intervalContainer = document.getElementById('interval-container');
const specificTimeContainer = document.getElementById('specific-time-container');
const intervalInput = document.getElementById('interval');
const intervalVal = document.getElementById('interval-val');
const specificTimeInput = document.getElementById('specific-time');
const vibrationSelect = document.getElementById('vibration');
const customVibrationContainer = document.getElementById('custom-vibration-container');
const customVibrationInput = document.getElementById('custom-vibration');
const testVibrationBtn = document.getElementById('test-vibration-btn');

let timer = null;
let endTime = null;

// Initialize Service Worker (only for web/PWA context)
if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('Service Worker registered'))
    .catch((err) => console.error('Service Worker registration failed', err));
}

// Handle notification actions
LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
  console.log('Notification action performed', notification);
  stopTimer(); 
});

// Handle notification received in foreground
LocalNotifications.addListener('localNotificationReceived', (notification) => {
  console.log('Notification received in foreground', notification);
  triggerHapticPattern(getVibrationPattern());
});

// Restore UI State
window.addEventListener('load', async () => {
  const isRunning = localStorage.getItem('isTimerRunning') === 'true';
  const savedEndTime = parseInt(localStorage.getItem('endTime'));
  const savedMode = localStorage.getItem('mode') || 'interval';
  const savedInterval = localStorage.getItem('interval');
  const savedSpecificTime = localStorage.getItem('specificTime');
  const savedVibration = localStorage.getItem('vibration');

  modeSelect.value = savedMode;
  updateModeUI(savedMode);

  if (savedInterval) {
    intervalInput.value = savedInterval;
    intervalVal.textContent = `${savedInterval}h`;
  }
  if (savedSpecificTime) {
    specificTimeInput.value = savedSpecificTime;
  }
  if (savedVibration) {
    vibrationSelect.value = savedVibration;
    if (savedVibration === 'custom') customVibrationContainer.classList.remove('hidden');
  }

  if (isRunning && savedEndTime > Date.now()) {
    endTime = savedEndTime;
    startTimerUI();
  } else if (isRunning) {
    stopTimer();
  }
});

modeSelect.addEventListener('change', () => {
  const mode = modeSelect.value;
  localStorage.setItem('mode', mode);
  updateModeUI(mode);
});

function updateModeUI(mode) {
  if (mode === 'interval') {
    intervalContainer.classList.remove('hidden');
    specificTimeContainer.classList.add('hidden');
  } else {
    intervalContainer.classList.add('hidden');
    specificTimeContainer.classList.remove('hidden');
  }
}

intervalInput.addEventListener('input', () => {
  intervalVal.textContent = `${intervalInput.value}h`;
  localStorage.setItem('interval', intervalInput.value);
});

specificTimeInput.addEventListener('change', () => {
  localStorage.setItem('specificTime', specificTimeInput.value);
});

vibrationSelect.addEventListener('change', () => {
  localStorage.setItem('vibration', vibrationSelect.value);
  if (vibrationSelect.value === 'custom') {
    customVibrationContainer.classList.remove('hidden');
  } else {
    customVibrationContainer.classList.add('hidden');
  }
});

testVibrationBtn.addEventListener('click', () => {
  triggerHapticPattern(getVibrationPattern());
});

startBtn.addEventListener('click', async () => {
  if (timer) {
    await stopTimer();
    return;
  }

  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') {
    alert('Please enable notifications to use this app!');
    return;
  }

  const mode = modeSelect.value;
  let durationMs = 0;

  if (mode === 'interval') {
    const hours = parseInt(intervalInput.value);
    durationMs = hours * 60 * 60 * 1000;
  } else {
    const timeVal = specificTimeInput.value; // "HH:MM"
    if (!timeVal) {
      alert('Please select a valid time!');
      return;
    }
    const [hours, minutes] = timeVal.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    if (scheduledTime <= now) {
      // If time has passed today, schedule for tomorrow
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    durationMs = scheduledTime.getTime() - now.getTime();
  }

  endTime = Date.now() + durationMs;

  localStorage.setItem('isTimerRunning', 'true');
  localStorage.setItem('endTime', endTime.toString());
  localStorage.setItem('vibrationPattern', JSON.stringify(getVibrationPattern()));

  startTimerUI();
  await scheduleNativeNotification(durationMs);
});

async function scheduleNativeNotification(delayMs) {
  await LocalNotifications.schedule({
    notifications: [
      {
        title: 'Prompt Claude!',
        body: 'Time to check in with Claude!',
        id: 1,
        schedule: { at: new Date(Date.now() + delayMs) },
      }
    ]
  });
}

async function cancelNativeNotifications() {
  await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
}

function startTimerUI() {
  startBtn.querySelector('.btn-text').textContent = 'Stop Reminder';
  const timeString = new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  statusText.textContent = `Notification scheduled for ${timeString}`;
  countdown.classList.remove('hidden');
  updateCountdown();
  timer = setInterval(updateCountdown, 1000);
}

async function stopTimer() {
  clearInterval(timer);
  timer = null;
  localStorage.setItem('isTimerRunning', 'false');
  
  startBtn.querySelector('.btn-text').textContent = 'Start Reminder';
  statusText.textContent = 'Ready to start';
  countdown.classList.add('hidden');

  await cancelNativeNotifications();
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
    
    triggerHapticPattern(getVibrationPattern());
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

async function triggerHapticPattern(pattern) {
  if (!pattern || pattern.length === 0) {
    await Haptics.vibrate();
    return;
  }

  for (let i = 0; i < pattern.length; i++) {
    const duration = pattern[i];
    if (i % 2 === 0) {
      await Haptics.vibrate();
    }
    await new Promise(resolve => setTimeout(resolve, duration));
  }
}

function getVibrationPattern() {
  const type = vibrationSelect.value;
  switch (type) {
    case 'short': return [100];
    case 'long': return [500];
    case 'triple': return [100, 100, 100, 100, 100];
    case 'custom':
      const val = customVibrationInput.value;
      if (!val) return [200, 100, 200];
      return val.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    default: return [200, 100, 200];
  }
}
