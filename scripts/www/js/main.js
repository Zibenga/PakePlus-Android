// ===== 工具函数 =====
var $ = function(s) { return document.querySelector(s); };
var pad = function(n) { return String(n).padStart(2, '0'); };

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch(e) { return fallback; }
}
function saveJSON(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ===== 主题 =====
var currentTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', currentTheme);
updateThemeIcon();

$('#themeBtn').addEventListener('click', function() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('theme', currentTheme);
  updateThemeIcon();
  // 更新 theme-color
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = currentTheme === 'dark' ? '#0f0f1a' : '#f4f0eb';
});

function updateThemeIcon() {
  $('#themeBtn').textContent = currentTheme === 'dark' ? '🌙' : '☀️';
}

// ===== 设置面板 =====
var SETTINGS_KEY = 'dashboard_settings';
var settings = loadJSON(SETTINGS_KEY, {
  countdownLabel: '下班',
  countdownTime: '18:00',
  weekendText: '今天不上班',
  workdayOnly: true
});

$('#settingsBtn').addEventListener('click', function() {
  fillSettingsForm();
  $('#settingsPanel').classList.add('show');
  $('#overlay').classList.add('show');
});
$('#settingsClose').addEventListener('click', closeSettings);
$('#overlay').addEventListener('click', closeSettings);

function closeSettings() {
  $('#settingsPanel').classList.remove('show');
  $('#overlay').classList.remove('show');
  // 保存设置
  settings.countdownLabel = $('#cfgCountdownLabel').value.trim() || '下班';
  settings.countdownTime = $('#cfgCountdownTime').value || '18:00';
  settings.weekendText = $('#cfgWeekendText').value.trim() || '今天不上班';
  settings.workdayOnly = $('#cfgWorkdayOnly').checked;
  saveJSON(SETTINGS_KEY, settings);
  updateCountdown();
}

function fillSettingsForm() {
  $('#cfgCountdownLabel').value = settings.countdownLabel;
  $('#cfgCountdownTime').value = settings.countdownTime;
  $('#cfgWeekendText').value = settings.weekendText;
  $('#cfgWorkdayOnly').checked = settings.workdayOnly;
}

// ===== 时钟 =====
var WEEKDAYS = ['日','一','二','三','四','五','六'];

function updateClock() {
  var now = new Date();
  $('#clock').textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
  var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  var w = WEEKDAYS[now.getDay()];
  $('#date').textContent = y + '年' + m + '月' + d + '日 星期' + w;
  updateCountdown();
}

function updateCountdown() {
  var now = new Date();
  var hour = now.getHours();
  var day = now.getDay();
  var isWeekend = (day === 0 || day === 6);

  var targetParts = settings.countdownTime.split(':');
  var targetH = parseInt(targetParts[0]) || 18;
  var targetM = parseInt(targetParts[1]) || 0;
  var label = settings.countdownLabel;

  if (isWeekend && settings.workdayOnly) {
    $('#countdown').textContent = settings.weekendText;
    return;
  }

  var nowMins = hour * 60 + now.getMinutes();
  var targetMins = targetH * 60 + targetM;

  if (nowMins < targetMins) {
    var diff = targetMins - nowMins;
    var h = Math.floor(diff / 60);
    var m = diff % 60;
    $('#countdown').textContent = '距' + label + ' ' + h + '小时' + m + '分钟';
  } else {
    // 已过目标时间，算到明天
    var tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(targetH, targetM, 0, 0);
    var diffMs = tomorrow - now;
    var hh = Math.floor(diffMs / 3600000);
    var mm = Math.floor((diffMs % 3600000) / 60000);
    $('#countdown').textContent = label + '已过，距明天 ' + hh + '小时' + mm + '分钟';
  }
}

// ===== 番茄钟 =====
var tomatoTotal = 25 * 60;
var tomatoLeft = tomatoTotal;
var tomatoRunning = false;
var tomatoTimer = null;
var tomatoDone = loadJSON('tomato_done_' + getToday(), 0);

