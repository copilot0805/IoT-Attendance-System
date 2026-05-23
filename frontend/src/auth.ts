type UserRole = "ADMIN" | "EMPLOYEE";

const normalizeRole = (value: unknown): UserRole | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedRole = value.toUpperCase();
  if (normalizedRole === "ADMIN" || normalizedRole === "EMPLOYEE") {
    return normalizedRole;
  }

  return null;
};

const decodeJwtRole = (token: string): UserRole | null => {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(
      window.atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );

    return normalizeRole(decoded?.role);
  } catch {
    return null;
  }
};

export const authStorage = {
  getToken(): string | null {
    const token = localStorage.getItem("accessToken");
    if (!token || token === "undefined" || token === "null") {
      return null;
    }
    return token;
  },
  getRole(): UserRole | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    return decodeJwtRole(token);
  },
  isAdmin(): boolean {
    return this.getRole() === "ADMIN";
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
