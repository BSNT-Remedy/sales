const ACCESS_KEY = 'sales.accessToken';
const REFRESH_KEY = 'sales.refreshToken';

export interface TokenPair {
  access: string;
  refresh: string;
}

export const authStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  save(tokens: TokenPair) {
    localStorage.setItem(ACCESS_KEY, tokens.access);
    localStorage.setItem(REFRESH_KEY, tokens.refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
