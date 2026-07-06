import type { ChangeEvent, FC } from "react";

interface FloatingLabelInputProps {
  label: string;
  type: "text" | "date" | "password";
  name: string;
  value?: string | any;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  newLabelClassName?: string;
  labelClassName?: string;
  newInputClassName?: string;
  inputClassName?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  errors?: string[];
}

const FloatingLabelInput: FC<FloatingLabelInputProps> = ({
  label,
  type,
  name,
  value,
  onChange,
  newLabelClassName,
  labelClassName,
  newInputClassName,
  inputClassName,
  required,
  autoFocus,
  disabled,
  readOnly,
  errors,
}) => {
  return (
    <>
      <div className="relative">
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={`${
            newInputClassName
              ? newInputClassName
              : `block rounded-t-base px-2.5 pb-2.5 pt-5 w-full text-sm text-heading bg-neutral-secondary-medium 
                border-0 border-b-2 border-default-medium appearance-none focus:outline-none focus:ring-0 focus:border-brand peer
                ${inputClassName}`
          }`}
          placeholder=" "
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          readOnly={readOnly}
        />
        <label
          htmlFor={name}
          className={`${
            newLabelClassName
              ? newLabelClassName
              : `absolute text-sm text-body duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-left inset-start-2.5 peer-focus:text-fg-brand peer-placeholder-shown:scale-100 
                        peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 
                        rtl:peer-focus:left-auto 
                    ${labelClassName}
                    `
          }`}
        >
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      </div>
      {errors && errors.length > 0 && (
        <span className="text-red-600">{errors[0]}</span>
      )}
    </>
  );
};

export default FloatingLabelInput;
