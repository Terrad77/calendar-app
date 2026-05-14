import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Menu } from 'lucide-react';
import clsx from 'clsx';
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';
import { ThemeSwitcher } from '../ThemeSwitcher/ThemeSwitcher';
import { Sidebar } from '../Sidebar/Sidebar';
import { selectIsLoggedIn } from '../../redux/user/selectors';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const isAuthenticated = useSelector(selectIsLoggedIn);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      {isAuthenticated && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <div className={clsx('flex min-h-screen flex-col', isAuthenticated && 'lg:pl-64')}>
        <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-neutral-50/90 backdrop-blur supports-[backdrop-filter]:bg-neutral-50/80">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-end gap-3 px-4 py-4 sm:px-6 lg:px-8">
            {isAuthenticated && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg p-2 hover:bg-neutral-200 lg:hidden"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
