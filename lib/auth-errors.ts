export class AuthError extends Error {
  constructor(public status: 400 | 401 | 403 | 404 | 409 | 429 | 503, message: string, public code = 'ACCESS_DENIED') {
    super(message);
    this.name = 'AuthError';
  }
}
