import { create } from 'zustand';

let toastId = 0;

const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: ({ type = 'info', title, message, duration = 5000 }) => {
    const id = ++toastId;
    set((state) => ({
      toasts: [...state.toasts, { id, type, title, message, duration }],
    }));
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }
    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  // Convenience methods
  success: (title, message) => get().addToast({ type: 'success', title, message }),
  error: (title, message) => get().addToast({ type: 'error', title, message, duration: 8000 }),
  warning: (title, message) => get().addToast({ type: 'warning', title, message }),
  info: (title, message) => get().addToast({ type: 'info', title, message }),
}));

export default useToastStore;
