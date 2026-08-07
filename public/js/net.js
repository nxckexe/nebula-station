export let socket = null;

export function connectSocket(token, handlers) {
  socket = window.io({ auth: { token } });
  for (const [event, fn] of Object.entries(handlers)) {
    socket.on(event, (...args) => fn(...args));
  }
  return socket;
}
