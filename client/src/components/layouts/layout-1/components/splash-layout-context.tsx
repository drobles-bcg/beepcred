import { createContext, useContext } from 'react';

/** When true, splash/landing is shown: no left sidebar or sidebar padding. */
const SplashLayoutContext = createContext(false);

export function SplashLayoutProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return <SplashLayoutContext.Provider value={value}>{children}</SplashLayoutContext.Provider>;
}

export function useHideSideMenu() {
  return useContext(SplashLayoutContext);
}
