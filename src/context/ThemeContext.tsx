import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { ThemeName, ThemeConfig } from '../utils/theme'
import { themes, getTheme as getStoredTheme, onThemeChange, saveTheme } from '../utils/theme'

export interface ThemeContextValue extends ThemeConfig {
  themeName: ThemeName
  setTheme: (name: ThemeName) => void
}

const defaultThemeName = getStoredTheme()
const defaultTheme = themes[defaultThemeName]

export const ThemeContext = createContext<ThemeContextValue>({
  themeName: defaultThemeName,
  setTheme: () => {},
  ...defaultTheme,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(defaultThemeName)
  const theme = themes[themeName]

  const setTheme = useCallback((name: ThemeName) => {
    saveTheme(name)
  }, [])

  useEffect(() => {
    return onThemeChange((name) => {
      setThemeName(name)
    })
  }, [])

  return (
    <ThemeContext.Provider
      value={{
        themeName,
        setTheme,
        ...theme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
