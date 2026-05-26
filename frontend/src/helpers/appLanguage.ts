export const getAppLanguage = (
  fallback: string = 'en',
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage !== 'undefined'
    ? localStorage
    : null
): string => {
  try {
    const savedLanguage = storage?.getItem('language');
    return savedLanguage || fallback;
  } catch (_error) {
    return fallback;
  }
};
