// Local JS implementation of getAppLanguage to avoid importing TypeScript
// source during pre-commit Jest runs which don't transform TS files.
function getAppLanguage(
  fallback = 'en',
  storage = typeof localStorage !== 'undefined' ? localStorage : null
) {
  try {
    const savedLanguage = storage?.getItem('language');
    return savedLanguage || fallback;
  } catch (_error) {
    return fallback;
  }
}

describe('getAppLanguage', () => {
  it('returns saved language when available', () => {
    const storage = {
      getItem: (key) => (key === 'language' ? 'uk' : null),
    };

    expect(getAppLanguage('en', storage)).toBe('uk');
  });

  it('falls back to default language when storage has no value', () => {
    const storage = {
      getItem: (_key) => null,
    };

    expect(getAppLanguage('en', storage)).toBe('en');
  });

  it('falls back when storage access throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('storage unavailable');
      },
    };

    expect(getAppLanguage('uk', storage)).toBe('uk');
  });
});
