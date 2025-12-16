import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type Theme = "dark" | "standard" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Load from localStorage or default to dark
    const saved = localStorage.getItem("profile-theme") as Theme;
    return saved || "dark";
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("profile-theme", newTheme);
    // Apply theme class to body or root element
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  useEffect(() => {
    // Apply initial theme
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}













