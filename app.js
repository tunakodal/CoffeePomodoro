// Coffee Pomodoro (GitHub Pages)
// - 5 bars
// - Focus: every (focus/5) minutes -> bar decreases
// - Break: every (break/5) minutes -> bar increases
// - minimal todo with localStorage

const els = {
  modePill: document.getElementById("modePill"),
  bars: document.getElementById("bars"),
  hintText: document.getElementById("hintText"),
  timeText: document.getElementById("timeText"),
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  restartBtn: document.getElementById("restartBtn"),
  focusInput: document.getElementById("focusInput"),
  breakInput: document.getElementById("breakInput"),
  applyBtn: document.getElementById("applyBtn"),
  stageMeta: document.getElementById("stageMeta"),
  nextMeta: document.getElementById("nextMeta"),
  todoForm: document.getElementById("todoForm"),
  todoInput: document.getElementById("todoInput"),
  todoList: document.getElementById("todoList"),
};

const STORAGE_KEY = "coffee_pomodoro_v1";

let state = {
  mode: "focus", // "focus" | "break"
  focusMin: 25,
  breakMin: 5,

  running: false,
  intervalId: null,

  // timer accounting (seconds)
  totalSec: 25 * 60,
  remainingSec: 25 * 60,

  // bar logic
  barsTotal: 5,
  barsFilled: 5,      // for focus starts full
  segmentSec: (25 * 60) / 5,
  nextBarInSec: (25 * 60) / 5,

  // todo
  todos: [],
};

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function fmtTime(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function rebuildBars(){
  els.bars.innerHTML = "";
  for(let i=0;i<state.barsTotal;i++){
    const div = document.createElement("div");
    div.className = "bar" + (i < state.barsFilled ? "" : " off");
    els.bars.appendChild(div);
  }
}

function updateUI(){
  els.modePill.textContent = state.mode === "focus" ? "Focus" : "Break";
  els.modePill.style.borderColor = state.mode === "focus"
    ? "rgba(217,164,65,.35)"
    : "rgba(255,255,255,.12)";

  els.timeText.textContent = fmtTime(state.remainingSec);

  const segIndex = state.mode === "focus"
    ? (state.barsTotal - state.barsFilled + 1)
    : (state.barsFilled); // on break, filled bars indicate progress

  const segClamped = clamp(segIndex, 1, 5);
  els.stageMeta.textContent = `Segment: ${segClamped}/5`;
  els.nextMeta.textContent = `Next bar in: ${fmtTime(state.nextBarInSec)}`;

  els.hintText.innerHTML =
    state.mode === "focus"
      ? `Her <b>Duration/5</b> dakikada bir bar azalır.`
      : `Her <b>Break/5</b> dakikada bir bar dolar.`;

  els.startBtn.disabled = state.running;
  els.pauseBtn.disabled = !state.running;

  rebuildBars();
}

function persist(){
  const payload = {
    focusMin: state.focusMin,
    breakMin: state.breakMin,
    todos: state.todos,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const p = JSON.parse(raw);
    if(typeof p.focusMin === "number") state.focusMin = p.focusMin;
    if(typeof p.breakMin === "number") state.breakMin = p.breakMin;
    if(Array.isArray(p.todos)) state.todos = p.todos;
  }catch{}
}

function applySettings(){
  const focus = parseInt(els.focusInput.value, 10);
  const brk = parseInt(els.breakInput.value, 10);

  // minimal guardrails: 5..180, step 1 ok (UI step=5)
  state.focusMin = clamp(isNaN(focus)?25:focus, 5, 180);
  state.breakMin = clamp(isNaN(brk)?5:brk, 5, 60);

  els.focusInput.value = state.focusMin;
  els.breakInput.value = state.breakMin;

  persist();
  restart(true);
}

function setMode(mode){
  state.mode = mode;

  if(mode === "focus"){
    state.totalSec = state.focusMin * 60;
    state.remainingSec = state.totalSec;
    state.segmentSec = state.totalSec / 5;
    state.nextBarInSec = state.segmentSec;
    state.barsFilled = 5;  // starts full, decreases
  } else {
    state.totalSec = state.breakMin * 60;
    state.remainingSec = state.totalSec;
    state.segmentSec = state.totalSec / 5;
    state.nextBarInSec = state.segmentSec;
    state.barsFilled = 0;  // starts empty, fills
  }
}

function tick(){
  if(!state.running) return;

  state.remainingSec -= 1;
  state.nextBarInSec -= 1;

  // Bar changes on segment boundaries (every duration/5 minutes)
  if(state.nextBarInSec <= 0){
    if(state.mode === "focus"){
      state.barsFilled = clamp(state.barsFilled - 1, 0, 5);
    } else {
      state.barsFilled = clamp(state.barsFilled + 1, 0, 5);
    }
    // reset next segment counter (avoid drift)
    state.nextBarInSec = state.segmentSec;
  }

  // Session end
  if(state.remainingSec <= 0){
    // force end-state bars to be consistent
    if(state.mode === "focus"){
      state.barsFilled = 0;
    } else {
      state.barsFilled = 5;
    }
    updateUI();

    // auto switch
    if(state.mode === "focus"){
      setMode("break");
    } else {
      setMode("focus");
    }
    updateUI();
    return;
  }

  updateUI();
}

function start(){
  if(state.running) return;
  state.running = true;
  state.intervalId = setInterval(tick, 1000);
  updateUI();
}

function pause(){
  state.running = false;
  if(state.intervalId){
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  updateUI();
}

function restart(keepMode = false){
  pause();
  if(!keepMode){
    setMode("focus");
  } else {
    // keep current mode but reset its counters/bars
    setMode(state.mode);
  }
  updateUI();
}

/* -------------------- TODO -------------------- */

function renderTodos(){
  els.todoList.innerHTML = "";
  for(const t of state.todos){
    const li = document.createElement("li");
    li.className = "todo-item" + (t.done ? " done" : "");

    const text = document.createElement("div");
    text.className = "todo-text";
    text.textContent = t.text;

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const doneBtn = document.createElement("button");
    doneBtn.className = "iconbtn done";
    doneBtn.type = "button";
    doneBtn.textContent = t.done ? "↺" : "✓";
    doneBtn.title = t.done ? "Undo" : "Done";
    doneBtn.onclick = () => {
      t.done = !t.done;
      persist();
      renderTodos();
    };

    const delBtn = document.createElement("button");
    delBtn.className = "iconbtn del";
    delBtn.type = "button";
    delBtn.textContent = "✕";
    delBtn.title = "Delete";
    delBtn.onclick = () => {
      state.todos = state.todos.filter(x => x.id !== t.id);
      persist();
      renderTodos();
    };

    actions.appendChild(doneBtn);
    actions.appendChild(delBtn);

    li.appendChild(text);
    li.appendChild(actions);
    els.todoList.appendChild(li);
  }
}

function addTodo(text){
  const clean = (text || "").trim();
  if(!clean) return;
  state.todos.unshift({ id: crypto.randomUUID(), text: clean, done: false });
  state.todos = state.todos.slice(0, 12); // "çok küçük alan" => limit
  persist();
  renderTodos();
}

/* -------------------- INIT -------------------- */

function init(){
  load();

  els.focusInput.value = state.focusMin;
  els.breakInput.value = state.breakMin;

  // build bars container once
  for(let i=0;i<5;i++){
    const div = document.createElement("div");
    div.className = "bar";
    els.bars.appendChild(div);
  }

  // set initial mode
  setMode("focus");
  updateUI();

  // events
  els.startBtn.addEventListener("click", start);
  els.pauseBtn.addEventListener("click", pause);
  els.restartBtn.addEventListener("click", () => restart(false));
  els.applyBtn.addEventListener("click", applySettings);

  els.todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTodo(els.todoInput.value);
    els.todoInput.value = "";
  });

  renderTodos();
}

init();
