import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router';
import { useAuth } from '@/providers/auth-provider';
import { LayoutProvider } from './components/context';
import { Main } from './components/main';
import { SplashLayoutProvider } from './components/splash-layout-context';

function Layout1Shell() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const hideSideMenu = pathname === '/' && !user;

  return (
    <SplashLayoutProvider value={hideSideMenu}>
      <LayoutProvider>
        <Main />
      </LayoutProvider>
    </SplashLayoutProvider>
  );
}

export function Layout1() {
  return (
    <>
      <Helmet>
        <title>BeepCred</title>
      </Helmet>

      <Layout1Shell />
    </>
  );
}
