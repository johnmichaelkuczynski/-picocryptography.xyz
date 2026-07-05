import { useQuery, useQueryClient } from "@tanstack/react-query";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  displayName: string | null;
}

interface AuthState {
  authenticated: boolean;
  user: AuthUser | null;
}

export const loginUrl = `${basePath}/api/auth/google`;

export function useAuth() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<AuthState>({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/auth/user`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as AuthState;
    },
    staleTime: 60_000,
  });

  async function logout() {
    await fetch(`${basePath}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    await qc.invalidateQueries({ queryKey: ["auth"] });
  }

  return {
    isLoading,
    authenticated: data?.authenticated ?? false,
    user: data?.user ?? null,
    logout,
  };
}
