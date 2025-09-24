/**
 * Webpack Obfuscator
 * Hides webpack module structure and chunk information in the browser
 */

class WebpackObfuscator {
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
    
    this.hideWebpackJsonp();
    this.hideChunkNames();
    this.obfuscateModuleIds();
    this.hideSourceContent();
    
    this.initialized = true;
  }

  /**
   * Hide webpack jsonp function
   */
  private hideWebpackJsonp(): void {
    try {
      // Find webpack jsonp function
      const webpackJsonpName = Object.keys(window).find(key => 
        key.includes('webpackJsonp') || key.includes('webpackChunk')
      );
      
      if (webpackJsonpName && (window as any)[webpackJsonpName]) {
        // Store original function
        const originalJsonp = (window as any)[webpackJsonpName];
        
        // Replace with proxy
        (window as any)[webpackJsonpName] = new Proxy(originalJsonp, {
          get: (target, prop) => {
            // Return actual property but hide in console
            const value = target[prop as any];
            
            if (typeof value === 'function') {
              // Wrap functions to hide their source
              return function(...args: any[]) {
                return value.apply(this, args);
              };
            }
            
            return value;
          },
          // Hide properties during enumeration
          ownKeys: () => [],
          getOwnPropertyDescriptor: (target, prop) => {
            const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
            if (descriptor) {
              descriptor.enumerable = false;
            }
            return descriptor;
          }
        });
        
        // Make it non-enumerable
        Object.defineProperty(window, webpackJsonpName, {
          enumerable: false,
          writable: false,
          configurable: false
        });
      }
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Hide chunk names
   */
  private hideChunkNames(): void {
    try {
      // Find chunk loaded function
      if (typeof window !== 'undefined' && (window as any).__webpack_require__) {
        const webpackRequire = (window as any).__webpack_require__;
        
        // Check for chunk load function
        if (typeof webpackRequire.e === 'function') {
          const originalChunkLoad = webpackRequire.e;
          
          // Replace with wrapper
          webpackRequire.e = function(chunkId: any) {
            // Call original but hide the chunk name
            return originalChunkLoad.call(this, chunkId);
          };
        }
        
        // Hide loaded chunks
        if (webpackRequire.m) {
          Object.defineProperty(webpackRequire, 'm', {
            enumerable: false,
            configurable: false
          });
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Obfuscate module IDs
   */
  private obfuscateModuleIds(): void {
    try {
      // Find webpack modules
      if (typeof window !== 'undefined' && (window as any).__webpack_modules__) {
        // Make non-enumerable
        Object.defineProperty(window, '__webpack_modules__', {
          enumerable: false,
          configurable: false
        });
      }
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Hide source content
   */
  private hideSourceContent(): void {
    try {
      // Override Function.prototype.toString for webpack modules
      const originalToString = Function.prototype.toString;
      
      Function.prototype.toString = function() {
        // Check if this is a webpack module
        const fnString = originalToString.call(this);
        
        if (fnString.includes('webpack') || 
            fnString.includes('__webpack_require__') || 
            fnString.includes('module.exports')) {
          return 'function() { [webpack module code hidden] }';
        }
        
        return fnString;
      };
    } catch (e) {
      // Silent fail
    }
  }
}

// Create and export singleton instance
export const webpackObfuscator = new WebpackObfuscator();
