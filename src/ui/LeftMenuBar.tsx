export interface MenuItem {
  title: string;
  icon: React.ReactNode;
  ariaLabel?: string;
  onClick: () => void;
}

export interface LeftMenuBarProps {
  items: MenuItem[];
}

export default function LeftMenuBar({ items }: LeftMenuBarProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start">
      <ul>
        {items.map((item, index) => (
          <li key={index} className="my-2">
            <button
              type="button"
              aria-roledescription="button"
              title={item.title}
              onClick={item.onClick}
              aria-label={item.ariaLabel || item.title}
              className="p-2 rounded hover:bg-dark-200 dark:hover:bg-dark-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer"
            >
              {item.icon}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
