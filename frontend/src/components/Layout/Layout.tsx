import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import clsx from 'clsx';
import { Sidebar } from '../Sidebar/Sidebar';
import { selectIsLoggedIn } from '../../redux/user/selectors';
import { Header } from '../Header/Header'; // Import the new Header component
import css from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
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
    <div className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-900 dark:text-neutral-50 [--app-header-height:4.5rem]">
      {isAuthenticated && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <div
        className={clsx(
          'flex min-h-screen flex-col transition-[padding-left] duration-300 ease-in-out',
          css.layout,
          isAuthenticated && sidebarOpen && 'lg:pl-[18rem]'
        )}
      >
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isAuthenticated={isAuthenticated}
        />

        <main className={clsx(css.content, 'flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12')}>
          <div className="mx-auto w-full max-w-7xl xl:max-w-[86rem] 2xl:max-w-[96rem]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
