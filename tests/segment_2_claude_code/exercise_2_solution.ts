/**
 * Exercise 2: Code Review Challenge - Solution
 *
 * This file shows the improved implementation after addressing
 * all the security and quality issues from the review.
 */

import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

// =============================================================================
// Configuration - Use environment variables, never hardcode secrets
// =============================================================================

interface AuthConfig {
  jwtSecret: string;
  jwtIssuer: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  bcryptRounds: number;
  maxLoginAttempts: number;
  lockoutDurationMs: number;
}

function loadConfig(): AuthConfig {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters');
  }

  return {
    jwtSecret,
    jwtIssuer: process.env.JWT_ISSUER || 'my-app',
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDurationMs: parseInt(process.env.LOCKOUT_DURATION_MS || '900000', 10), // 15 minutes
  };
}

// =============================================================================
// Types
// =============================================================================

interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  passwordChangedAt: Date;
}

type UserRole = 'admin' | 'user' | 'readonly';

interface LoginRequest {
  email: string;
  password: string;
}

interface TokenPayload {
  sub: string; // User ID (subject)
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
  iss: string;
  jti: string; // JWT ID for revocation
}

interface AuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: AuthError;
}

interface AuthError {
  code: string;
  message: string;
}

// =============================================================================
// Custom Errors
// =============================================================================

class AuthenticationError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// =============================================================================
// Password Hashing - Use bcrypt (simulated with crypto for this example)
// =============================================================================

/**
 * Hash a password using a secure algorithm.
 * In production, use bcrypt or argon2.
 */
async function hashPassword(password: string, rounds: number = 12): Promise<string> {
  // Validate password strength
  if (password.length < 8) {
    throw new AuthenticationError('WEAK_PASSWORD', 'Password must be at least 8 characters');
  }

  // In production, use: await bcrypt.hash(password, rounds)
  // This is a simplified simulation using pbkdf2
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash.
 * Uses constant-time comparison to prevent timing attacks.
 */
async function verifyPassword(inputPassword: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) {
    return false;
  }

  const inputHash = crypto.pbkdf2Sync(inputPassword, salt, 100000, 64, 'sha512').toString('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(inputHash));
}

// =============================================================================
// Token Management
// =============================================================================

/**
 * Generate a cryptographically secure token ID.
 */
function generateTokenId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate access and refresh tokens.
 */
function generateTokens(
  user: User,
  config: AuthConfig,
): { accessToken: string; refreshToken: string } {
  const tokenId = generateTokenId();

  const accessPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    jti: tokenId,
    type: 'access',
  };

  const refreshPayload = {
    sub: user.id,
    jti: generateTokenId(),
    type: 'refresh',
  };

  const accessToken = jwt.sign(accessPayload, config.jwtSecret, {
    expiresIn: config.accessTokenExpiry,
    issuer: config.jwtIssuer,
    algorithm: 'HS256',
  });

  const refreshToken = jwt.sign(refreshPayload, config.jwtSecret, {
    expiresIn: config.refreshTokenExpiry,
    issuer: config.jwtIssuer,
    algorithm: 'HS256',
  });

  return { accessToken, refreshToken };
}

/**
 * Verify and decode a JWT token.
 */
function verifyToken(token: string, config: AuthConfig): TokenPayload {
  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: config.jwtIssuer,
      algorithms: ['HS256'],
    }) as TokenPayload;

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('TOKEN_EXPIRED', 'Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('INVALID_TOKEN', 'Token is invalid');
    }
    throw new AuthenticationError('TOKEN_ERROR', 'Token verification failed');
  }
}

// =============================================================================
// Rate Limiting and Account Lockout
// =============================================================================

/**
 * Check if an account is locked.
 */
function isAccountLocked(user: User): boolean {
  if (!user.lockedUntil) {
    return false;
  }
  return user.lockedUntil > new Date();
}

/**
 * Record a failed login attempt.
 */
function recordFailedAttempt(user: User, config: AuthConfig): void {
  user.failedLoginAttempts += 1;

  if (user.failedLoginAttempts >= config.maxLoginAttempts) {
    user.lockedUntil = new Date(Date.now() + config.lockoutDurationMs);
    // In production, also: log security event, notify user, alert security team
  }
}

/**
 * Clear failed attempts on successful login.
 */
function clearFailedAttempts(user: User): void {
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
}

// =============================================================================
// Input Validation
// =============================================================================

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validate email format.
 */
function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

/**
 * Validate password strength.
 */
function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    errors.push('Password must be at most 128 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// User Repository (simulated database)
// =============================================================================

class UserRepository {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const userId = this.emailIndex.get(normalizedEmail);
    if (!userId) {
      return null;
    }
    return this.users.get(userId) || null;
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = crypto.randomUUID();
    const now = new Date();

    const user: User = {
      ...userData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, user);
    this.emailIndex.set(userData.email.toLowerCase().trim(), id);

    return user;
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) {
      return null;
    }

    const updated = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) {
      return false;
    }

    this.emailIndex.delete(user.email.toLowerCase().trim());
    return this.users.delete(id);
  }
}

// =============================================================================
// Authentication Service
// =============================================================================

