import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from "react";
import SettingService from "../services/SettingService";
import { useAuth } from "./AuthContext";

export interface ThemeDefinition {
  key: string;
  name: string;
  emoji: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  secondaryDark: string;
  accent: string;
  sidebarBg: string;
  sidebarHover: string;
  bgMain: string;
  navbarBg: string;
  cardBg: string;
  cardText: string;
  tableHeader: string;
  link: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    key: "cascofamco-green",
    name: "CASCOFAMCO Green (Default)",
    emoji: "🌿",
    primary: "#1F6B3D",
    primaryDark: "#164E2C",
    secondary: "#2F855A",
    secondaryDark: "#225F40",
    accent: "#86EFAC",
    sidebarBg: "#0B2917",
    sidebarHover: "#144929",
    bgMain: "#F8FAFC",
    navbarBg: "#FFFFFF",
    cardBg: "#FFFFFF",
    cardText: "#1E293B",
    tableHeader: "#F1F5F9",
    link: "#1F6B3D"
  },
  {
    key: "forest-green",
    name: "Forest Green",
    emoji: "🌲",
    primary: "#15803D",
    primaryDark: "#166534",
    secondary: "#22C55E",
    secondaryDark: "#15803D",
    accent: "#4ADE80",
    sidebarBg: "#052E16",
    sidebarHover: "#14532D",
    bgMain: "#F0FDF4",
    navbarBg: "#FFFFFF",
    cardBg: "#FFFFFF",
    cardText: "#052E16",
    tableHeader: "#DCFCE7",
    link: "#15803D"
  }
];

export const getThemeByKey = (key: string): ThemeDefinition => {
  if (!key) return THEMES[0];
  if (key === "forest-green") return THEMES[1];
  // Fallback to CASCOFAMCO Green (Default) if any deleted theme (ocean-blue, teal, midnight-dark, dark, light, etc.) was previously saved
  return THEMES[0];
};

interface ThemeContextType {
  themeKey: string;
  setTheme: (key: string) => void;
  currentTheme: ThemeDefinition;
  availableThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const applyThemeToDOM = (theme: ThemeDefinition) => {
  const root = document.documentElement;
  root.style.setProperty("--theme-primary", theme.primary);
  root.style.setProperty("--theme-primary-dark", theme.primaryDark);
  root.style.setProperty("--theme-secondary", theme.secondary);
  root.style.setProperty("--theme-secondary-dark", theme.secondaryDark);
  root.style.setProperty("--theme-accent", theme.accent);
  root.style.setProperty("--theme-sidebar-bg", theme.sidebarBg);
  root.style.setProperty("--theme-sidebar-hover", theme.sidebarHover);
  root.style.setProperty("--theme-bg-main", theme.bgMain);
  root.style.setProperty("--theme-navbar-bg", theme.navbarBg);
  root.style.setProperty("--theme-card-bg", theme.cardBg);
  root.style.setProperty("--theme-card-text", theme.cardText);
  root.style.setProperty("--theme-table-header", theme.tableHeader);
  root.style.setProperty("--theme-link", theme.link);

  root.classList.remove("dark");
  root.setAttribute("data-theme", theme.key);
};

export const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [themeKey, setThemeKeyState] = useState<string>(() => {
    const saved = localStorage.getItem("cascofamco_theme");
    return saved ? getThemeByKey(saved).key : "cascofamco-green";
  });

  const currentTheme = getThemeByKey(themeKey);

  const setTheme = (key: string) => {
    const theme = getThemeByKey(key);
    setThemeKeyState(theme.key);
    localStorage.setItem("cascofamco_theme", theme.key);
    applyThemeToDOM(theme);
    if (user && user.role === "Administrator") {
      const formData = new FormData();
      formData.append("theme_mode", theme.key);
      SettingService.updateSettings(formData).catch(() => {});
    }
  };

  // Sync initial theme to DOM immediately and sanitize localStorage if a deleted theme was saved
  useEffect(() => {
    applyThemeToDOM(currentTheme);
    const saved = localStorage.getItem("cascofamco_theme");
    if (saved && saved !== currentTheme.key) {
      localStorage.setItem("cascofamco_theme", currentTheme.key);
    }
  }, [currentTheme]);

  // Sync backend theme setting when user is logged in
  useEffect(() => {
    if (user) {
      SettingService.getSettings()
        .then(res => {
          if (res.data && res.data.theme_mode) {
            const backendTheme = res.data.theme_mode;
            const savedLocal = localStorage.getItem("cascofamco_theme");
            // If the user already has a valid saved theme in localStorage, keep it
            const preferredKey =
              savedLocal === "forest-green" || savedLocal === "cascofamco-green"
                ? savedLocal
                : (backendTheme === "forest-green" || backendTheme === "cascofamco-green" ? backendTheme : "cascofamco-green");

            const theme = getThemeByKey(preferredKey);
            setThemeKeyState(theme.key);
            localStorage.setItem("cascofamco_theme", theme.key);
            applyThemeToDOM(theme);

            // Sync backend if it had a different or stale setting
            if (backendTheme !== theme.key && user.role === "Administrator") {
              const formData = new FormData();
              formData.append("theme_mode", theme.key);
              SettingService.updateSettings(formData).catch(() => {});
            }
          }
        })
        .catch(err => {
          console.warn("Could not fetch backend theme settings:", err);
        });
    }
  }, [user]);

  return (
    <ThemeContext.Provider value={{ themeKey, setTheme, currentTheme, availableThemes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
