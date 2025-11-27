import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { styled } from '@stitches/react';
import { logout } from '../../redux/user/operations';
import { selectUser } from '../../redux/user/selectors';
import { useAppDispatch } from '../../redux/hooks';

const HeaderContainer = styled('div', {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

const UserButton = styled('button', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  background: 'white',
  cursor: 'pointer',
  transition: 'all 0.2s',

  '&:hover': {
    background: '#f9fafb',
    borderColor: '#667eea',
  },

  '&:focus': {
    outline: 'none',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
});

const Avatar = styled('div', {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontWeight: 600,
  fontSize: '14px',
});

const UserInfo = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',

  '@media (max-width: 768px)': {
    display: 'none',
  },
});

const UserName = styled('span', {
  fontSize: '14px',
  fontWeight: 600,
  color: '#1f2937',
});

const UserEmail = styled('span', {
  fontSize: '12px',
  color: '#6b7280',
});

const Dropdown = styled('div', {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  width: '220px',
  background: 'white',
  borderRadius: '8px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
  border: '1px solid #e5e7eb',
  padding: '8px',
  zIndex: 1000,
});

const DropdownItem = styled('button', {
  width: '100%',
  padding: '10px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: 'none',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  color: '#374151',
  transition: 'all 0.2s',
  textAlign: 'left',

  '&:hover': {
    background: '#f3f4f6',
  },

  variants: {
    variant: {
      danger: {
        color: '#dc2626',

        '&:hover': {
          background: '#fee',
        },
      },
    },
  },
});

const Divider = styled('div', {
  height: '1px',
  background: '#e5e7eb',
  margin: '8px 0',
});

export const UserProfileHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/');
  };

  if (!user) {
    return null;
  }

  const initials = user.name
    .trim()
    .split(/\s+/)
    .map((part: string) => part[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <HeaderContainer ref={dropdownRef}>
      <UserButton onClick={() => setIsOpen(!isOpen)}>
        <Avatar>{initials}</Avatar>
        <UserInfo>
          <UserName>{user.name}</UserName>
          <UserEmail>{user.email}</UserEmail>
        </UserInfo>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>{isOpen ? '▲' : '▼'}</span>
      </UserButton>

      {isOpen && (
        <Dropdown>
          <DropdownItem onClick={() => setIsOpen(false)}>
            <span>👤</span>
            <div>
              <div style={{ fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{user.email}</div>
            </div>
          </DropdownItem>

          <Divider />

          <DropdownItem
            onClick={() => {
              /* Add settings handler */
            }}
          >
            <span>⚙️</span>
            <span>Settings</span>
          </DropdownItem>

          <DropdownItem
            onClick={() => {
              /* Add help handler */
            }}
          >
            <span>❓</span>
            <span>Help & Support</span>
          </DropdownItem>

          <Divider />

          <DropdownItem variant="danger" onClick={handleLogout}>
            <span>🚪</span>
            <span>Logout</span>
          </DropdownItem>
        </Dropdown>
      )}
    </HeaderContainer>
  );
};