export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private config: AuthConfig,
  ) {}

  /**
   * Authenticate a user and return tokens.
   * Generic error messages prevent user enumeration.
   */
  async login(request: LoginRequest): Promise<AuthResult> {
    const { email, password } = request;

    // Validate input
    if (!email || !password) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Email and password are required' },
      };
    }

    if (!validateEmail(email)) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Invalid email format' },
      };
    }

    // Find user - use generic message to prevent enumeration
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      // Simulate password hash check to prevent timing attacks
      await hashPassword('dummy-password', this.config.bcryptRounds);
      return {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      };
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      return {
        success: false,
        error: { code: 'ACCOUNT_LOCKED', message: 'Account is temporarily locked. Try again later.' },
      };
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      recordFailedAttempt(user, this.config);
      await this.userRepo.update(user.id, {
        failedLoginAttempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil,
      });

      return {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      };
    }

    // Clear failed attempts on success
    clearFailedAttempts(user);
    await this.userRepo.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    // Generate tokens
    const tokens = generateTokens(user, this.config);

    // Audit log (in production, use proper logging service)
    this.auditLog('LOGIN_SUCCESS', user.id, { email: user.email });

    return {
      success: true,
      ...tokens,
    };
  }

  /**
   * Register a new user.
   */
  async register(email: string, password: string): Promise<AuthResult> {
    // Validate email
    if (!validateEmail(email)) {
      return {
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Invalid email format' },
      };
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: passwordValidation.errors.join('. '),
        },
      };
    }

    // Check if user exists
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      // Generic message to prevent enumeration
      return {
        success: false,
        error: { code: 'REGISTRATION_FAILED', message: 'Registration failed. Please try again.' },
      };
    }

    // Hash password
    const passwordHash = await hashPassword(password, this.config.bcryptRounds);

    // Create user
    const user = await this.userRepo.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'user', // Default role, never accept role from user input
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordChangedAt: new Date(),
    });

    // Audit log
    this.auditLog('USER_REGISTERED', user.id, { email: user.email });

    // Generate tokens
    const tokens = generateTokens(user, this.config);

    return {
      success: true,
      ...tokens,
    };
  }

  /**
   * Verify an access token and return the user payload.
   */
  verifyAccessToken(token: string): TokenPayload {
    return verifyToken(token, this.config);
  }

  /**
   * Check if a user has the required role.
   */
  authorize(payload: TokenPayload, requiredRoles: UserRole[]): boolean {
    // Admin has access to everything
    if (payload.role === 'admin') {
      return true;
    }

    return requiredRoles.includes(payload.role);
  }

  /**
   * Change user password with proper validation.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResult> {
    const user = await this.userRepo.findById(userId);

    if (!user) {
      return {
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      };
    }

    // Verify current password
    const passwordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!passwordValid) {
      return {
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' },
      };
    }

    // Validate new password
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      return {
        success: false,
        error: { code: 'WEAK_PASSWORD', message: validation.errors.join('. ') },
      };
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword, this.config.bcryptRounds);

    // Update user
    await this.userRepo.update(userId, {
      passwordHash,
      passwordChangedAt: new Date(),
    });

    // Audit log
    this.auditLog('PASSWORD_CHANGED', userId, {});

    return { success: true };
  }

  /**
   * Generate a secure password reset token.
   */
  async initiatePasswordReset(email: string): Promise<{ success: boolean }> {
    const user = await this.userRepo.findByEmail(email);

    // Always return success to prevent enumeration
    if (!user) {
      return { success: true };
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store hash in database (not the token itself)
    // In production: store resetTokenHash with expiry in database

    // Send email with reset link containing the token
    // In production: await emailService.sendPasswordResetEmail(email, resetToken);

    // Audit log
    this.auditLog('PASSWORD_RESET_REQUESTED', user.id, { email: user.email });

    return { success: true };
  }

  /**
   * Log security-relevant events.
   * In production, use a proper audit logging service.
   */
  private auditLog(action: string, userId: string, metadata: Record<string, unknown>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      metadata,
      // In production, also include: IP address, user agent, request ID
    };

    // In production, send to secure audit log system
    // Never log passwords, tokens, or other sensitive data
    console.log('[AUDIT]', JSON.stringify(logEntry));
  }
}

// =============================================================================
// Middleware Functions
// =============================================================================

/**
 * Authentication middleware for Express-like frameworks.
 */
export function createAuthMiddleware(authService: AuthService) {
  return (authHeader: string | undefined): { user: TokenPayload } | { error: AuthError } => {
    if (!authHeader) {
      return {
        error: { code: 'MISSING_AUTH', message: 'Authorization header required' },
      };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return {
        error: { code: 'INVALID_AUTH_FORMAT', message: 'Invalid authorization format' },
      };
    }

    const token = authHeader.slice(7);

    if (!token) {
      return {
        error: { code: 'MISSING_TOKEN', message: 'Token is required' },
      };
    }

    try {
      const payload = authService.verifyAccessToken(token);
      return { user: payload };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return { error: { code: error.code, message: error.message } };
      }
      return { error: { code: 'AUTH_ERROR', message: 'Authentication failed' } };
    }
  };
}

/**
 * Authorization middleware factory.
 */
export function requireRoles(authService: AuthService, ...roles: UserRole[]) {
  return (user: TokenPayload): { authorized: boolean } | { error: AuthError } => {
    if (authService.authorize(user, roles)) {
      return { authorized: true };
    }

    return {
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      },
    };
  };
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create and configure the authentication service.
 */
export function createAuthService(): AuthService {
  const config = loadConfig();
  const userRepo = new UserRepository();
  return new AuthService(userRepo, config);
}
