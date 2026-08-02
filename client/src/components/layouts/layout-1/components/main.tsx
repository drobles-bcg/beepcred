import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLayout } from './context';
import { Footer } from './footer';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { useHideSideMenu } from './splash-layout-context';

export function Main() {
  const isMobile = useIsMobile();
  const { sidebarCollapse } = useLayout();
  const hideSideMenu = useHideSideMenu();

  useEffect(() => {
    const bodyClass = document.body.classList;

    if (sidebarCollapse) {
      bodyClass.add('sidebar-collapse');
    } else {
      bodyClass.remove('sidebar-collapse');
    }
  }, [sidebarCollapse]);

  useEffect(() => {
    const bodyClass = document.body.classList;

    // Add a class to the body element
    bodyClass.add('demo1');
    bodyClass.add('sidebar-fixed');
    bodyClass.add('header-fixed');

    const timer = setTimeout(() => {
      bodyClass.add('layout-initialized');
    }, 1000); // 1000 milliseconds

    // Remove the class when the component is unmounted
    return () => {
      bodyClass.remove('demo1');
      bodyClass.remove('sidebar-fixed');
      bodyClass.remove('sidebar-collapse');
      bodyClass.remove('header-fixed');
      bodyClass.remove('layout-initialized');
      bodyClass.remove('splash-no-sidebar');
      clearTimeout(timer);
    };
  }, []); // Runs only once on mount

  useEffect(() => {
    const bodyClass = document.body.classList;
    if (hideSideMenu) bodyClass.add('splash-no-sidebar');
    else bodyClass.remove('splash-no-sidebar');
    return () => bodyClass.remove('splash-no-sidebar');
  }, [hideSideMenu]);

  return (
    <>
      {!isMobile && !hideSideMenu && <Sidebar />}

      <div className="wrapper flex grow flex-col">
        <Header />

        <main className="grow pt-5" role="content">
          <Outlet />
        </main>

        <Footer />
      </div>
    </>
  );
}
