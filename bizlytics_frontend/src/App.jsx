import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster 
          position="top-right"
          toastOptions={{
            success: {
              style: {
                background: '#ECFDF5',
                color: '#065F46',
                border: '1px solid #A7F3D0',
              },
              iconTheme: {
                primary: '#10B981',
                secondary: '#ECFDF5',
              },
            },
            error: {
              style: {
                background: '#FEF2F2',
                color: '#991B1B',
                border: '1px solid #FECACA',
              },
              iconTheme: {
                primary: '#EF4444',
                secondary: '#FEF2F2',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