function updateTomatoDisplay() {
  var m = Math.floor(tomatoLeft / 60);
  var s = tomatoLeft % 60;
  $('#tomatoDisplay').textContent = pad(m) + ':' + pad(s);
  $('#tomatoCount').textContent = tomatoDone;
}

$('#tomatoStart').addEventListener('click', function() {
  if (tomatoRunning) {
    clearInterval(tomatoTimer);
    tomatoRunning = false;
    $('#tomatoStart').textContent = '继续';
  } else {
    tomatoRunning = true;
    $('#tomatoStart').textContent = '暂停';
    tomatoTimer = setInterval(function() {
      tomatoLeft--;
      if (tomatoLeft <= 0) {
        clearInterval(tomatoTimer);
        tomatoRunning = false;
        tomatoDone++;
        saveJSON('tomato_done_' + getToday(), tomatoDone);
        tomatoLeft = tomatoTotal;
        $('#tomatoStart').textContent = '开始';
        updateTomatoDisplay();
        if (Notification.permission === 'granted') {
          new Notification('🍅 番茄完成！', { body: '休息5分钟吧' });
        }
        return;
      }
      updateTomatoDisplay();
    }, 1000);
  }
});

$('#tomatoReset').addEventListener('click', function() {
  clearInterval(tomatoTimer);
  tomatoRunning = false;
  tomatoLeft = tomatoTotal;
  $('#tomatoStart').textContent = '开始';
  updateTomatoDisplay();
});

// ===== 喝水 =====
var waterCount = loadJSON('water_' + getToday(), 0);

function renderWater() {
  var container = $('#waterVisual');
  container.innerHTML = '';
  for (var i = 0; i < 8; i++) {
    var drop = document.createElement('div');
    drop.className = 'water-drop' + (i < waterCount ? ' filled' : '');
    container.appendChild(drop);
  }
  $('#waterCurrent').textContent = waterCount;
}

$('#waterAdd').addEventListener('click', function() {
  if (waterCount < 8) {
    waterCount++;
    saveJSON('water_' + getToday(), waterCount);
    renderWater();
    if (waterCount === 8 && Notification.permission === 'granted') {
      new Notification('💧 喝水达标！', { body: '今天水分补充够了' });
    }
  }
});

// ===== 待办 =====
var todos = loadJSON('todos_' + getToday(), []);

function renderTodos() {
  var list = $('#todoList');
  list.innerHTML = '';
  for (var i = 0; i < todos.length; i++) {
    var t = todos[i];
    var li = document.createElement('li');
    li.className = 'todo-item' + (t.done ? ' done' : '');
    li.innerHTML = '<input type="checkbox" ' + (t.done ? 'checked' : '') + ' data-i="' + i + '">' +
      '<span class="todo-text">' + escHTML(t.text) + '</span>' +
      '<button class="todo-del" data-i="' + i + '">×</button>';
    list.appendChild(li);
  }
  saveJSON('todos_' + getToday(), todos);
}

function escHTML(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

$('#todoAdd').addEventListener('click', addTodo);
$('#todoInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') addTodo(); });

function addTodo() {
  var input = $('#todoInput');
  var text = input.value.trim();
  if (!text) return;
  todos.unshift({ text: text, done: false });
  input.value = '';
  renderTodos();
}

$('#todoList').addEventListener('click', function(e) {
  var i = parseInt(e.target.dataset.i);
  if (isNaN(i)) return;
  if (e.target.type === 'checkbox') {
    todos[i].done = !todos[i].done;
    renderTodos();
  } else if (e.target.classList.contains('todo-del')) {
    todos.splice(i, 1);
    renderTodos();
  }
});

// ===== 便签 =====
var noteArea = $('#noteArea');
noteArea.value = loadJSON('note_' + getToday(), '');
noteArea.addEventListener('input', function() {
  saveJSON('note_' + getToday(), noteArea.value);
});

// ===== 通知权限 =====
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// ===== 初始化 =====
updateClock();
setInterval(updateClock, 10000);
updateTomatoDisplay();
renderWater();
renderTodos();
