import React from 'react';
import Toast, { ToastMessage } from './Toast';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose?: (id: string) => void;
  onRemove?: (id: string) => void;
  position?:
    | 'top-right'
    | 'top-left'
    | 'top-center'
    | 'bottom-right'
    | 'bottom-left'
    | 'bottom-center';
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onClose,
  onRemove,
  position = 'top-right',
}) => {
  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  const handleClose = onClose || onRemove || (() => {});

  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed z-50 w-full max-w-sm ${getPositionStyles()}`}
      style={{ pointerEvents: 'none' }}
    >
      <div className="space-y-2" style={{ pointerEvents: 'auto' }}>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={handleClose} />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
