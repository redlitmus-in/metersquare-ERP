/**
 * Validation Middleware
 */

class ValidationMiddleware {
  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static validatePhone(phone) {
    const re = /^\+?[\d\s-()]+$/;
    return re.test(phone) && phone.length >= 10;
  }
}

module.exports = { ValidationMiddleware };