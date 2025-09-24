/**
 * File Structure Obfuscator
 * Hides the actual file structure in browser dev tools
 */

class FileStructureObfuscator {
  private isProduction: boolean;
  private initialized: boolean = false;

  constructor() {
    this.isProduction = import.meta.env.PROD;
    
    // Auto-initialize in production
    if (this.isProduction) {
      this.initialize();
    }
  }

  /**
   * Initialize obfuscation
   */
  public initialize(): void {
    if (this.initialized) return;
    
    this.obfuscateSourceMapURLs();
    this.overrideModuleSystem();
    this.hideWebpackModules();
    this.addSourceFileProtection();
    
    this.initialized = true;
  }

  /**
   * Obfuscate source map URLs to prevent source viewing
   */
  private obfuscateSourceMapURLs(): void {
    try {
      // Find all script tags
      const scripts = document.querySelectorAll('script[src]');
      
      // Process each script
      scripts.forEach(script => {
        const src = script.getAttribute('src');
        if (src) {
          // Create a new script element with modified attributes
          const newScript = document.createElement('script');
          newScript.src = this.obfuscateUrl(src);
          
          // Copy other attributes
          Array.from(script.attributes).forEach(attr => {
            if (attr.name !== 'src') {
              newScript.setAttribute(attr.name, attr.value);
            }
          });
          
          // Replace the original script
          if (script.parentNode) {
            script.parentNode.replaceChild(newScript, script);
          }
        }
      });
      
      // Find all link tags for CSS
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
          link.setAttribute('href', this.obfuscateUrl(href));
        }
      });
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Obfuscate URL without breaking functionality
   */
  private obfuscateUrl(url: string): string {
    // Keep the URL functional but change how it appears in dev tools
    // This doesn't actually change the URL, just how it's displayed
    const originalUrl = url;
    
    // Add a special parameter for cache busting that also obfuscates
    if (url.includes('?')) {
      return `${url}&_o=${this.generateRandomId()}`;
    } else {
      return `${url}?_o=${this.generateRandomId()}`;
    }
  }

  /**
   * Generate random ID for obfuscation
   */
  private generateRandomId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Override webpack/module system to hide structure
   */
  private overrideModuleSystem(): void {
    try {
      // Check if webpack is available
      if (typeof window !== 'undefined' && (window as any).__webpack_modules__) {
        // Store original modules
        const originalModules = { ...(window as any).__webpack_modules__ };
        
        // Override webpack module getter
        Object.defineProperty(window, '__webpack_modules__', {
          get: () => {
            // Return a proxy that hides the real structure
            return new Proxy(originalModules, {
              get: (target, prop) => {
                // Return the actual module but with obfuscated toString
                const original = target[prop as any];
                if (typeof original === 'function') {
                  const wrappedFn = function(...args: any[]) {
                    return original.apply(this, args);
                  };
                  
                  // Override toString to hide the source
                  Object.defineProperty(wrappedFn, 'toString', {
                    value: () => 'function() { [code hidden] }',
                    writable: false
                  });
                  
                  return wrappedFn;
                }
                return original;
              },
              // Hide module names in enumeration
              ownKeys: (target) => {
                return Reflect.ownKeys(target).map(key => 
                  typeof key === 'string' ? `module_${this.generateRandomId()}` : key
                );
              }
            });
          },
          configurable: false
        });
      }
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Hide webpack modules in console
   */
  private hideWebpackModules(): void {
    try {
      // Override webpack chunk names
      if (typeof window !== 'undefined' && (window as any).__webpack_require__) {
        const originalRequire = (window as any).__webpack_require__;
        
        // Replace webpack require with wrapped version
        (window as any).__webpack_require__ = function(moduleId: any) {
          // Call original function
          return originalRequire(moduleId);
        };
        
        // Copy all properties from original
        for (const key in originalRequire) {
          if (Object.prototype.hasOwnProperty.call(originalRequire, key)) {
            (window as any).__webpack_require__[key] = originalRequire[key];
          }
        }
        
        // Override chunk name mapping if it exists
        if ((window as any).__webpack_require__.m) {
          const originalModuleMap = { ...(window as any).__webpack_require__.m };
          
          Object.defineProperty((window as any).__webpack_require__, 'm', {
            get: () => {
              return new Proxy(originalModuleMap, {
                get: (target, prop) => target[prop as any],
                // Hide real keys
                ownKeys: () => [],
                getOwnPropertyDescriptor: (target, prop) => {
                  const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
                  if (descriptor) {
                    descriptor.enumerable = false;
                  }
                  return descriptor;
                }
              });
            },
            configurable: false
          });
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Add source file protection
   */
  private addSourceFileProtection(): void {
    try {
      // Override the stack trace format
      if (Error.captureStackTrace) {
        const originalCaptureStackTrace = Error.captureStackTrace;
        
        Error.captureStackTrace = function(targetObject, constructorOpt) {
          originalCaptureStackTrace.call(this, targetObject, constructorOpt);
          
          if (targetObject.stack) {
            const originalStack = targetObject.stack;
            
            // Replace the stack property with a getter that obfuscates file paths
            Object.defineProperty(targetObject, 'stack', {
              get: function() {
                if (typeof originalStack === 'string') {
                  return originalStack
                    // Hide real file paths
                    .replace(/\(([^)]+)\)/g, '([obfuscated])')
                    // Hide webpack:/// paths
                    .replace(/webpack:\/\/\/.+?:/g, 'webpack:///[hidden]:')
                    // Hide line numbers
                    .replace(/:\d+:\d+/g, ':[line]:[column]');
                }
                return originalStack;
              },
              configurable: true
            });
          }
        };
      }
    } catch (e) {
      // Silent fail
    }
  }
}

// Create and export singleton instance
export const fileStructureObfuscator = new FileStructureObfuscator();
