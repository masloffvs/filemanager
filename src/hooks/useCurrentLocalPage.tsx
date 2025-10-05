import { useEffect, useState } from "react";

export default function useCurrentLocalPage() {
  // if outside react = throw error
  if (typeof window === "undefined") {
    throw new Error(
      "useCurrentLocalPage can only be used in a React component"
    );
  }

  const LOCAL_STORAGE_KEY = "currentLocalPage";

  useEffect(() => {
    let isMounted = true;
    function handleStorageChange(event: StorageEvent) {
      if (event.key === LOCAL_STORAGE_KEY && isMounted) {
        setCurrentPage(event.newValue ? event.newValue : "home");
      }
    }

    window.addEventListener("storage", handleStorageChange);
    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const [currentPage, setCurrentPage] = useState<string>(() => {
    if (typeof window === "undefined") return "home";
    const storedPage = localStorage.getItem(LOCAL_STORAGE_KEY);
    return storedPage ? storedPage : "home";
  });

  function updateCurrentPage(page: string) {
    setCurrentPage(page);
    localStorage.setItem(LOCAL_STORAGE_KEY, page.toString());
  }

  return [currentPage, updateCurrentPage] as const;
}
