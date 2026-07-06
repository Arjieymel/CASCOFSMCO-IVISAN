import { useCallback, useEffect, useState, type FC } from "react";
import { useDropzone } from "react-dropzone";
import RemoveButton from "../Button/RemoveButton";

interface UploadInputProps {
  label: string;
  name: string;
  value?: File | null;
  onChange?: (file: File | null) => void;
  onRemoveExistingImageUrl?: () => void;
  existingImageUrl?: string | null;
  errors?: string[];
}

const UploadInput: FC<UploadInputProps> = ({
  label,
  name,
  value,
  onChange,
  onRemoveExistingImageUrl,
  existingImageUrl,
  errors,
}) => {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setPreview(URL.createObjectURL(file));

        if (onChange) onChange(file);
      }
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/png": [], "image/jpg": [], "image/jpeg": [] },
    multiple: false,
  });

  useEffect(() => {
    if (value) {
      setPreview(URL.createObjectURL(value));
    } else if (existingImageUrl) {
      setPreview(existingImageUrl);
    } else setPreview(null);
  }, [value, existingImageUrl]);

  return (
    <>
      <div className="mb-1">
        <label htmlFor={name} className="text-blue-600">
          {label}
        </label>
      </div>
      <div
        className={`transition border border-gray-300 border-dashed cursor-pointer rounded-lg hover:border-blue-900 ${errors ? "mb-0" : "mb-4"}`}
      >
        <div
          {...getRootProps()}
          className={`rounded-lg border-dashed border-gray-300 p-7 lg:p-10 ${
            isDragActive
              ? "border-blue-600 bg-gray-100"
              : "border-gray-300 bg-gray-50"
          }`}
        >
          <input {...getInputProps()} name={name} id={name} />
          <div className="flex flex-col items-center m-0">
            {preview ? (
              <img
                src={preview}
                alt="Profile Picture Preview"
                className="object-cover rounded-full w-[185px] h-[185px]"
              />
            ) : (
              <>
                <div className="mb-[22px] flex justify-center">
                  <div className="flex w-[68px] h-[68px] items-center justify-center rounded-full bg-gray-200 text-gray-600 ">
                    <svg
                      className="fill-current"
                      width="29"
                      height="28"
                      viewBox="0 0 29 28"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M14.5019 3.91699C14.2852 3.91699 14.0899 4.00891 13.953 4.15589L8.57363 9.53186C8.28065 9.82466 8.2805 10.2995 8.57373 10.5925C8.86681 10.8855 9.34097 10.8857 9.63396 10.5929L13.7519 6.47752V18.667C13.7519 19.0812 14.0877 19.417 14.5019 19.417C14.9161 19.417 15.2519 19.0812 15.2519 18.667V6.48234L19.3653 10.5929C19.6583 10.8857 20.1332 10.8855 20.426 10.5925C20.7188 10.2995 20.7186 9.82463 20.4259 9.53184L15.0838 4.19378C14.9463 4.02488 14.7367 3.91699 14.5019 3.91699ZM5.91626 18.667C5.91626 18.2528 5.58047 17.917 5.16626 17.917C4.41626 17.917 4.41626 18.667V21.8337C4.41626 23.0763 5.42362 24.0837 6.66626 24.0837H22.3339C23.5766 24.0837 24.5839 23.0763 24.5839 21.8337V18.667C24.5839 18.2528 24.2482 17.917 23.8339 17.917C23.4197 17.917 23.0839 18.2528 23.0839 18.667V21.8337C23.0839 22.479 22.7482 22.5837 22.3339 22.5837H6.66626C6.25205 22.5837 5.91626 22.479 5.91626 21.8337V18.667Z"
                      ></path>
                    </svg>
                  </div>
                </div>
                <h4 className="mb-3 font-semibold text-gray-800 text-xl">
                  {isDragActive ? "Drop File Here" : "Drag & Drop File Here"}
                </h4>
                <span className="text-center mb-4 block w-full max-w-[290px] text-sm text-gray-700">
                  Drag and drop your PNG, JPG, or JPEG
                </span>
                <span className="font-medium underline text-blue-600 text-sm">
                  Browse File
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      {errors && errors.length > 0 && (
        <div className="mb-2">
          <span className="text-red-600 text-xs">{errors[0]}</span>
        </div>
      )}
      {preview && (
        <RemoveButton
          label="Remove Profile Picture"
          className="w-full"
          onRemove={() => {
            if (onChange) onChange(null);
            if (onRemoveExistingImageUrl) onRemoveExistingImageUrl();
            setPreview(null);
          }}
        />
      )}
    </>
  );
};

export default UploadInput;
