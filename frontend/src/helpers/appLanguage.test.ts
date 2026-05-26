import { describe, expect, it } from 'vitest';
import { getAppLanguage } from './appLanguage';

describe('getAppLanguage', () => {
  it('returns saved language when available', () => {
    const storage: Pick<Storage, 'getItem'> = {
      getItem: (key: string) => (key === 'language' ? 'uk' : null),
    };

    expect(getAppLanguage('en', storage)).toBe('uk');
  });

  it('falls back to default language when storage has no value', () => {
    const storage: Pick<Storage, 'getItem'> = {
      getItem: (_key: string) => null,
    };

    expect(getAppLanguage('en', storage)).toBe('en');
  });

  it('falls back when storage access throws', () => {
    const storage: Pick<Storage, 'getItem'> = {
      getItem: () => {
        throw new Error('storage unavailable');
      },
    };

    expect(getAppLanguage('uk', storage)).toBe('uk');
  });
});
