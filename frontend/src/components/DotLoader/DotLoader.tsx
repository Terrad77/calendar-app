import css from '../DotLoader/DotLoader.module.css';
import type { DotLoaderProps } from '../../types/types';

export default function DotLoader({ text }: DotLoaderProps) {
  return (
    <div className={css.loaderContainer}>
      {text}
      <div className={css.loaderWrapper}>
        <div className={css.loader}></div>
      </div>
    </div>
  );
}
