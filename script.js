(function () {
  'use strict';

  var STORAGE_KEY = 'todo-app.tasks';
  var CATEGORIES = ['工作', '生活', '学习', '其他'];

  var PRIORITY_META = {
    high: { label: '高', cls: 'pri-high' },
    medium: { label: '中', cls: 'pri-medium' },
    low: { label: '低', cls: 'pri-low' }
  };

  var state = {
    tasks: load(),
    filter: 'all',
    sort: 'manual'
  };

  var els = {
    list: document.getElementById('task-list'),
    empty: document.getElementById('empty'),
    filters: document.getElementById('filters'),
    sortGroup: document.getElementById('sort-group'),
    form: document.getElementById('add-form'),
    input: document.getElementById('add-input'),
    addPriority: document.getElementById('add-priority'),
    addDateYear: document.getElementById('add-date-year'),
    addDateMonth: document.getElementById('add-date-month'),
    addDateDay: document.getElementById('add-date-day'),
    addCategory: document.getElementById('add-category'),
    dateLabel: document.getElementById('date-label'),
    countLabel: document.getElementById('count-label'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    clearDone: document.getElementById('clear-done')
  };

  // ---------- 持久化 ----------
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ---------- 工具 ----------
  // 把 'YYYY-MM-DD' 按本地时区解析，避免 new Date(字符串) 的时区歧义导致日期偏移
  function parseLocalDate(iso) {
    var p = iso.split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = parseLocalDate(iso);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function dueStatus(iso) {
    if (!iso) return { text: '', cls: '' };
    var today = startOfDay(new Date());
    var due = startOfDay(parseLocalDate(iso));
    var diff = Math.round((due - today) / 86400000);
    if (diff < 0) return { text: '已过期 · ' + fmtDate(iso), cls: 'due-overdue' };
    if (diff === 0) return { text: '今天截止', cls: 'due-today' };
    if (diff === 1) return { text: '明天截止', cls: '' };
    return { text: fmtDate(iso) + '截止', cls: '' };
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function initDateSelects() {
    var now = new Date();
    var y = now.getFullYear();
    var i, opt;

    for (i = 0; i <= 3; i++) {
      opt = document.createElement('option');
      opt.value = String(y + i);
      opt.textContent = (y + i) + '年';
      els.addDateYear.appendChild(opt);
    }
    els.addDateYear.value = String(y);

    opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '月';
    els.addDateMonth.appendChild(opt);
    for (i = 1; i <= 12; i++) {
      opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = i + '月';
      els.addDateMonth.appendChild(opt);
    }

    updateDayOptions();
  }

  function updateDayOptions() {
    var y = parseInt(els.addDateYear.value, 10);
    var m = parseInt(els.addDateMonth.value, 10);
    var prev = els.addDateDay.value;
    var i, opt;

    els.addDateDay.innerHTML = '';
    opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '日';
    els.addDateDay.appendChild(opt);

    if (!m) return;

    var n = daysInMonth(y, m);
    for (i = 1; i <= n; i++) {
      opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = i + '日';
      els.addDateDay.appendChild(opt);
    }
    if (prev && parseInt(prev, 10) <= n) els.addDateDay.value = prev;
  }

  function getSelectedDate() {
    var y = els.addDateYear.value;
    var m = els.addDateMonth.value;
    var d = els.addDateDay.value;
    if (!y || !m || !d) return '';
    return y + '-' + pad2(parseInt(m, 10)) + '-' + pad2(parseInt(d, 10));
  }

  function resetDateSelects() {
    els.addDateMonth.value = '';
    els.addDateDay.value = '';
    updateDayOptions();
  }

  // ---------- 渲染 ----------
  function visibleTasks() {
    var list = state.tasks.slice();
    if (state.filter !== 'all') {
      list = list.filter(function (t) { return t.category === state.filter; });
    }
    if (state.sort === 'priority') {
      var weight = { high: 0, medium: 1, low: 2, none: 3 };
      list.sort(function (a, b) {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return weight[a.priority] - weight[b.priority];
      });
    } else if (state.sort === 'due') {
      list.sort(function (a, b) {
        if (a.done !== b.done) return a.done ? 1 : -1;
        var da = a.dueDate ? a.dueDate : '9999-99-99';
        var db = b.dueDate ? b.dueDate : '9999-99-99';
        return da < db ? -1 : da > db ? 1 : 0;
      });
    }
    // manual: 保持数组原顺序
    return list;
  }

  function render() {
    var list = visibleTasks();
    els.list.innerHTML = '';

    list.forEach(function (task) {
      els.list.appendChild(buildItem(task));
    });

    var total = state.tasks.length;
    var open = state.tasks.filter(function (t) { return !t.done; }).length;
    var done = total - open;
    els.countLabel.textContent = open + ' 项待办 / 共 ' + total;

    var pct = total ? Math.round(done / total * 100) : 0;
    els.progressFill.style.width = pct + '%';
    els.progressText.textContent = total ? (done + ' / ' + total) : '0 / 0';

    els.clearDone.classList.toggle('show', done > 0);

    els.empty.classList.toggle('show', list.length === 0);

    renderFilters();
    renderSort();
  }

  function buildItem(task) {
    var li = document.createElement('li');
    li.className = 'task' + (task.done ? ' done' : '');
    li.dataset.id = task.id;
    li.draggable = true;

    // 勾选
    var check = document.createElement('div');
    check.className = 'check';
    check.innerHTML = '✓';
    check.setAttribute('role', 'checkbox');
    check.setAttribute('aria-checked', task.done ? 'true' : 'false');
    check.addEventListener('click', function () { toggleDone(task.id); });

    // 主体
    var body = document.createElement('div');
    body.className = 'task-body';

    var text = document.createElement('div');
    text.className = 'task-text';
    text.textContent = task.text;
    text.addEventListener('click', function () { startEdit(li, task); });
    body.appendChild(text);

    var meta = document.createElement('div');
    meta.className = 'task-meta';

    var p = PRIORITY_META[task.priority];
    if (p) {
      var chip = document.createElement('span');
      chip.className = 'meta-chip';
      chip.innerHTML = '<span class="pri-dot ' + p.cls + '"></span>' + p.label;
      meta.appendChild(chip);
    }

    var due = dueStatus(task.dueDate);
    if (due.text) {
      var dueChip = document.createElement('span');
      dueChip.className = 'meta-chip ' + due.cls;
      dueChip.textContent = due.text;
      meta.appendChild(dueChip);
    }

    if (task.category) {
      var cat = document.createElement('span');
      cat.className = 'cat-tag';
      cat.textContent = task.category;
      meta.appendChild(cat);
    }

    if (meta.children.length) body.appendChild(meta);

    // 操作
    var actions = document.createElement('div');
    actions.className = 'task-actions';

    var up = document.createElement('button');
    up.className = 'move-btn';
    up.innerHTML = '↑';
    up.title = '上移';
    up.addEventListener('click', function () { move(task.id, -1); });

    var down = document.createElement('button');
    down.className = 'move-btn';
    down.innerHTML = '↓';
    down.title = '下移';
    down.addEventListener('click', function () { move(task.id, 1); });

    var del = document.createElement('button');
    del.className = 'del-btn';
    del.innerHTML = '×';
    del.title = '删除';
    del.addEventListener('click', function () { remove(task.id); });

    actions.appendChild(up);
    actions.appendChild(down);
    actions.appendChild(del);

    li.appendChild(check);
    li.appendChild(body);
    li.appendChild(actions);

    // 桌面拖拽
    li.addEventListener('dragstart', function (e) {
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', task.id); } catch (err) {}
      state.dragId = task.id;
    });
    li.addEventListener('dragend', function () {
      li.classList.remove('dragging');
      state.dragId = null;
      clearDropTargets();
    });
    li.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      clearDropTargets();
      li.classList.add('drop-target');
    });
    li.addEventListener('drop', function (e) {
      e.preventDefault();
      dropOn(task.id);
    });

    return li;
  }

  function renderFilters() {
    var cats = ['all'].concat(CATEGORIES);
    els.filters.innerHTML = '';
    cats.forEach(function (c) {
      var btn = document.createElement('button');
      btn.className = 'filter' + (state.filter === c ? ' active' : '');
      btn.textContent = c === 'all' ? '全部' : c;
      btn.dataset.cat = c;
      btn.addEventListener('click', function () {
        state.filter = c;
        if (c !== 'all') {
          els.addCategory.value = c;
        }
        render();
      });
      els.filters.appendChild(btn);
    });

    // 让添加表单的分类跟随当前选中的筛选
    if (state.filter !== 'all') {
      els.addCategory.value = state.filter;
    }
  }

  function renderSort() {
    var btns = els.sortGroup.querySelectorAll('.sort-btn');
    btns.forEach(function (b) {
      b.classList.toggle('active', b.dataset.sort === state.sort);
    });
  }

  function clearDropTargets() {
    els.list.querySelectorAll('.drop-target').forEach(function (el) {
      el.classList.remove('drop-target');
    });
  }

  // ---------- 操作 ----------
  function add(text, priority, dueDate, category) {
    state.tasks.unshift({
      id: uid(),
      text: text,
      done: false,
      priority: priority,
      dueDate: dueDate,
      category: category,
      createdAt: Date.now()
    });
    save();
    render();
  }

  function remove(id) {
    var li = els.list.querySelector('[data-id="' + id + '"]');
    if (!li) {
      state.tasks = state.tasks.filter(function (t) { return t.id !== id; });
      save();
      render();
      return;
    }
    li.classList.add('removing');
    li.addEventListener('animationend', function handler(e) {
      if (e.animationName !== 'remove-out') return;
      li.removeEventListener('animationend', handler);
      state.tasks = state.tasks.filter(function (t) { return t.id !== id; });
      save();
      render();
    });
  }

  function toggleDone(id) {
    var t = state.tasks.find(function (x) { return x.id === id; });
    if (t) { t.done = !t.done; }
    save();
    render();
  }

  function move(id, delta) {
    var idx = state.tasks.findIndex(function (t) { return t.id === id; });
    var target = idx + delta;
    if (idx < 0 || target < 0 || target >= state.tasks.length) return;
    var arr = state.tasks;
    var tmp = arr[idx];
    arr[idx] = arr[target];
    arr[target] = tmp;
    save();
    render();
  }

  function dropOn(targetId) {
    var dragId = state.dragId;
    if (!dragId || dragId === targetId) return;
    var from = state.tasks.findIndex(function (t) { return t.id === dragId; });
    var to = state.tasks.findIndex(function (t) { return t.id === targetId; });
    if (from < 0 || to < 0) return;
    var arr = state.tasks;
    var item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);
    save();
    render();
  }

  function startEdit(li, task) {
    var textEl = li.querySelector('.task-text');
    if (!textEl) return;
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit-input';
    input.value = task.text;
    textEl.parentNode.insertBefore(input, textEl);
    textEl.style.display = 'none';
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    var finished = false;
    function finish(commit) {
      if (finished) return;
      finished = true;
      var val = input.value.trim();
      if (commit && val) {
        task.text = val;
        textEl.textContent = val;
        save();
      }
      input.remove();
      textEl.style.display = '';
    }

    input.addEventListener('blur', function () { finish(true); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { finish(true); }
      else if (e.key === 'Escape') { finish(false); }
    });
  }

  function clearDone() {
    state.tasks = state.tasks.filter(function (t) { return !t.done; });
    save();
    render();
  }

  // ---------- 事件绑定 ----------
  els.form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = els.input.value.trim();
    if (!text) return;
    add(text, els.addPriority.value, getSelectedDate(), els.addCategory.value);
    els.input.value = '';
    resetDateSelects();
    els.input.focus();
  });

  els.sortGroup.addEventListener('click', function (e) {
    var btn = e.target.closest('.sort-btn');
    if (!btn) return;
    state.sort = btn.dataset.sort;
    render();
  });

  els.clearDone.addEventListener('click', clearDone);

  // 顶部日期
  (function setDate() {
    var d = new Date();
    var week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    els.dateLabel.textContent =
      d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() +
      '日 · 星期' + week;
  })();

  // 初始化分类下拉选项（固定四个，只需填一次）
  CATEGORIES.forEach(function (c) {
    var opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    els.addCategory.appendChild(opt);
  });

  // 初始化截止日期选择（年/月/日下拉，绕开原生日期选择器异常）
  els.addDateYear.addEventListener('change', updateDayOptions);
  els.addDateMonth.addEventListener('change', updateDayOptions);
  initDateSelects();

  render();
})();
