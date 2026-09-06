import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from "react";
import SettingService from "../services/SettingService";

interface SettingContextType {
  cooperativeName: string;
  cooperativeLogo: string | null;
  address: string;
  contactNumber: string;
  email: string;
  setCooperativeLogo: (url: string | null) => void;
  refreshSettings: () => Promise<void>;
}

const SettingContext = createContext<SettingContextType | undefined>(undefined);

export const SettingProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [cooperativeName, setCooperativeName] = useState<string>(() => {
    return localStorage.getItem("cascofamco_name") || "Ivisan Small Coconut Farmers Marketing Cooperative";
  });
  const [cooperativeLogo, setCooperativeLogoState] = useState<string | null>(() => {
    return localStorage.getItem("cascofamco_logo") || null;
  });
  const [address, setAddress] = useState<string>("");
  const [contactNumber, setContactNumber] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  const setCooperativeLogo = (url: string | null) => {
    setCooperativeLogoState(url);
    if (url) {
      localStorage.setItem("cascofamco_logo", url);
    } else {
      localStorage.removeItem("cascofamco_logo");
    }
  };

  const refreshSettings = async () => {
    try {
      const res = await SettingService.getSettings();
      if (res.data) {
        const s = res.data;
        if (s.cooperative_name) {
          setCooperativeName(s.cooperative_name);
          localStorage.setItem("cascofamco_name", s.cooperative_name);
        }
        if (s.address) setAddress(s.address);
        if (s.contact_number) setContactNumber(s.contact_number);
        if (s.email) setEmail(s.email);
        setCooperativeLogo(s.cooperative_logo || null);
      }
    } catch (err) {
      console.warn("Could not fetch cooperative settings:", err);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <SettingContext.Provider
      value={{
        cooperativeName,
        cooperativeLogo,
        address,
        contactNumber,
        email,
        setCooperativeLogo,
        refreshSettings,
      }}
    >
      {children}
    </SettingContext.Provider>
  );
};

export const useSettings = (): SettingContextType => {
  const context = useContext(SettingContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingProvider");
  }
  return context;
};
