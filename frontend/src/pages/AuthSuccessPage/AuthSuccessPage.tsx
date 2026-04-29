import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setTokens } from '../../redux/user/userSlice';
import { fetchUser, setAuthHeader } from '../../redux/user/operations';
import type { AppDispatch } from '../../redux/types/storeTypes';

const AuthSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (accessToken && refreshToken) {
      // 1. Save tokens to Redux and LocalStorage
      dispatch(setTokens({ accessToken, refreshToken }));

      // 2. Set Authorization header for upcoming requests
      setAuthHeader(accessToken);

      // 3. Fetch user data to complete login state
      dispatch(fetchUser())
        .unwrap()
        .then(() => {
          // 4. Redirect to calendar on success
          navigate('/calendar', { replace: true });
        })
        .catch((error) => {
          console.error('Failed to fetch user after social login:', error);
          navigate('/signin', { replace: true });
        });
    } else {
      console.error('No tokens found in URL');
      navigate('/signin', { replace: true });
    }
  }, [dispatch, location.search, navigate]);

  return (
    <div
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
    >
      <p>Authenticating...</p>
    </div>
  );
};

export default AuthSuccessPage;
