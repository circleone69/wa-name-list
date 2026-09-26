const KEY = "wa-name-list-v2";
const OLD_KEY = "wa-name-list-v1";
const MEMBER_KEY = "wa-name-list-member";
const titleInput = document.getElementById("titleInput");
const descInput = document.getElementById("descInput");
const memberInput = document.getElementById("memberInput");
const headerTitle = document.getElementById("headerTitle");
const headerDesc = document.getElementById("headerDesc");
const input = document.getElementById("nameInput");
const form = document.getElementById("form");
const listEl = document.getElementById("list");
const empty = document.getElementById("empty");
const count = document.getElementById("count");
const toast = document.getElementById("toast");

memberInput.value = localStorage.getItem(MEMBER_KEY) || "";
let state = load();

function defaultState() {
  return { title: "Name list", description: "", names: [] };
}
function entryName(item) {
  return typeof item === "string" ? item : (item && item.name) || "";
}
function entryBy(item) {
  return typeof item === "string" ? "" : (item && item.by) || "";
}
function decodeShare() {
  const raw = location.hash.replace(/^#l=/, "");
  if (!raw) return null;
  try { return JSON.parse(decodeURIComponent(raw)); }
  catch {
    try { return JSON.parse(atob(raw)); } catch { return null; }
  }
}
function load() {
  const shared = decodeShare();
  if (shared && Array.isArray(shared.names)) {
    return {
      title: shared.title || "Name list",
      description: shared.description || "",
      names: shared.names
    };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        title: parsed.title || "Name list",
        description: parsed.description || "",
        names: Array.isArray(parsed.names) ? parsed.names : []
      };
    }
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const names = JSON.parse(old);
      return { title: "Name list", description: "", names: Array.isArray(names) ? names : [] };
    }
  } catch {}
  return defaultState();
}
function sharePayload() {
  return { title: state.title, description: state.description, names: state.names };
}
function listUrl() {
  return "https://circleone69.github.io/wa-name-list/#l=" + encodeURIComponent(JSON.stringify(sharePayload()));
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  history.replaceState(null, "", "#l=" + encodeURIComponent(JSON.stringify(sharePayload())));
}
function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
function toastMsg(text) {
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}
function listTitle() {
  return clean(state.title) || "Name list";
}
function numberedText() {
  return state.names.map((item, i) => {
    const by = entryBy(item);
    return (i + 1) + ". " + entryName(item) + (by ? " (added by " + by + ")" : "");
  }).join("\n");
}
function fullText() {
  const lines = [listTitle()];
  const desc = clean(state.description);
  if (desc) lines.push(desc);
  lines.push("");
  lines.push(state.names.length + (state.names.length === 1 ? " name" : " names"));
  if (state.names.length) {
    lines.push("");
    lines.push(numberedText());
  }
  return lines.join("\n");
}
function fileSlug() {
  return listTitle().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "name-list";
}
function downloadFile(filename, text, type) {
  const blob = new Blob([text], { type: type || "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function openWhatsApp(text) {
  window.location.href = "https://wa.me/?text=" + encodeURIComponent(text);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
  });
}
function render() {
  headerTitle.textContent = listTitle();
  headerDesc.textContent = clean(state.description) || "Type a name, tap Add.";
  titleInput.value = state.title;
  descInput.value = state.description;
  count.textContent = state.names.length + (state.names.length === 1 ? " name" : " names");
  empty.hidden = state.names.length > 0;
  listEl.hidden = state.names.length === 0;
  listEl.innerHTML = state.names.map((item, i) => {
    const name = entryName(item);
    const by = entryBy(item);
    return "<li data-i=\"" + i + "\"><span class=\"num\">" + (i + 1) + "</span><span class=\"name\">" + escapeHtml(name) + (by ? "<br><small>" + escapeHtml("added by " + by) + "</small>" : "") + "</span><div class=\"actions\"><button class=\"icon\" type=\"button\" data-act=\"edit\" aria-label=\"Edit\">✎</button><button class=\"icon\" type=\"button\" data-act=\"del\" aria-label=\"Remove\">✕</button></div></li>";
  }).join("");
}
function addName(raw) {
  const name = clean(raw);
  if (!name) return;
  const exists = state.names.some(function (item) {
    return entryName(item).toLowerCase() === name.toLowerCase();
  });
  if (exists) {
    toastMsg("Already on the list");
    return;
  }
  const by = clean(memberInput.value);
  state.names.push(by ? { name: name, by: by } : name);
  save();
  render();
  toastMsg("Added " + name + ". Send to group so others see it.");
}

titleInput.addEventListener("input", function () {
  state.title = titleInput.value;
  headerTitle.textContent = listTitle();
  save();
});
descInput.addEventListener("input", function () {
  state.description = descInput.value;
  headerDesc.textContent = clean(state.description) || "Type a name, tap Add.";
  save();
});
memberInput.addEventListener("input", function () {
  localStorage.setItem(MEMBER_KEY, memberInput.value);
});
form.addEventListener("submit", function (e) {
  e.preventDefault();
  addName(input.value);
  input.value = "";
  input.focus();
});
listEl.addEventListener("click", function (e) {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const li = btn.closest("li");
  const i = Number(li.dataset.i);
  if (btn.dataset.act === "del") {
    const removed = entryName(state.names.splice(i, 1)[0]);
    save();
    render();
    toastMsg("Removed " + removed);
  }
  if (btn.dataset.act === "edit") {
    const span = li.querySelector(".name");
    const current = entryName(state.names[i]);
    span.textContent = current;
    span.contentEditable = "true";
    span.focus();
    document.execCommand("selectAll", false, null);
    const finish = function () {
      span.contentEditable = "false";
      const next = clean(span.textContent || "");
      if (!next) state.names.splice(i, 1);
      else if (typeof state.names[i] === "string") state.names[i] = next;
      else state.names[i].name = next;
      save();
      render();
    };
    span.addEventListener("blur", finish, { once: true });
    span.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        span.blur();
      }
    });
  }
});
document.getElementById("shareGroup").addEventListener("click", function () {
  openWhatsApp(fullText() + "\n\nOpen this in WhatsApp to add more names:\n" + listUrl());
});
document.getElementById("downloadList").addEventListener("click", function () {
  downloadFile(fileSlug() + ".txt", fullText(), "text/plain");
  toastMsg("Downloaded");
});
document.getElementById("shareWa").addEventListener("click", function () {
  if (!state.names.length) return toastMsg("Add a name first");
  openWhatsApp(fullText());
});
document.getElementById("copyList").addEventListener("click", async function () {
  try {
    await navigator.clipboard.writeText(fullText() + "\n\n" + listUrl());
    toastMsg("List and link copied");
  } catch {
    toastMsg("Could not copy");
  }
});
document.getElementById("clearAll").addEventListener("click", function () {
  if (!state.names.length) return;
  if (!confirm("Clear all names? The list name and description stay.")) return;
  state.names = [];
  save();
  render();
});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(function () {});
}
render();
