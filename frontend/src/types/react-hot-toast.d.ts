declare module "react-hot-toast" {
  type ToastHandler = {
    id: string;
  };

  interface ToastFunction {
    (message: string): void;
    (render: (t: ToastHandler) => JSX.Element): void;
    dismiss: (id?: string) => void;
  }

  const toast: ToastFunction;

  export default toast;
}
