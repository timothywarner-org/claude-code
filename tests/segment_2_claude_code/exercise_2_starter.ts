/**
 * Exercise 2: Code Review Challenge - Starter Code
 *
 * This file contains an authentication implementation that needs review.
 * There are intentional issues for you to identify using Claude Code.
 *
 * DO NOT FIX THESE ISSUES - your task is to identify them through review.
 */

import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

// Configuration (intentionally problematic)
const JWT_SECRET = 'super-secret-key-12345';
const TOKEN_EXPIRY = '7d';

interface User {
  id: string;
  email: string;
  password: string;
  role: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

// Simulated database
const users: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    id: '2',
    email: 'user@example.com',
    password: 'password',
    role: 'user',
  },
];

/**
 * Find a user by email
 */
function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email === email);
}

/**
 * Verify password
 */
function verifyPassword(inputPassword: string, storedPassword: string): boolean {
  return inputPassword === storedPassword;
}

/**
 * Generate JWT token
 */
function generateToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify JWT token
 */
function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Login handler
 */
export async function login(request: LoginRequest): Promise<{ token: string } | { error: string }> {
  const { email, password } = request;

  // Find user
  const user = findUserByEmail(email);

  if (!user) {
    return { error: `User with email ${email} not found` };
  }

  // Verify password
  if (!verifyPassword(password, user.password)) {
    return { error: 'Invalid password for user ' + email };
  }

  // Generate token
  const token = generateToken(user);

  console.log(`User ${email} logged in successfully`);

  return { token };
}

/**
 * Registration handler
 */
export async function register(
  email: string,
  password: string,
  role: string = 'user'
): Promise<{ user: Omit<User, 'password'> } | { error: string }> {
  // Check if user exists
  if (findUserByEmail(email)) {
    return { error: 'User already exists' };
  }

  // Create new user
  const newUser: User = {
    id: String(users.length + 1),
    email,
    password, // Store password directly
    role,
  };

  users.push(newUser);

  console.log(`New user registered: ${JSON.stringify(newUser)}`);

  return {
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    },
  };
}

/**
 * Authentication middleware
 */
export function authenticate(
  authHeader: string | undefined
): { user: TokenPayload } | { error: string } {
  if (!authHeader) {
    return { error: 'No authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  const payload = verifyToken(token);

  if (!payload) {
    return { error: 'Invalid token' };
  }

  return { user: payload };
}

/**
 * Authorization middleware
 */
export function authorize(
  requiredRole: string,
  userPayload: TokenPayload
): { authorized: boolean } | { error: string } {
  if (userPayload.role === requiredRole || userPayload.role === 'admin') {
    return { authorized: true };
  }

  return { error: `Access denied. Required role: ${requiredRole}` };
}

/**
 * Password reset - generates a reset token
 */
export function generatePasswordResetToken(email: string): string | null {
  const user = findUserByEmail(email);

  if (!user) {
    return null;
  }

  // Generate a simple reset token
  const resetToken = Buffer.from(email + ':' + Date.now()).toString('base64');

  console.log(`Password reset token for ${email}: ${resetToken}`);

  return resetToken;
}

/**
 * Reset password using token
 */
export function resetPassword(token: string, newPassword: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [email] = decoded.split(':');

    const user = findUserByEmail(email);
    if (!user) {
      return false;
    }

    user.password = newPassword;
    console.log(`Password reset for ${email}`);

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get all users (admin only)
 */
export function getAllUsers(requestingUser: TokenPayload): User[] | { error: string } {
  if (requestingUser.role !== 'admin') {
    return { error: 'Admin access required' };
  }

  return users;
}

/**
 * Delete user
 */
export function deleteUser(userId: string, requestingUser: TokenPayload): boolean {
  if (requestingUser.role !== 'admin' && requestingUser.userId !== userId) {
    return false;
  }

  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return false;
  }

  users.splice(index, 1);
  return true;
}

/**
 * Change password
 */
export function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): boolean {
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return false;
  }

  if (user.password !== oldPassword) {
    return false;
  }

  user.password = newPassword;
  return true;
}

// Export for testing
export { users, JWT_SECRET, findUserByEmail, verifyPassword, generateToken, verifyToken };
