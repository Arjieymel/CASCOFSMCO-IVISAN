import type { FC } from "react";
import { FiSearch, FiX } from "react-icons/fi";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchBar: FC<SearchBarProps> = ({ value, onChange, placeholder = "Search...", className = "" }) => {
  return (
    <div className={`relative flex-1 max-w-md ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FiSearch className="h-5 h-5 text-slate-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-10 pr-10 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all duration-150"
        placeholder={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <FiX className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
