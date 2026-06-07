// Avatar monogram: 2 initials only for exactly two-word names, otherwise the
// first letter. Falls back to the email's first letter, then '?'.
export const getInitials = (name?: string, email?: string): string => {
  const trimmed = name?.trim();
  if (!trimmed) {
    return (email?.charAt(0) ?? '?').toUpperCase();
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return parts[0].charAt(0).toUpperCase();
};
