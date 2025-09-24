/**
 * Security Middleware
 * Protects against common attacks
 */

const xss = require('xss');

class SecurityMiddleware {
  constructor(isDevelopment = false) {
    this.isDevelopment = isDevelopment;
    this.suspiciousPatterns = [
      // SQL Injection patterns
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDROP\b|\bDELETE\b|\bUPDATE\b).*(\bFROM\b|\bWHERE\b)/gi,
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/gi,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,

      // XSS patterns
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,

      // Path traversal
      /\.\.\//g,
      /\.\.\\/,

      // Command injection
      /[;&|`]\s*(?:ls|cat|wget|curl|bash|sh|rm|mv|cp)/gi
    ];

    // Bind methods
    this.checkForThreats = this.checkForThreats.bind(this);
    this.sanitizeInput = this.sanitizeInput.bind(this);
  }

  /**
   * Check for security threats in request
   */
  checkForThreats(req, res, next) {
    try {
      // Skip in development mode for easier debugging
      if (this.isDevelopment && !req.headers['x-security-check']) {
        return next();
      }

      const dataToCheck = [
        JSON.stringify(req.body || {}),
        JSON.stringify(req.query || {}),
        JSON.stringify(req.params || {}),
        req.url,
        JSON.stringify(req.headers || {})
      ].join(' ');

      // Check for suspicious patterns
      for (const pattern of this.suspiciousPatterns) {
        if (pattern.test(dataToCheck)) {
          console.warn('⚠️ Security threat detected:', pattern);

          // Log security event
          this.logSecurityEvent({
            type: 'THREAT_DETECTED',
            pattern: pattern.toString(),
            ip: req.ip,
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString()
          });

          // In production, block the request
          if (!this.isDevelopment) {
            return res.status(403).json({
              error: 'Security violation detected. This incident has been reported.'
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error('Security check error:', error);
      next();
    }
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(req, res, next) {
    try {
      // Skip in development for easier debugging
      if (this.isDevelopment && !req.headers['x-sanitize']) {
        return next();
      }

      // Sanitize body
      if (req.body) {
        req.body = this.sanitizeObject(req.body);
      }

      // Sanitize query
      if (req.query) {
        req.query = this.sanitizeObject(req.query);
      }

      // Sanitize params
      if (req.params) {
        req.params = this.sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      console.error('Sanitization error:', error);
      next();
    }
  }

  /**
   * Recursively sanitize object
   */
  sanitizeObject(obj) {
    if (typeof obj === 'string') {
      return xss(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        // Sanitize key
        const sanitizedKey = xss(key);
        // Sanitize value
        sanitized[sanitizedKey] = this.sanitizeObject(obj[key]);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Log security events
   */
  logSecurityEvent(event) {
    // In production, this would go to a security monitoring service
    console.log('🔒 Security Event:', event);

    // You could also:
    // - Send to logging service (Datadog, Splunk, etc.)
    // - Store in database
    // - Send alerts to security team
    // - Block IP after multiple violations
  }

  /**
   * Validate content type
   */
  validateContentType(expectedType = 'application/json') {
    return (req, res, next) => {
      if (this.isDevelopment) {
        return next();
      }

      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes(expectedType)) {
        return res.status(400).json({
          error: `Invalid content type. Expected ${expectedType}`
        });
      }
      next();
    };
  }

  /**
   * Check for common security headers
   */
  checkSecurityHeaders(req, res, next) {
    if (this.isDevelopment) {
      return next();
    }

    // Warn if missing important headers
    const requiredHeaders = [
      'user-agent',
      'accept',
      'content-type'
    ];

    for (const header of requiredHeaders) {
      if (!req.headers[header]) {
        console.warn(`⚠️ Missing header: ${header}`);
      }
    }

    next();
  }
}

module.exports = { SecurityMiddleware };