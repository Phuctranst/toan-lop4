/**
 * API lưu dữ liệu cho web "Toán lớp 4" – chạy trên Google Apps Script,
 * dữ liệu nằm trong chính Google Sheets chứa mã này.
 * Làm theo HUONG_DAN.md để cài đặt.
 */
const SALT = 'toan4-kntt-';              // PHẢI giống hằng SALT trong index.html
const ADMIN_PASSWORD = 'admin123';       // <<< ĐỔI mật khẩu quản trị tại đây (tài khoản: admin)
const SHEET_ID = '11Dm0dKL79OFVFAdMU5n6zDe9CZEhdTKZYDkaPzFJLso';
const TZ = 'Asia/Ho_Chi_Minh';
const SHEETS = {
  Users:    ['username', 'name', 'hash', 'profile', 'created', 'lastLogin'],
  Results:  ['ts', 'username', 'name', 'exam', 'title', 'score', 'seconds', 'allowed', 'timeout', 'topics'],
  Logs:     ['ts', 'username', 'event', 'detail'],
  Activity: ['day', 'username', 'minutes']
};

function sh(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID);
  let s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.appendRow(SHEETS[name]);
    s.setFrozenRows(1);
    const col = SHEETS[name].indexOf('username') + 1;
    s.getRange(1, col, s.getMaxRows(), 1).setNumberFormat('@'); // giữ tên đăng nhập dạng chữ
  }
  return s;
}
function sha(str) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function hashOf(u, p) { return 'h' + sha(SALT + String(u).trim().toLowerCase() + ':' + p); }
function rows(name) {
  const v = sh(name).getDataRange().getValues();
  const head = v.shift();
  return v.map(function (r, i) {
    const o = { _row: i + 2 };
    head.forEach(function (k, j) { o[k] = r[j]; });
    if (o.username !== undefined) o.username = String(o.username);
    return o;
  });
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function logRow(ts, user, ev, detail) { sh('Logs').appendRow([ts, user, ev, detail || '']); }

function doGet() { return out({ ok: true, msg: 'API Toán lớp 4 đang chạy' }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return out(handle(JSON.parse(e.postData.contents)));
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function handle(q) {
  const now = Number(q.ts) || Date.now();
  const user = String(q.user || '').trim().toLowerCase();
  let me = null, urow = null;
  if (user === 'admin') {
    if (q.hash === hashOf('admin', ADMIN_PASSWORD)) me = { role: 'admin', name: 'Quản trị' };
  } else if (user) {
    urow = rows('Users').filter(function (r) { return r.username === user; })[0];
    if (urow && urow.hash === q.hash) me = { role: 'student', name: urow.name };
  }

  if (q.action === 'login') {
    if (!me) { logRow(now, user, 'login_fail', ''); return { ok: false, error: 'Sai tên đăng nhập hoặc mật khẩu' }; }
    logRow(now, user, 'login', '');
    if (urow) sh('Users').getRange(urow._row, 6).setValue(now);
    let profile = null;
    try { profile = urow && urow.profile ? JSON.parse(urow.profile) : null; } catch (x) {}
    return { ok: true, role: me.role, name: me.name, profile: profile };
  }
  if (!me) return { ok: false, error: 'auth' };
  const adm = me.role === 'admin';

  switch (q.action) {
    case 'log':
      logRow(now, user, q.event, q.detail);
      break;
    case 'ping': {
      const day = Number(Utilities.formatDate(new Date(now), TZ, 'yyyyMMdd'));
      const m = Number(q.minutes) || 1;
      const found = rows('Activity').filter(function (r) { return Number(r.day) === day && r.username === user; })[0];
      if (found) sh('Activity').getRange(found._row, 3).setValue(Number(found.minutes) + m);
      else sh('Activity').appendRow([day, user, m]);
      break;
    }
    case 'result':
      sh('Results').appendRow([now, user, me.name, q.exam, q.title, q.score, q.seconds, q.allowed, !!q.timeout, JSON.stringify(q.topics || {})]);
      logRow(now, user, 'submit_exam', q.title + ' – ' + q.score + '/10');
      if (urow && q.profile) sh('Users').getRange(urow._row, 4).setValue(JSON.stringify(q.profile));
      break;
    case 'changePass':
      if (urow) sh('Users').getRange(urow._row, 3).setValue(q.newHash);
      break;
    case 'adminData': {
      if (!adm) return { ok: false, error: 'forbidden' };
      const users = rows('Users').map(function (u) { return { username: u.username, name: u.name, created: u.created, lastLogin: u.lastLogin }; });
      const logs = rows('Logs'); const results = rows('Results');
      return {
        ok: true, users: users,
        results: results.slice(-3000).map(function (r) { delete r._row; return r; }),
        logs: logs.slice(-1500).map(function (r) { delete r._row; return r; }),
        activity: rows('Activity').map(function (r) { delete r._row; return r; })
      };
    }
    case 'addUser': {
      if (!adm) return { ok: false, error: 'forbidden' };
      const u = q.u || {};
      if (!/^[a-z0-9_.]{3,20}$/.test(u.username || '') || u.username === 'admin')
        return { ok: false, error: 'Tên đăng nhập 3–20 ký tự (chữ thường, số, _ .)' };
      if (rows('Users').some(function (r) { return r.username === u.username; })) return { ok: false, error: 'Tên đăng nhập đã tồn tại' };
      sh('Users').appendRow([u.username, u.name || u.username, u.hash, '', now, '']);
      break;
    }
    case 'resetPass': {
      if (!adm) return { ok: false, error: 'forbidden' };
      const t = rows('Users').filter(function (r) { return r.username === q.target; })[0];
      if (t) sh('Users').getRange(t._row, 3).setValue(q.newHash);
      break;
    }
    case 'delUser': {
      if (!adm) return { ok: false, error: 'forbidden' };
      const t = rows('Users').filter(function (r) { return r.username === q.target; })[0];
      if (t) sh('Users').deleteRow(t._row);
      break;
    }
    default:
      return { ok: false, error: 'unknown action' };
  }
  return { ok: true };
}
