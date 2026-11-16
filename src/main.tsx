import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register service worker for offline PWA support
registerSW({
  immediate: true,
  onOfflineReady() {
    // Offline cache ready silently
  },
});

createRoot(document.getElementById('root')!).render(<App />);
