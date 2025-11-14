/**
 * Simple Router for PSF Platform
 */

import React from 'react';
import App from './App';
import { ComponentShowcase } from './ComponentShowcase';

export function Router() {
  // Simple client-side routing based on hash
  const [currentPath, setCurrentPath] = React.useState(
    window.location.hash.slice(1) || '/'
  );

  React.useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash.slice(1) || '/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (currentPath === '/showcase') {
    return <ComponentShowcase />;
  }

  return <App />;
}
