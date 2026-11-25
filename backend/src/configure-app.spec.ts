import { allowedOrigins } from './configure-app';

describe('allowedOrigins', () => {
  const previous = process.env.WEB_ORIGIN;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.WEB_ORIGIN;
    } else {
      process.env.WEB_ORIGIN = previous;
    }
  });

  it('accepts both localhost and 127.0.0.1 for the configured port', () => {
    process.env.WEB_ORIGIN = 'http://localhost:5173';
    expect(allowedOrigins()).toEqual(['http://localhost:5173', 'http://127.0.0.1:5173']);
  });

  it('keeps extra origins and mirrors a local one', () => {
    process.env.WEB_ORIGIN = 'https://console.example.com, http://127.0.0.1:4173';
    expect(allowedOrigins()).toEqual([
      'https://console.example.com',
      'http://127.0.0.1:4173',
      'http://localhost:4173',
    ]);
  });
});
