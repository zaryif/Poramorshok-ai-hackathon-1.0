import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ReminderProvider } from './contexts/ReminderContext';
import { UserProvider } from './contexts/UserContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <UserProvider>
          <ReminderProvider>
            <App />
          </ReminderProvider>
        </UserProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);