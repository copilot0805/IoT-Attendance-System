export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem("accessToken");
  },
  setToken(token: string): void {
    localStorage.setItem("accessToken", token);
  },
  clear(): void {
    localStorage.removeItem("accessToken");
  }
};
