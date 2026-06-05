import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { selectIsLoggedIn, selectIsRefreshing } from '../../redux/user/selectors';
import DotLoader from '../DotLoader/DotLoader';

interface RestrictedRouteProps {
  component: React.ReactElement;
  redirectTo: string;
}

export default function RestrictedRoute({
  component: Component,
  redirectTo,
}: RestrictedRouteProps) {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const isRefreshing = useSelector(selectIsRefreshing);
  const { t } = useTranslation();

  // waiting for checking token validity on app start or refresh
  if (isRefreshing) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <DotLoader text={t('verifying_session')} />
      </div>
    );
  }

  return isLoggedIn ? <Navigate to={redirectTo} replace /> : Component;
}
