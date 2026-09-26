const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const validate = require("./validate");

const PORT = Number(process.env.PORT || 8787);
const DATA_FILE = path.join(__dirname, "data", "list.json");
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "*";

function emptyState() {
  return { title: "Name list", description: "", names: [], pinHash: "", pinSalt: "" };
}
function readState() {
  try { return Object.assign(emptyState(), JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))); }
  catch (e) { return emptyState(); }
}
function writeState(state) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}
function hashPin(pin, salt) {
  return crypto.scryptSync(String(pin), salt, 32).toString("hex");
}
function publicList(state) {
  return { title: state.title, description: state.description, names: state.names, protected: Boolean(state.pinHash) };
}
function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
    "Access-Control-Allow-Origin": ALLOW_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, X-Owner-Pin",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"
  });
  res.end(json);
}
function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch (e) { reject(new Error("Invalid JSON")); }
    });
  });
}
function requireOwner(req, state) {
  if (!state.pinHash) return { ok: false, error: "Owner PIN is not set on the server" };
  var pin = req.headers["x-owner-pin"] || "";
  if (hashPin(pin, state.pinSalt) !== state.pinHash) return { ok: false, error: "Owner PIN required" };
  return { ok: true };
}

const server = http.createServer(async function (req, res) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, "http://localhost");
  const state = readState();
  try {
    if (req.method === "GET" && url.pathname === "/api/list") return send(res, 200, publicList(state));
    if (req.method === "POST" && url.pathname === "/api/names") {
      const body = await readBody(req);
      const result = validate.validateName(body.name, state.names);
      if (!result.ok) return send(res, 400, result);
      state.names.push(result.name);
      writeState(state);
      return send(res, 201, publicList(state));
    }
    if (req.method === "POST" && url.pathname === "/api/meta") {
      const owner = requireOwner(req, state);
      if (!owner.ok) return send(res, 403, owner);
      const body = await readBody(req);
      const title = validate.validateTitle(body.title);
      const description = validate.validateDescription(body.description);
      if (!title.ok) return send(res, 400, title);
      if (!description.ok) return send(res, 400, description);
      state.title = title.title;
      state.description = description.description;
      writeState(state);
      return send(res, 200, publicList(state));
    }
    if (req.method === "POST" && url.pathname === "/api/pin") {
      const body = await readBody(req);
      const pin = validate.validatePin(body.pin);
      if (!pin.ok) return send(res, 400, pin);
      if (state.pinHash) {
        const owner = requireOwner(req, state);
        if (!owner.ok) return send(res, 403, owner);
      }
      state.pinSalt = crypto.randomBytes(16).toString("hex");
      state.pinHash = hashPin(pin.pin, state.pinSalt);
      writeState(state);
      return send(res, 200, { ok: true });
    }
    if (req.method === "DELETE" && url.pathname.indexOf("/api/names/") === 0) {
      const owner = requireOwner(req, state);
      if (!owner.ok) return send(res, 403, owner);
      const index = Number(url.pathname.slice("/api/names/".length));
      if (!Number.isInteger(index) || index < 0 || index >= state.names.length) {
        return send(res, 400, { ok: false, error: "Name not found" });
      }
      state.names.splice(index, 1);
      writeState(state);
      return send(res, 200, publicList(state));
    }
    if (req.method === "POST" && url.pathname === "/api/clear") {
      const owner = requireOwner(req, state);
      if (!owner.ok) return send(res, 403, owner);
      state.names = [];
      writeState(state);
      return send(res, 200, publicList(state));
    }
    send(res, 404, { ok: false, error: "Not found" });
  } catch (err) {
    send(res, 400, { ok: false, error: err.message || "Bad request" });
  }
});

server.listen(PORT, function () {
  console.log("Name list API on http://localhost:" + PORT);
});
