import "./index.css";
import { lazy, Suspense, useState, useMemo } from "react";
import useCurrentLocalPage from "./hooks/useCurrentLocalPage";

// Lazy loaded components
const MediaPage = lazy(() => import("./pages/media"));
const LeftMenuBar = lazy(() => import("./ui/LeftMenuBar"));
const Settings = lazy(() => import("./ui/Settings"));
const HomePage = lazy(() => import("./pages/index"));

// Types
interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}

// Icons
const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4"
  >
    <path d="M8.543 2.232a.75.75 0 0 0-1.085 0l-5.25 5.5A.75.75 0 0 0 2.75 9H4v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1a1 1 1 2 0v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V9h1.25a.75.75 0 0 0 .543-1.268l-5.25-5.5Z" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-4"
  >
    <path
      fillRule="evenodd"
      d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 0 1 1.262.125l.962.962a1 1 0 0 1 .125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.294a1 1 0 0 1 .804.98v1.361a1 1 0 0 1-.804.98l-1.473.295a6.95 6.95 0 0 1-.587 1.416l.834 1.25a1 1 0 0 1-.125 1.262l-.962.962a1 1 0 0 1-1.262.125l-1.25-.834a6.953 6.953 0 0 1-1.416.587l-.294 1.473a1 1 0 0 1-.98.804H9.32a1 1 0 0 1-.98-.804l-.295-1.473a6.957 6.957 0 0 1-1.416-.587l-1.25.834a1 1 0 0 1-1.262-.125l-.962-.962a1 1 0 0 1-.125-1.262l.834-1.25a6.957 6.957 0 0 1-.587-1.416l-1.473-.294A1 1 0 0 1 1 10.68V9.32a1 1 0 0 1 .804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 0 1 .125-1.262l.962-.962A1 1 0 0 1 5.38 3.03l1.25.834a6.957 6.957 0 0 1 1.416-.587l.294-1.473ZM13 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      clipRule="evenodd"
    />
  </svg>
);

const MediaIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4"
  >
    <path
      fillRule="evenodd"
      d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm10.5 5.707a.5.5 0 0 0-.146-.353l-1-1a.5.5 0 0 0-.708 0L9.354 9.646a.5.5 0 0 1-.708 0L6.354 7.354a.5.5 0 0 0-.708 0l-2 2a.5.5 0 0 0-.146.353V12a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V9.707ZM12 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"
      clipRule="evenodd"
    />
  </svg>
);

// Loading component
const LoadingFallback = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="flex items-center gap-2">
      <p className="text-gray-500 text-sm dark:text-gray-400">{message}</p>
    </div>
  </div>
);

export function App() {
  const [currentPage, updateCurrentPage] = useCurrentLocalPage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Memoized menu items for better performance
  const menuItems = useMemo<MenuItemProps[]>(
    () => [
      {
        icon: <HomeIcon />,
        title: "Home",
        onClick: () => updateCurrentPage("home"),
      },
      {
        icon: <SettingsIcon />,
        title: "Settings",
        onClick: () => setIsSettingsOpen(true),
      },
      {
        icon: <MediaIcon />,
        title: "Photos & Videos",
        onClick: () => updateCurrentPage("media"),
      },
    ],
    [updateCurrentPage]
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage />;
      case "media":
        return <MediaPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="App flex h-screen overflow-hidden bg-white dark:bg-dark-700">
      <aside className="w-12 border-r border-gray-200 bg-gray-50 dark:bg-dark-800 dark:border-dark-300 flex flex-col justify-between">
        <Suspense fallback={<LoadingFallback message="" />}>
          <LeftMenuBar items={menuItems} />
        </Suspense>
      </aside>

      <main className="flex flex-col flex-1 min-h-0">
        <header className="w-full font-medium py-2 px-3 bg-gray-50 border-b border-gray-200 dark:bg-dark-800 dark:border-dark-300">
          <nav className="w-full">
            <ul className="text-[13px] text-gray-500 dark:text-gray-400 flex gap-4">
              <li className="hover:text-black dark:hover:text-gray-200 cursor-pointer select-none transition-colors">
                Menu element 1
              </li>
            </ul>
          </nav>
        </header>

        <section className="flex-1 min-h-0 w-full overflow-y-auto">
          <Suspense fallback={<LoadingFallback message="Loading page..." />}>
            {renderCurrentPage()}
          </Suspense>
        </section>
      </main>

      {isSettingsOpen && (
        <Suspense fallback={<LoadingFallback message="Loading settings..." />}>
          <Settings setSettingsOpen={setIsSettingsOpen} />
        </Suspense>
      )}
    </div>
  );
}

export default App;
