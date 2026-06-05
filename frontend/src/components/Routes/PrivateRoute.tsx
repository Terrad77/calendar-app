import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectError, selectIsLoggedIn, selectIsRefreshing } from '../../redux/user/selectors';
import { useTranslation } from 'react-i18next';
import DotLoader from '../DotLoader/DotLoader';
import { fetchUser } from '../../redux/user/operations';
import { AppDispatch } from '../../redux/store';

interface PrivateRouteProps {
  component: React.ReactElement;
  redirectTo: string;
}

export default function PrivateRoute({ component: Component, redirectTo }: PrivateRouteProps) {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const isRefreshing = useSelector(selectIsRefreshing);
  const error = useSelector(selectError); // get error data from Redux
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  // whaiting for cheking token validity on app start or refresh
  if (isRefreshing) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <DotLoader text={t('verifying_session')} />
      </div>
    );
  }

  // in case of error during session verification
  if (!isLoggedIn && error) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <p className="text-red-500">{t('verifying_error')}</p>
        <button
          onClick={() => dispatch(fetchUser())}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  return isLoggedIn ? Component : <Navigate to={redirectTo} replace />;
}
