import type { ChangeEvent, FC, ReactNode } from "react";

interface FloatingLabelSelectProps {
  label: string;
  newSelectClassName?: string;
  selectClassName?: string;
  newLabelClassName?: string;
  labelClassName?: string;
  name: string;
  value?: string | any;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  errors?: string[] | string;
  children: ReactNode;
}

const FloatingLabelSelect: FC<FloatingLabelSelectProps> = ({
  label,
  newSelectClassName,
  selectClassName,
  newLabelClassName,
  labelClassName,
  name,
  value,
  onChange,
  required,
  autoFocus,
  disabled,
  errors,
  children,
}) => {
  const normalizedErrors = Array.isArray(errors)
    ? errors
    : errors
      ? [errors]
      : [];

  return (
    <>
      <div className="relative">
        <select
          name={name}
          id={name}
          {...(value !== undefined ? { value } : {})}
          onChange={onChange}
          className={`${
            newSelectClassName
              ? newSelectClassName
              : `block rounded-t-base px-2.5 pb-2.5 pt-5 w-full text-sm text-heading bg-neutral-secondary-medium border-0 border-b-2 border-default-medium appearance-none focus:outline-none focus:ring-0 focus:border-brand peer ${selectClassName}`
          }`}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
        >
          {children}
        </select>
        <label
          htmlFor={name}
          className={
            newLabelClassName
              ? newLabelClassName
              : `absolute text-sm text-body duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-left inset-start-2.5 peer-focus:text-fg-brand peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto ${labelClassName}`
          }
        >
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      </div>
      {normalizedErrors.length > 0 && (
        <span className="text-red-600">{normalizedErrors[0]}</span>
      )}
    </>
  );
};

export default FloatingLabelSelect;
