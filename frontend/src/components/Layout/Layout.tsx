import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import clsx from 'clsx';
import { Sidebar } from '../Sidebar/Sidebar';
import { selectIsLoggedIn } from '../../redux/user/selectors';
import { Header } from '../Header/Header'; // Import the new Header component
import css from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
  headerVariant?: 'default' | 'compact' | 'overlay';
}

export const Layout = ({ children, headerVariant }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAuthenticated = useSelector(selectIsLoggedIn);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  return (
    <div
      className={clsx(
        css.page,
        'min-h-dvh overflow-hidden text-neutral-950 dark:text-neutral-50 [--app-header-height:4.5rem]'
      )}
    >
      {isAuthenticated && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <div
        className={clsx(
          'relative flex min-h-0 flex-col transition-[padding-left] duration-300 ease-in-out',
          css.layout,
          isAuthenticated && sidebarOpen && 'lg:pl-[18rem]'
        )}
      >
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isAuthenticated={isAuthenticated}
          headerVariant={headerVariant}
        />

        <main
          className={clsx(
            css.content,
            headerVariant === 'overlay' && css.contentOverlay,
            'min-h-0 flex-1 overflow-hidden px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12'
          )}
        >
          <div className="mx-auto w-full max-w-[var(--layout-content-max-width)]">{children}</div>
        </main>
      </div>
    </div>
  );
};
