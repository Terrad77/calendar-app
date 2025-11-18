import { NavLink } from 'react-router-dom';
import css from '../Logo/Logo.module.css';

export default function Logo() {
  return (
    <NavLink className={css.navLink} to="/">
      <div className={css.logo}>
        Calend
        <span>AIr</span>
      </div>
    </NavLink>
  );
}
