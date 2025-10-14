import toast from "react-hot-toast";
import css from "../toastMaker/toastMaker.module.css";
import Icon from "../../components/Icon";

type ToastStatus = "success" | "error";

export default function toastMaker(text: string, status?: ToastStatus): void {
  switch (status) {
    case "success":
      return toast((t: { id: string }) => (
        <div className={css.toastContainer}>
          <Icon name="calendar-sad" className={css.iconSuccess} />
          <span className={css.toastSuccess}>{text}</span>
          <button onClick={() => toast.dismiss(t.id)}>Close</button>
        </div>
      ));

    case "error":
      return toast((t: { id: string }) => (
        <div className={css.toastContainer}>
          <Icon name="calendar-sad" className={css.iconSuccess} />
          <span className={css.toastSuccess}>{text}</span>
          <button onClick={() => toast.dismiss(t.id)}>Close</button>
        </div>
      ));

    default:
      return toast(text);
  }
}
