import "./index.css";
import { lazy, Suspense, useState } from "react";
import useCurrentLocalPage from "./hooks/useCurrentLocalPage";
// import MediaPage from "./pages/media";

const MediaPage = lazy(() => import("./pages/media"));
const LeftMenuBar = lazy(() => import("./ui/LeftMenuBar"));
const Settings = lazy(() => import("./ui/Settings"));

const HomePage = lazy(() => import("./pages/index"));

export function App() {
  const [currentPage, updateCurrentPage] = useCurrentLocalPage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="App flex flex-row h-screen overflow-hidden">
      <div
        id="left-menu-panel"
        className="w-12 border-r border-r-gray-200 bg-gray-50 dark:bg-dark-800 dark:border-r-dark-300 flex flex-col justify-between"
      >
        <LeftMenuBar
          items={[
            {
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="size-4"
                >
                  <path d="M8.543 2.232a.75.75 0 0 0-1.085 0l-5.25 5.5A.75.75 0 0 0 2.75 9H4v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1a1 1 0 1 1 2 0v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V9h1.25a.75.75 0 0 0 .543-1.268l-5.25-5.5Z" />
                </svg>
              ),
              title: "Home",
              onClick: () => {
                updateCurrentPage("home");
              },
            },
            {
              icon: (
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
              ),
              title: "Settings",
              onClick: () => setIsSettingsOpen(true),
            },
            {
              icon: (
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
              ),
              title: "Photos & Videos",
              onClick: () => {
                updateCurrentPage("media");
              },
            },
          ]}
        />
      </div>

      <div className="flex flex-col w-full items-start justify-center min-h-screen bg-white dark:bg-dark-700">
        <div
          id="app-menu"
          className="w-full font-medium py-2 px-3 bg-gray-50 border-b border-gray-200 top-0 left-0 right-0 dark:bg-dark-800 dark:border-dark-300 flex flex-row items-center"
        >
          <ul className="text-[13px] text-gray-500 w-full flex flex-row gap-4 dark:text-gray-400">
            <li className="hover:text-black cursor-pointer select-none dark:hover:text-gray-200">
              Menu element 1
            </li>
          </ul>
        </div>

        {
          // Main content area
        }
        <div className="h-full w-full">
          <Suspense
            fallback={
              <div>
                <p className="text-gray-500 text-[10px] dark:text-gray-400 p-4">
                  React component is loading...
                </p>
              </div>
            }
          >
            {currentPage === "home" && <HomePage />}
            {currentPage === "media" && <MediaPage />}
          </Suspense>
        </div>
      </div>

      {isSettingsOpen && <Settings setSettingsOpen={setIsSettingsOpen} />}
    </div>
  );
}

export default App;
