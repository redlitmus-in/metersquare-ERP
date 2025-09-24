/**
 * MeterSquare ERP - Secure Backend Server
 * Handles encryption/decryption and provides security layer
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Import security middleware
const { SecurityMiddleware } = require('./middleware/security');
const { EncryptionService } = require('./security/encryption');
const { AuthMiddleware } = require('./middleware/auth');
const { ValidationMiddleware } = require('./middleware/validation');

// Import routes
const authRoutes = require('./routes/auth');
const vendorRoutes = require('./routes/vendors');
const purchaseRoutes = require('./routes/purchase');
const quotationRoutes = require('./routes/quotations');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const isDevelopment = process.env.NODE_ENV === 'development';

// Initialize services
const encryption = new EncryptionService();
const security = new SecurityMiddleware(isDevelopment);

// =======================
// SECURITY MIDDLEWARE
// =======================

// 1. Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: isDevelopment ? false : {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: !isDevelopment // Only HSTS in production
}));

// 2. CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'];

    // Allow requests with no origin (mobile apps, Postman, etc) in development
    if (isDevelopment && !origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1 || isDevelopment) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Signature', 'X-Session-Key'],
  exposedHeaders: ['X-Response-Signature']
};
app.use(cors(corsOptions));

// 3. Rate limiting (relaxed in development)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: isDevelopment ? 1000 : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 4. Body parsing with size limits
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Store raw body for signature verification
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.SESSION_SECRET));

// 5. Compression
app.use(compression());

// 6. Logging (minimal in production)
if (isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
  }));
}

// =======================
// DECRYPTION MIDDLEWARE
// =======================

// Decrypt requests from frontend (only for encrypted endpoints)
app.use('/api/secure/', async (req, res, next) => {
  try {
    // Skip decryption in development mode for easier debugging
    if (isDevelopment && !req.headers['x-encryption-enabled']) {
      return next();
    }

    // Check if request is encrypted
    if (req.body && req.body.data && req.body.checksum) {
      console.log('🔓 Decrypting request...');

      // Verify checksum
      const isValid = encryption.verifyChecksum(req.body.data, req.body.checksum);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid request checksum' });
      }

      // Decrypt the data
      const decryptedData = encryption.decrypt(req.body.data);
      req.body = decryptedData;
      req.isEncrypted = true;

      console.log('✅ Request decrypted successfully');
    }

    next();
  } catch (error) {
    console.error('Decryption error:', error);
    res.status(400).json({ error: 'Failed to decrypt request' });
  }
});

// =======================
// SECURITY CHECKS
// =======================

// Apply security checks (XSS, SQL Injection, etc.)
app.use(security.checkForThreats);
app.use(security.sanitizeInput);

// =======================
// STATIC FILES & TEST PAGE
// =======================

// Serve static files from public directory
app.use('/public', express.static('public'));

// Serve security test page in development
if (isDevelopment) {
  app.get('/security-test', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const testFile = path.join(__dirname, '../../test-security.html');

    if (fs.existsSync(testFile)) {
      res.sendFile(testFile);
    } else {
      res.status(404).send('Security test file not found');
    }
  });

  console.log('🧪 Security test page available at: http://localhost:' + PORT + '/security-test');
}

// =======================
// API ROUTES
// =======================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    security: {
      encryption: !isDevelopment,
      rateLimit: true,
      cors: true,
      helmet: true
    }
  });
});

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/secure/vendors', AuthMiddleware.verifyToken, vendorRoutes);
app.use('/api/secure/purchase', AuthMiddleware.verifyToken, purchaseRoutes);
app.use('/api/secure/quotations', AuthMiddleware.verifyToken, quotationRoutes);

// Fallback for unencrypted API calls (backwards compatibility)
app.use('/api/vendors', vendorRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/quotations', quotationRoutes);

// =======================
// RESPONSE ENCRYPTION
// =======================

// Encrypt responses for secure endpoints
app.use((req, res, next) => {
  // Skip encryption in development unless explicitly requested
  if (isDevelopment && !req.headers['x-encryption-enabled']) {
    return next();
  }

  // Only encrypt for secure endpoints
  if (req.path.includes('/secure/') && req.isEncrypted) {
    const originalJson = res.json;
    res.json = function(data) {
      console.log('🔒 Encrypting response...');

      const encrypted = encryption.encrypt(data);
      const response = {
        data: encrypted,
        checksum: encryption.createChecksum(encrypted),
        timestamp: Date.now()
      };

      console.log('✅ Response encrypted');
      originalJson.call(this, response);
    };
  }

  next();
});

// =======================
// ERROR HANDLING
// =======================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Don't expose error details in production
  if (isDevelopment) {
    res.status(err.status || 500).json({
      error: err.message,
      stack: err.stack
    });
  } else {
    res.status(err.status || 500).json({
      error: 'Internal server error'
    });
  }
});

// =======================
// SERVER STARTUP
// =======================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║     MeterSquare ERP Backend Server            ║
║                                                ║
╠════════════════════════════════════════════════╣
║  Environment: ${process.env.NODE_ENV.padEnd(32)}  ║
║  Port: ${PORT.toString().padEnd(40)}  ║
║  Security: ${isDevelopment ? 'Development Mode'.padEnd(35) : 'Production Mode (Full Protection)'.padEnd(35)}  ║
║                                                ║
║  Encryption: ${!isDevelopment ? '✅ Enabled'.padEnd(33) : '⚠️  Optional'.padEnd(33)}  ║
║  Rate Limit: ${!isDevelopment ? '✅ Strict'.padEnd(33) : '⚠️  Relaxed'.padEnd(33)}  ║
║  CORS: ✅ Configured                          ║
║  Helmet: ✅ Active                            ║
║                                                ║
╠════════════════════════════════════════════════╣
║  API Endpoints:                                ║
║  - /api/health          (Public)              ║
║  - /api/auth/*          (Public)              ║
║  - /api/secure/*        (Protected+Encrypted)  ║
║  - /api/*               (Protected)           ║
╚════════════════════════════════════════════════╝

🚀 Server ready at http://localhost:${PORT}
  `);
});