import { hmacSha256, compareHashes } from '../../../main/app/util/hmac';

describe('hmacSha256', () => {
  test('returns a 64-character lowercase hex string', () => {
    const hex = hmacSha256('key', 'message');
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  test('is deterministic and depends on key and message', () => {
    const a = hmacSha256('k', 'm');
    const b = hmacSha256('k', 'm');
    const c = hmacSha256('k2', 'm');
    const d = hmacSha256('k', 'm2');

    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
  });
});

describe('compareHashes', () => {
  test('returns true for identical valid hashes', () => {
    const h = hmacSha256('secret', 'payload');
    expect(compareHashes(h, h)).toBe(true);
  });

  test('returns false for different lengths', () => {
    expect(compareHashes('a', 'aa')).toBe(false);
  });
});
