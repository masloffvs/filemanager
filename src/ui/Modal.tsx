import { useMemo } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
}

function isEmptyFunction(fn: (() => void) | undefined) {
  if (!fn) return true;
  return (
    fn.toString() === "function() { [native code] }" ||
    fn.toString() === "function() {}" ||
    fn.toString() === "() => {}"
  );
}

function isChidrenEmpty(children: React.ReactNode) {
  if (children === null || children === undefined) return true;
  if (typeof children === "string" && children.trim() === "") return true;
  if (Array.isArray(children) && children.length === 0) return true;
  return false;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  const modalId = useMemo(() => {
    const randomId = Math.random().toString(36).substring(2, 15);
    return `modal-${randomId}`;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/70 dark:backdrop-blur-xs flex items-center justify-center z-50">
      <div className="bg-white rounded relative shadow-lg w-fit  p-4 max-h-[90vh] overflow-auto dark:bg-dark-700 dark:text-white dark:border-dark-300 dark:rounded-md border border-gray-300">
        {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
        {onClose && !isEmptyFunction(onClose) && (
          <button
            aria-label="Close modal"
            aria-roledescription="button"
            type="button"
            onClick={onClose}
            className="absolute cursor-pointer hover:bg-gray-100 top-4 right-4 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-dark-600 dark:hover:text-white rounded p-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="size-4"
            >
              <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
            </svg>

            <span className="sr-only">Close modal</span>
          </button>
        )}

        <div
          className="focus:outline-none min-h-[100px]"
          data-name="modal-content"
          id={`modal-focus-start-${modalId}`}
          tabIndex={0}
        >
          {/* Focus trap start */}
          {children}

          {process.env.NODE_ENV === "development" &&
            isChidrenEmpty(children) && (
              <div className="text-red-500 text-sm">
                Modal children is empty. Please provide content to display in
                the modal. this message is only shown in development mode.
              </div>
            )}
          {/* Focus trap end */}
        </div>

        {process.env.NODE_ENV === "development" && isEmptyFunction(onClose) && (
          <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 px-4 py-2 pt-12">
            onClose is not provided. Backdrop and close button will not work.
            this message is only shown in development mode.
          </div>
        )}
      </div>
    </div>
  );
}
