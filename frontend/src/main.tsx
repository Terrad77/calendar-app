import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';

import './index.css';
import App from './App';
import { Toaster } from 'react-hot-toast';
import { store, persistor } from './redux/store';
import './locales';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-left"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--secondary-bg)',
                color: 'var(--primary-text)',
              },
            }}
          />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </StrictMode>
);
