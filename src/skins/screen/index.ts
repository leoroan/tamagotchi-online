import type { ScreenTheme, ScreenThemeId } from '../types';
import { CRT_AMBER } from './crtAmber';
import { GAMEBOY_GREEN } from './gameboyGreen';
import { LCD_CLASSIC } from './lcdClassic';
import { LCD_COLOR } from './lcdColor';

/** Registro de temas. Para agregar uno: escribir el archivo y sumarlo acá. */
export const SCREEN_THEMES: readonly ScreenTheme[] = [LCD_CLASSIC, LCD_COLOR, GAMEBOY_GREEN, CRT_AMBER];

export const DEFAULT_SCREEN_THEME_ID: ScreenThemeId = LCD_CLASSIC.id;

export function getScreenTheme(id: ScreenThemeId | null | undefined): ScreenTheme {
  return SCREEN_THEMES.find((theme) => theme.id === id) ?? LCD_CLASSIC;
}

export { CRT_AMBER, GAMEBOY_GREEN, LCD_CLASSIC, LCD_COLOR };
