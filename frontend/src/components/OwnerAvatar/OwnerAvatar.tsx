import { styled } from '@stitches/react';
import { getInitials } from '../../utils/getInitials';

// Owner monogram for events the current user does not own (shared / participant).
// Shared between the calendar grid cards and the edit-form header so the monogram
// stays visually consistent.
const Avatar = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  borderRadius: '50%',
  background: 'linear-gradient(180deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
  color: '#ffffff',
  fontWeight: 700,
  lineHeight: 1,
  letterSpacing: '0.02em',
  variants: {
    size: {
      sm: { width: '1rem', height: '1rem', fontSize: '0.5rem' },
      md: { width: '1.25rem', height: '1.25rem', fontSize: '0.6rem' },
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

export default function OwnerAvatar({ name, size }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <Avatar size={size} title={name} aria-label={`Shared by ${name}`}>
      {getInitials(name)}
    </Avatar>
  );
}
