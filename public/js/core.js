let deps = null;

export function registerCore(d) { deps = d; }

export function $(id) { return deps.$(id); }
export function t(key, params) { return deps.t(key, params); }
export function addMsg(name, color, text, cls) { return deps.addMsg(name, color, text, cls); }
export function showPopup(icon, title, sub, cls) { return deps.showPopup(icon, title, sub, cls); }
export function getMe() { return deps.getMe(); }
export function myRoom() { return deps.myRoom(); }
export function getLang() { return deps.getLang(); }
export function getMyId() { return deps.getMyId(); }
export function getPlanetScene() { return deps.getPlanetScene(); }
export function goToRoom(room, fromRoom) { return deps.goToRoom(room, fromRoom); }
export function drawAvatarPreview(targetCtx, fake, ax, ay) { return deps.drawAvatarPreview(targetCtx, fake, ax, ay); }
export function isLocked() { return deps.getLocked(); }
export function setLocked(v) { deps.setLocked(v); }
