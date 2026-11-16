// 공통 모듈: 모든 페이지가 같은 저장 키와 같은 기록 형식을 사용한다.
// 이 파일을 수정할 때는 팀원과 먼저 이슈로 상의한다.
//
// 기록 형식 (Python 콘솔 버전의 records와 동일)
// { date: "YYYY-MM-DD", exercise: "스쿼트", weight: 60, reps: 10, sets: 3 }

const STORAGE_KEY = "records";

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    return false;
  }
}

function addRecord(record) {
  const all = loadRecords();
  all.push(record);
  return saveRecords(all);
}

function clearRecords() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* 저장소를 못 쓰는 환경이면 무시 */
  }
}

// 로컬 시간 기준 YYYY-MM-DD (toISOString은 UTC라서 쓰지 않는다)
function dateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 월요일~일요일 한 주의 범위
function getWeekRange(base = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const diff = (d.getDay() + 6) % 7; // 월요일 = 0
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: dateString(start), end: dateString(end), startDate: start };
}

// 화면에 글자를 넣을 때는 innerHTML 대신 이 함수를 쓴다 (입력값이 코드로 실행되는 것을 막는다)
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function fmtNum(n) {
  return String(Math.round(Number(n) * 10) / 10);
}

// 기록 한 건 삭제 (저장된 배열에서의 위치로 지정)
function removeRecordAt(index) {
  const all = loadRecords();
  if (index < 0 || index >= all.length) return false;
  all.splice(index, 1);
  return saveRecords(all);
}

// 주간 목표 세트 수 (0이면 목표 없음). 기록과 별도 키에 저장한다.
const GOAL_KEY = "weeklyGoalSets";

function loadGoal() {
  try {
    const n = parseInt(localStorage.getItem(GOAL_KEY), 10);
    return n >= 1 ? n : 0;
  } catch (e) {
    return 0;
  }
}

function saveGoal(n) {
  try {
    if (n >= 1) localStorage.setItem(GOAL_KEY, String(n));
    else localStorage.removeItem(GOAL_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

// 같은 종목 기록 중 최고 무게 (무게가 같으면 먼저 입력한 기록)
function findBest(records) {
  let best = records[0];
  records.forEach((r) => {
    if (r.weight > best.weight) best = r;
  });
  return best;
}

// 예상 1RM (Epley 공식: 무게 x (1 + 횟수/30)). 실제 측정값이 아니라 추정치다.
function estimate1RM(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!(w > 0) || !(r >= 1)) return 0;
  return r === 1 ? w : w * (1 + r / 30);
}

// 기록이 있는 날짜 집합
function recordDays(records) {
  return new Set(records.map((r) => r.date));
}

// 연속 운동일 수. 오늘 기록이 없어도 어제까지 이어졌다면 이어진 것으로 본다 (하루가 끝나기 전에는 끊긴 게 아니므로)
function calcStreak(records, base = new Date()) {
  const days = recordDays(records);
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  if (!days.has(dateString(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dateString(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// 가져온 기록이 올바른 형식인지 검사
function isValidRecord(r) {
  return !!r && typeof r === "object"
    && /^\d{4}-\d{2}-\d{2}$/.test(r.date)
    && typeof r.exercise === "string" && r.exercise.trim() !== ""
    && Number(r.weight) >= 0 && typeof r.weight === "number"
    && Number.isInteger(r.reps) && r.reps >= 1
    && Number.isInteger(r.sets) && r.sets >= 1;
}

// 기록 전체를 JSON 문자열로 (내보내기)
function exportRecordsJSON() {
  return JSON.stringify(loadRecords(), null, 2);
}

// JSON 문자열의 기록을 현재 기록에 합친다. 완전히 같은 기록은 건너뛴다.
// 반환: { ok, added, skipped, invalid, error }
function importRecordsJSON(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: "JSON 형식이 아닙니다" };
  }
  if (!Array.isArray(data)) return { ok: false, error: "기록 목록(배열)이 아닙니다" };
  const all = loadRecords();
  const key = (r) => [r.date, r.exercise, r.weight, r.reps, r.sets].join("|");
  const seen = new Set(all.map(key));
  let added = 0, skipped = 0, invalid = 0;
  data.forEach((r) => {
    if (!isValidRecord(r)) { invalid += 1; return; }
    const rec = { date: r.date, exercise: r.exercise.trim(), weight: r.weight, reps: r.reps, sets: r.sets };
    if (seen.has(key(rec))) { skipped += 1; return; }
    seen.add(key(rec));
    all.push(rec);
    added += 1;
  });
  if (added && !saveRecords(all)) return { ok: false, error: "저장에 실패했습니다" };
  return { ok: true, added, skipped, invalid };
}

// 기록 한 건의 볼륨 (무게 x 횟수 x 세트)
function recordVolume(r) {
  return Number(r.weight) * Number(r.reps) * Number(r.sets);
}

// 최근에 한 종목 이름 (최근 것부터, 중복 없이, 최대 n개)
function recentExercises(records, n = 6) {
  const out = [];
  for (let i = records.length - 1; i >= 0 && out.length < n; i--) {
    if (!out.includes(records[i].exercise)) out.push(records[i].exercise);
  }
  return out;
}

// 그 종목의 가장 마지막 기록 (없으면 undefined)
function lastRecordOf(records, exercise) {
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].exercise === exercise) return records[i];
  }
  return undefined;
}

// 신기록 판정: 같은 종목의 이전 기록(prev)과 비교한다.
// 이전 기록이 없으면 첫 기록이라 신기록으로 치지 않는다.
// 반환: { first: boolean, prs: [{ label, before, after, unit }] }
function checkPersonalRecords(prev, rec) {
  if (!prev.length) return { first: true, prs: [] };
  const best = (fn) => prev.reduce((m, r) => Math.max(m, fn(r)), 0);
  const items = [
    { label: "최고 무게", after: Number(rec.weight), before: best((r) => Number(r.weight)), unit: "kg" },
    { label: "예상 1RM", after: estimate1RM(rec.weight, rec.reps), before: best((r) => estimate1RM(r.weight, r.reps)), unit: "kg" },
    { label: "볼륨", after: recordVolume(rec), before: best(recordVolume), unit: "kg" },
  ];
  return { first: false, prs: items.filter((x) => x.after > 0 && x.after > x.before + 1e-9) };
}

// 한 주(getWeekRange 결과)의 합계: 운동한 날, 세트, 볼륨
function weekTotals(records, week) {
  const recs = records.filter((r) => r.date >= week.start && r.date <= week.end);
  return {
    days: new Set(recs.map((r) => r.date)).size,
    sets: recs.reduce((s, r) => s + Number(r.sets), 0),
    volume: recs.reduce((s, r) => s + recordVolume(r), 0),
  };
}
