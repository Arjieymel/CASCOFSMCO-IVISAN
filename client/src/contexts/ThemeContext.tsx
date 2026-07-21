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
  isDark?: boolean;
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
    key: "ocean-blue",
    name: "Ocean Blue",
    emoji: "🌊",
    primary: "#0284C7",
    primaryDark: "#0369A1",
    secondary: "#06B6D4",
    secondaryDark: "#0891B2",
    accent: "#38BDF8",
    sidebarBg: "#0F172A",
    sidebarHover: "#1E293B",
    bgMain: "#F0F9FF",
    navbarBg: "#FFFFFF",
    cardBg: "#FFFFFF",
    cardText: "#0F172A",
    tableHeader: "#E0F2FE",
    link: "#0284C7"
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
  },
  {
    key: "teal",
    name: "Teal",
    emoji: "🩵",
    primary: "#0D9488",
    primaryDark: "#0F766E",
    secondary: "#14B8A6",
    secondaryDark: "#115E59",
    accent: "#5EEAD4",
    sidebarBg: "#042F2C",
    sidebarHover: "#134E4A",
    bgMain: "#F0FDFA",
    navbarBg: "#FFFFFF",
    cardBg: "#FFFFFF",
    cardText: "#042F2C",
    tableHeader: "#CCFBF1",
    link: "#0D9488"
  },
  {
    key: "midnight-dark",
    name: "Midnight Dark",
    emoji: "⚫",
    primary: "#10B981",
    primaryDark: "#059669",
    secondary: "#3B82F6",
    secondaryDark: "#2563EB",
    accent: "#34D399",
    sidebarBg: "#0F172A",
    sidebarHover: "#1E293B",
    bgMain: "#0F172A",
    navbarBg: "#1E293B",
    cardBg: "#1E293B",
    cardText: "#F8FAFC",
    tableHeader: "#334155",
    link: "#34D399",
    isDark: true
  }
];

export const getThemeByKey = (key: string): ThemeDefinition => {
  if (!key) return THEMES[0];
  if (key === "light") return THEMES[0]; // cascofamco-green
  if (key === "dark") return THEMES.find(t => t.key === "midnight-dark") || THEMES[4];
  return THEMES.find(t => t.key === key) || THEMES[0];
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

  if (theme.isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

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
  };

  // Sync initial theme to DOM immediately
  useEffect(() => {
    applyThemeToDOM(currentTheme);
  }, []);

  // Sync backend theme setting when user is logged in
  useEffect(() => {
    if (user) {
      SettingService.getSettings()
        .then(res => {
          if (res.data && res.data.theme_mode) {
            const backendTheme = res.data.theme_mode;
            const theme = getThemeByKey(backendTheme);
            setThemeKeyState(theme.key);
            localStorage.setItem("cascofamco_theme", theme.key);
            applyThemeToDOM(theme);
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
