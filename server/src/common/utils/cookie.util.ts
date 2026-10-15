import type { CookieOptions, Response } from 'express';

export interface CookieConfig {
  accessCookieName: string;
  refreshCookieName: string;
  accessOptions: CookieOptions;
  refreshOptions: CookieOptions;
  clearOptions: CookieOptions;
}

export function getCookieConfig(
  isProduction: boolean,
  cookieSecure = isProduction,
  rememberMe = false,
): CookieConfig {
  // In production, use __Host- prefix for host-binding security
  const accessCookieName = isProduction ? '__Host-access' : 'access_token';
  const refreshCookieName = isProduction ? '__Host-refresh' : 'refresh_token';

  const baseOptions: CookieOptions = {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSecure ? 'none' : 'lax',
    path: '/',
  };

  // 30 days if rememberMe, otherwise standard 7 days
  const refreshMaxAge = rememberMe
    ? 30 * 24 * 60 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000;

  return {
    accessCookieName,
    refreshCookieName,
    accessOptions: {
      ...baseOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    },
    refreshOptions: {
      ...baseOptions,
      maxAge: refreshMaxAge,
    },
    clearOptions: {
      ...baseOptions,
      maxAge: 0,
    },
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  isProduction: boolean,
  cookieSecure = isProduction,
  rememberMe = false,
): void {
  const config = getCookieConfig(isProduction, cookieSecure, rememberMe);
  res.cookie(config.accessCookieName, accessToken, config.accessOptions);
  res.cookie(config.refreshCookieName, refreshToken, config.refreshOptions);
}

export function clearAuthCookies(
  res: Response,
  isProduction: boolean,
  cookieSecure = isProduction,
): void {
  const config = getCookieConfig(isProduction, cookieSecure);
  res.cookie(config.accessCookieName, '', config.clearOptions);
  res.cookie(config.refreshCookieName, '', config.clearOptions);
}
