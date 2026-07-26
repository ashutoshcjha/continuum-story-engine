import { createRoot } from 'react-dom/client';
import App from './App';
import { ProjectExchangeActions } from './ProjectExchangeActions';

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <ProjectExchangeActions />
  </>,
);
