// src/dev-logger.js - Captures browser console logs and errors
export function installDevLogger(endpoint = '/api/dev-logs') {
  if (import.meta.env.PROD) return;

  const send = (payload) => {
    try {
      navigator.sendBeacon?.(endpoint, new Blob([JSON.stringify(payload)], { type: 'application/json' }))
        || fetch(endpoint, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
          });
    } catch (_) {}
  };

  const wrap = (level) => {
    const orig = console[level];
    console[level] = (...args) => {
      try {
        const msg = args.map(a => typeof a === 'string' ? a : safelyStringify(a)).join(' ');
        send({ level, msg });
      } catch (_) {}
      orig?.(...args);
    };
  };

  // Wrap console methods
  ['log', 'warn', 'error'].forEach(wrap);

  // Capture JavaScript errors
  window.addEventListener('error', (e) => {
    send({ 
      level: 'error', 
      msg: e.message, 
      stack: e.error?.stack, 
      meta: { 
        source: e.filename, 
        line: e.lineno, 
        col: e.colno 
      } 
    });
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason instanceof Error 
      ? { msg: e.reason.message, stack: e.reason.stack } 
      : { msg: String(e.reason) };
    send({ 
      level: 'error', 
      ...reason, 
      meta: { type: 'unhandledrejection' } 
    });
  });

  function safelyStringify(x) {
    try { 
      return JSON.stringify(x); 
    } catch { 
      return String(x); 
    }
  }

  console.log('Dev logger installed - sending logs to', endpoint);
}
