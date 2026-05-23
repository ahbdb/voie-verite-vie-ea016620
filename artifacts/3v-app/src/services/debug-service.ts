// Debug service to capture and log errors for troubleshooting
interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  component?: string;
  level: 'error' | 'warn' | 'info';
}

const MAX_LOGS = 50;
const logs: ErrorLog[] = [];

export const debugService = {
  log: (message: string, level: 'error' | 'warn' | 'info' = 'info', component?: string) => {
    const log: ErrorLog = {
      timestamp: new Date().toISOString(),
      message,
      level,
      component,
    };
    logs.push(log);
    if (logs.length > MAX_LOGS) logs.shift();
    
    if (level === 'error') {
      console.error(`[${component}] ${message}`);
    } else if (level === 'warn') {
      console.warn(`[${component}] ${message}`);
    } else {
      console.log(`[${component}] ${message}`);
    }
    
    try {
      localStorage.setItem('__debug_logs', JSON.stringify(logs));
    } catch (e) {
      console.warn('Could not save debug logs to localStorage');
    }
  },

  logError: (error: unknown, component?: string) => {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      message,
      stack,
      level: 'error',
      component,
    };
    logs.push(errorLog);
    if (logs.length > MAX_LOGS) logs.shift();
    
    console.error(`🔴 [${component}] Error:`, error);
    
    try {
      localStorage.setItem('__debug_logs', JSON.stringify(logs));
    } catch (e) {
      console.warn('Could not save debug logs to localStorage');
    }
  },

  getLogs: () => {
    try {
      const stored = localStorage.getItem('__debug_logs');
      return stored ? JSON.parse(stored) : logs;
    } catch {
      return logs;
    }
  },

  clearLogs: () => {
    logs.length = 0;
    try {
      localStorage.removeItem('__debug_logs');
    } catch (e) {
      console.warn('Could not clear debug logs from localStorage');
    }
  },
};

// Catch unhandled errors globally
window.addEventListener('error', (event) => {
  debugService.logError(event.error, 'GlobalError');
});

window.addEventListener('unhandledrejection', (event) => {
  debugService.logError(event.reason, 'UnhandledPromiseRejection');
});
