import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectIsLoggedIn } from '../../redux/user/selectors';

interface RestrictedRouteProps {
  component: React.ComponentType;
  redirectTo: string;
}
export default function RestrictedRoute({
  component: Component,
  redirectTo,
}: RestrictedRouteProps) {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  return isLoggedIn ? <Navigate to={redirectTo} /> : Component;
}
