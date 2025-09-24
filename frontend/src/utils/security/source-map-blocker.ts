/**
 * Source Map Blocker
 * Prevents source maps from loading, making it impossible to view original source code
 */

class SourceMapBlocker {
  private isProduction: boolean;
  private initialized: boolean = false;
  private originalAppendChild: (node: Node) => Node;
  private originalSetAttribute: (name: string, value: string) => void;

  constructor() {
    this.isProduction = import.meta.env.PROD;
    
    // Store original DOM methods
    this.originalAppendChild = Node.prototype.appendChild;
    this.originalSetAttribute = Element.prototype.setAttribute;
    
    // Auto-initialize in production
    if (this.isProduction) {
      this.initialize();
    }
  }

  /**
   * Initialize source map blocking
   */
  public initialize(): void {
    if (this.initialized) return;
    
    this.blockExistingSourceMaps();
    this.preventSourceMapLoading();
    this.interceptSourceMapRequests();
    
    this.initialized = true;
  }

  /**
   * Block existing source maps
   */
  private blockExistingSourceMaps(): void {
    try {
      // Find and remove existing sourcemap comments
      document.querySelectorAll('script').forEach(script => {
        if (script.textContent?.includes('sourceMappingURL')) {
          // Remove the sourcemap comment
          script.textContent = script.textContent.replace(
            /\/\/# sourceMappingURL=.+$/gm, 
            ''
          );
        }
      });
      
      // Find and remove existing sourcemap links
      document.querySelectorAll('link[rel="sourcemap"]').forEach(link => {
        link.remove();
      });
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Prevent source map loading
   */
  private preventSourceMapLoading(): void {
    try {
      // Override appendChild to block sourcemap script tags
      Node.prototype.appendChild = function<T extends Node>(node: T): T {
        // Check if this is a script tag with sourcemap
        if (node instanceof HTMLScriptElement && 
            node.textContent?.includes('sourceMappingURL')) {
          // Remove the sourcemap comment
          node.textContent = node.textContent.replace(
            /\/\/# sourceMappingURL=.+$/gm, 
            ''
          );
        }
        
        // Check if this is a sourcemap link
        if (node instanceof HTMLLinkElement && 
            node.rel === 'sourcemap') {
          // Don't append sourcemap links
          return node;
        }
        
        // Call original method for all other nodes
        return this.originalAppendChild.call(this, node);
      }.bind(this);
      
      // Override setAttribute to block sourcemap attributes
      Element.prototype.setAttribute = function(name: string, value: string): void {
        // Block sourcemap related attributes
        if (name === 'rel' && value === 'sourcemap') {
          return;
        }
        
        // Call original method for all other attributes
        return this.originalSetAttribute.call(this, name, value);
      }.bind(this);
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Intercept source map requests
   */
  private interceptSourceMapRequests(): void {
    try {
      // Override fetch to block .map requests
      const originalFetch = window.fetch;
      
      window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const url = typeof input === 'string' ? input : input.toString();
        
        // Block source map requests
        if (url.endsWith('.map')) {
          // Return empty response
          return new Response('', {
            status: 404,
            statusText: 'Not Found'
          });
        }
        
        // Call original fetch for all other requests
        return originalFetch(input, init);
      };
      
      // Override XMLHttpRequest to block .map requests
      const originalOpen = XMLHttpRequest.prototype.open;
      
      XMLHttpRequest.prototype.open = function(
        method: string, 
        url: string | URL, 
        async: boolean = true, 
        username?: string | null, 
        password?: string | null
      ): void {
        const urlStr = url.toString();
        
        // Block source map requests
        if (urlStr.endsWith('.map')) {
          // Redirect to non-existent URL
          return originalOpen.call(
            this, 
            method, 
            'data:text/plain,', 
            async, 
            username, 
            password
          );
        }
        
        // Call original open for all other requests
        return originalOpen.call(this, method, url, async, username, password);
      };
    } catch (e) {
      // Silent fail
    }
  }
}

// Create and export singleton instance
export const sourceMapBlocker = new SourceMapBlocker();
