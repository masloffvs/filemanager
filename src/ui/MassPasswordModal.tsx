import React from "react";

interface MassPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  password: string;
  onPasswordChange: (password: string) => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}

export default function MassPasswordModal({
  isOpen,
  onClose,
  selectedCount,
  password,
  onPasswordChange,
  onSave,
  saving,
  error,
}: MassPasswordModalProps) {
  const passwordInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => passwordInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded shadow-lg w-full max-w-md p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center min-w-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="size-4 text-blue-600 mr-2 flex-shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                clipRule="evenodd"
              />
            </svg>
            <div className="truncate text-sm font-medium">
              Password Protection
            </div>
          </div>
          <button
            className="text-gray-500 hover:text-gray-700 text-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-xs text-gray-600">
            Set password protection for {selectedCount} selected files
          </div>

          <div>
            <label
              htmlFor="massPassword"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              ref={passwordInputRef}
              id="massPassword"
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter password for selected files"
              disabled={saving}
            />
          </div>

          {error && (
            <div className="text-red-600 text-xs bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving || !password.trim()}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {saving && (
                <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full mr-1"></div>
              )}
              Set Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
