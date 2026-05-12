import './style.css';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const startBtn = document.getElementById('start-btn');
const statusText = document.getElementById('status-text');
const countdown = document.getElementById('countdown');
const intervalInput = document.getElementById('interval');
const intervalVal = document.getElementById('interval-val');
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

// Handle notification actions (when user clicks notification)
LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
  console.log('Notification action performed', notification);
  stopTimer(); 
});

// Handle notification received (when app is in foreground)
LocalNotifications.addListener('localNotificationReceived', (notification) => {
  console.log('Notification received in foreground', notification);
  triggerHapticPattern(getVibrationPattern());
  // We don't call stopTimer() immediately so the user can see the "00:00:00" state
});

// Restore UI State
window.addEventListener('load', async () => {
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
  } else if (isRunning) {
    stopTimer();
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

  const hours = parseInt(intervalInput.value);
  const durationMs = hours * 60 * 60 * 1000;
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
        vibration: getVibrationPattern(), // For Android native support if available
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
    
    // Trigger the haptic pattern if the app is foregrounded
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

/**
 * Manually trigger a vibration pattern using the Haptics plugin.
 * Since @capacitor/haptics doesn't support patterns directly, we pulse it.
 */
async function triggerHapticPattern(pattern) {
  if (!pattern || pattern.length === 0) {
    await Haptics.vibrate();
    return;
  }

  for (let i = 0; i < pattern.length; i++) {
    const duration = pattern[i];
    if (i % 2 === 0) {
      // Vibrate
      if (Capacitor.getPlatform() === 'android') {
        // Android vibrate() uses default duration, we can't easily specify ms 
        // with the standard plugin, but we can call it.
        await Haptics.vibrate();
      } else {
        await Haptics.vibrate({ duration });
      }
    }
    // Wait for the duration (either vibrate or pause)
    await new Promise(resolve => setTimeout(resolve, duration));
  }
}

function getVibrationPattern() {
  const type = vibrationSelect.value;
  switch (type) {
    case 'short': return [100];
    case 'long': return [500];
    case 'triple': return [100, 100, 100, 100, 100]; // Vibrate, Pause, Vibrate, Pause, Vibrate
    case 'custom':
      const val = customVibrationInput.value;
      if (!val) return [200, 100, 200];
      return val.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    default: return [200, 100, 200];
  }
}
