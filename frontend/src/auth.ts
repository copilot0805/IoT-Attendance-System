export const authStorage = {
  getToken(): string | null {
    const token = localStorage.getItem("accessToken");
    if (!token || token === "undefined" || token === "null") {
      return null;
    }
    return token;
  },
  setToken(token: string | undefined | null): void {
    if (!token || token === "undefined" || token === "null") {
      return;
    }
    localStorage.setItem("accessToken", token);
  },
  clear(): void {
    localStorage.removeItem("accessToken");
  }
};
