import { useEffect, useState } from "react";
import type { ColorThemeConfig } from "@/types/editor";
import { DEFAULT_COLOR_THEME, SHELL_THEME_PRESETS, type MenuLayout, type ThemeMode } from "./types";

export function useShellChromeState() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [colorTheme, setColorTheme] = useState<ColorThemeConfig>(DEFAULT_COLOR_THEME);
  const [menuLayout, setMenuLayout] = useState<MenuLayout>(() => {
    const saved = localStorage.getItem("gsk_menu_layout");
    return saved === "frequency" || saved === "role" || saved === "hybrid" ? saved : "frequency";
  });
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showColorThemeMenu, setShowColorThemeMenu] = useState(false);
  const [showPdfExport, setShowPdfExport] = useState(false);
  const [showAboutModalV3, setShowAboutModalV3] = useState(false);
  const [showWikiPanel, setShowWikiPanel] = useState(false);
  const [showFamilySearchPanel, setShowFamilySearchPanel] = useState(false);
  const [showMockTools, setShowMockTools] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);

  useEffect(() => {
    localStorage.setItem("gsk_menu_layout", menuLayout);
  }, [menuLayout]);

  useEffect(() => {
    window.document.documentElement.setAttribute("data-theme", themeMode);
    setColorTheme((current) => {
      const preset = themeMode === "light" ? SHELL_THEME_PRESETS.light : SHELL_THEME_PRESETS.dark;
      return { ...current, personNode: preset.personNode, text: preset.text, edges: preset.edges };
    });
  }, [themeMode]);

  return {
    themeMode,
    setThemeMode,
    colorTheme,
    setColorTheme,
    menuLayout,
    setMenuLayout,
    showDiagnostics,
    setShowDiagnostics,
    showColorThemeMenu,
    setShowColorThemeMenu,
    showPdfExport,
    setShowPdfExport,
    showAboutModalV3,
    setShowAboutModalV3,
    showWikiPanel,
    setShowWikiPanel,
    showFamilySearchPanel,
    setShowFamilySearchPanel,
    showMockTools,
    setShowMockTools,
    showSearchPanel,
    setShowSearchPanel,
  };
}
