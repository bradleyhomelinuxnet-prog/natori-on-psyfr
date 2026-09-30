var OPHIS_LOG_LEVEL__INFO = "OPH_INFO";
var OPHIS_LOG_LEVEL__WARN = "OPH_WARN";
var OPHIS_LOG_LEVEL__ERROR = "OPH_ERROR";

self.originalConsoleLog = console.log;
self.originalConsoleWarn = console.warn;
self.originalConsoleError = console.error;

function consoleLogOverride(...args) {
  var message = args[0];

    if ( self.ophisLog ) {
      self.ophisLog(message, OPHIS_LOG_LEVEL__INFO);
    }

    // Call the original console.log to maintain default behavior
    if ( self.originalConsoleLog ) {
      self.originalConsoleLog.apply(console, args);
    }
}

function consoleWarnOverride(...args) {
  var message = args[0];

    if ( self.ophisLog ) {
      self.ophisLog(message, OPHIS_LOG_LEVEL__WARN);
    }

    // Call the original console.log to maintain default behavior
    if ( self.originalConsoleWarn ) {
      self.originalConsoleWarn.apply(console, args);
    }
}

function consoleErrorOverride(...args) {
  var message = args[0];

    if ( self.ophisLog ) {
      self.ophisLog(message, OPHIS_LOG_LEVEL__ERROR);
    }

    // Call the original console.log to maintain default behavior
    if ( self.originalConsoleError ) {
      self.originalConsoleError.apply(console, args);
    }
}

function toggleConsoleLogOverride() {
  var doTheOverride = isRunningHeadless() && isRunningElectron();
  
  if ( doTheOverride === true ) {
    // Override console.log
    console.log = consoleLogOverride;
    console.warn = consoleWarnOverride;
    console.error = consoleErrorOverride;
  } else {
    console.log = self.originalConsoleLog;
    console.warn = self.originalConsoleWarn;
    console.error = self.originalConsoleError;
  }
}

// WARNING: DO NOT put any console.log/warn/error statements downstream because it will cause infinite recursion.
function ophisLog(message, logLevel = OPHIS_LOG_LEVEL__INFO) {

  var logTag = logLevel + ": ";

  message = logTag + message;

  electronBridge.logToCli(message);
}