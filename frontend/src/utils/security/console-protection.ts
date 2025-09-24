/**
 * Console Protection System
 * Prevents source code structure visibility in browser dev tools
 */

class ConsoleProtection {
  private isProduction: boolean;
  private originalConsole: any;
  private sourceMapDisabled: boolean = false;

  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.originalConsole = { ...console };
    
    // Initialize protection
    if (this.isProduction) {
      this.initializeProtection();
    }
  }

  /**
   * Initialize all console protection mechanisms
   */
  private initializeProtection(): void {
    this.disableSourceMaps();
    this.obfuscateFileNames();
    this.interceptConsoleOutput();
    this.preventStackTraceExposure();
    this.addSourceProtection();
  }

  /**
   * Disable source maps to prevent source code viewing
   */
  private disableSourceMaps(): void {
    try {
      // Find and remove existing sourcemap links
      const sourceMaps = document.querySelectorAll('link[rel="sourcemap"], script[src$=".map"]');
      sourceMaps.forEach(node => node.remove());
      
      // Override sourceMappingURL in scripts
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        if (script.textContent?.includes('sourceMappingURL')) {
          script.textContent = script.textContent.replace(/\/\/# sourceMappingURL=.+$/, '');
        }
      });

      this.sourceMapDisabled = true;
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Obfuscate file names in stack traces and errors
   */
  private obfuscateFileNames(): void {
    // Override Error.prepareStackTrace
    if (Error.prepareStackTrace) {
      const originalPrepareStackTrace = Error.prepareStackTrace;
      
      Error.prepareStackTrace = (error, stack) => {
        // Use original function to get the stack
        const originalStack = originalPrepareStackTrace(error, stack);
        
        if (typeof originalStack === 'string') {
          // Replace file paths with obfuscated names
          return originalStack
            .replace(/\/([^/]+\.js):/g, '/[obfuscated].js:')
            .replace(/at\s+([A-Za-z0-9_$.]+)\s+\(/g, 'at [fn] (');
        }
        
        return originalStack;
      };
    }
    
    // Override Error.toString
    const originalToString = Error.prototype.toString;
    Error.prototype.toString = function() {
      const result = originalToString.call(this);
      return result.replace(/\/([^/]+\.js):/g, '/[obfuscated].js:');
    };
  }

  /**
   * Intercept console output to hide sensitive information
   */
  private interceptConsoleOutput(): void {
    // List of methods to override
    const methods = ['log', 'debug', 'info', 'warn', 'error', 'trace'];
    
    methods.forEach(method => {
      console[method] = (...args: any[]) => {
        // Filter stack traces and file paths
        const filteredArgs = args.map(arg => {
          if (typeof arg === 'string') {
            return this.sanitizeOutput(arg);
          }
          return arg;
        });
        
        // Call original method with filtered args
        if (method === 'error' || method === 'warn') {
          // Allow errors and warnings for debugging
          this.originalConsole[method](...filteredArgs);
        }
      };
    });
  }

  /**
   * Prevent stack trace exposure
   */
  private preventStackTraceExposure(): void {
    // Override console.trace
    console.trace = () => {
      this.originalConsole.warn('[trace disabled]');
    };
    
    // Override Error.captureStackTrace
    const originalCaptureStackTrace = Error.captureStackTrace;
    if (originalCaptureStackTrace) {
      Error.captureStackTrace = function(targetObject, constructorOpt) {
        originalCaptureStackTrace.call(this, targetObject, constructorOpt);
        
        if (targetObject.stack) {
          Object.defineProperty(targetObject, 'stack', {
            get: function() {
              return '[stack trace hidden]';
            },
            configurable: true
          });
        }
      };
    }
  }

  /**
   * Add protection against source viewing
   */
  private addSourceProtection(): void {
    // Override Function.prototype.toString to hide function implementations
    const originalFunctionToString = Function.prototype.toString;
    Function.prototype.toString = function() {
      // Check if this is a framework function
      const fnString = originalFunctionToString.call(this);
      
      // If it's a user-defined function (not native), obfuscate it
      if (!fnString.includes('[native code]')) {
        return 'function() { [code hidden for security] }';
      }
      
      return fnString;
    };
  }

  /**
   * Sanitize console output to remove file paths and structure info
   */
  private sanitizeOutput(text: string): string {
    return text
      // Hide file paths
      .replace(/\/([^/]+\/[^/]+\.js)/g, '/[path-hidden].js')
      .replace(/\/([^/]+\/[^/]+\.ts)/g, '/[path-hidden].ts')
      .replace(/\/([^/]+\/[^/]+\.tsx)/g, '/[path-hidden].tsx')
      // Hide stack traces
      .replace(/at\s+([A-Za-z0-9_$.]+)\s+\(/g, 'at [function] (')
      // Hide webpack chunk names
      .replace(/chunk-[a-z0-9]+/g, 'chunk-xxxxx')
      // Hide module IDs
      .replace(/moduleId: \d+/g, 'moduleId: xxx');
  }

  /**
   * Get protection status
   */
  public getStatus(): {
    enabled: boolean;
    sourceMapDisabled: boolean;
  } {
    return {
      enabled: this.isProduction,
      sourceMapDisabled: this.sourceMapDisabled
    };
  }
}

// Create and export singleton instance
export const consoleProtection = new ConsoleProtection();
