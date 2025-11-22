// Centralized logger with level control
// LOG_LEVEL hierarchy: error < warn < info < debug

const levels = ['error','warn','info','debug'];
const current = (process.env.LOG_LEVEL || 'info').toLowerCase();

function active(level) {
  return levels.indexOf(level) <= levels.indexOf(current);
}

function format(level, args) {
  // Preserve original message content to avoid breaking tests relying on substrings
  return args;
}

export const log = {
  error: (...a) => active('error') && console.error(...format('error', a)),
  warn:  (...a) => active('warn')  && console.warn(...format('warn', a)),
  info:  (...a) => active('info')  && console.log(...format('info', a)),
  debug: (...a) => active('debug') && console.log(...format('debug', a)),
};

export function setLogLevel(level) {
  if (!levels.includes(level)) return;
  process.env.LOG_LEVEL = level;
}
