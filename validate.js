(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NameListValidate = factory();
})(typeof self !== "undefined" ? self : this, function () {
  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }
  function hasControlChars(value) {
    return /[\u0000-\u001F\u007F]/.test(value);
  }
  function validateName(raw, existing) {
    var name = clean(raw);
    if (!name) return { ok: false, error: "Name is required" };
    if (name.length > 80) return { ok: false, error: "Name must be 80 characters or less" };
    if (hasControlChars(name) || /[<>]/.test(name)) {
      return { ok: false, error: "Name contains invalid characters" };
    }
    if (!/^[\p{L}\p{M}\p{N} .'\-]+$/u.test(name)) {
      return { ok: false, error: "Use letters, numbers, spaces, hyphen or apostrophe only" };
    }
    var names = existing || [];
    for (var i = 0; i < names.length; i++) {
      var current = typeof names[i] === "string" ? names[i] : (names[i] && names[i].name) || "";
      if (current.toLowerCase() === name.toLowerCase()) {
        return { ok: false, error: "That name is already on the list" };
      }
    }
    return { ok: true, name: name };
  }
  function validateTitle(raw) {
    var title = clean(raw);
    if (!title) return { ok: false, error: "List name is required" };
    if (title.length > 80) return { ok: false, error: "List name must be 80 characters or less" };
    if (hasControlChars(title) || /[<>]/.test(title)) {
      return { ok: false, error: "List name contains invalid characters" };
    }
    return { ok: true, title: title };
  }
  function validateDescription(raw) {
    var description = clean(raw);
    if (description.length > 300) return { ok: false, error: "Description must be 300 characters or less" };
    if (hasControlChars(description) || /[<>]/.test(description)) {
      return { ok: false, error: "Description contains invalid characters" };
    }
    return { ok: true, description: description };
  }
  function validatePin(raw) {
    var pin = String(raw || "");
    if (pin.length < 4 || pin.length > 32) return { ok: false, error: "PIN must be 4 to 32 characters" };
    if (hasControlChars(pin) || /\s/.test(pin)) return { ok: false, error: "PIN cannot contain spaces" };
    return { ok: true, pin: pin };
  }
  return {
    clean: clean,
    validateName: validateName,
    validateTitle: validateTitle,
    validateDescription: validateDescription,
    validatePin: validatePin
  };
});
