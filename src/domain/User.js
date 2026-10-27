import { ValidationError } from './errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USER_NAME_MAX = 120;
export const EMAIL_MAX = 254;

export class User {
  constructor({ id, name, email }) {
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!cleanName || !cleanEmail) {
      throw new ValidationError('User name and email are required');
    }
    if (cleanName.length > USER_NAME_MAX) {
      throw new ValidationError(`User name must be at most ${USER_NAME_MAX} characters`);
    }
    if (cleanEmail.length > EMAIL_MAX || !EMAIL_PATTERN.test(cleanEmail)) {
      throw new ValidationError('User email must be a valid email address');
    }
    this.id = id;
    this.name = cleanName;
    this.email = cleanEmail;
  }
}
