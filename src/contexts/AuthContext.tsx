import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "cliente" | "financeiro" | "social_media";

export type Profile = { full_name: string | null };

type AuthState = {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: Profile | null;
  assignedClientIds: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener PRIMEIRO
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setRole(null);
        setProfile(null);
        setAssignedClientIds([]);
        setLoading(true);
        // diferir chamada async para evitar deadlock
        setTimeout(() => {
          Promise.all([
            fetchRole(sess.user.id),
            fetchProfile(sess.user.id),
            fetchAssignments(sess.user.id),
          ]).finally(() => setLoading(false));
        }, 0);
      } else {
        setRole(null);
        setProfile(null);
        setAssignedClientIds([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setRole(null);
        setProfile(null);
        setAssignedClientIds([]);
        setLoading(true);
        Promise.all([
          fetchRole(sess.user.id),
          fetchProfile(sess.user.id),
          fetchAssignments(sess.user.id),
        ]).finally(() => setLoading(false));
      } else {
        setRole(null);
        setProfile(null);
        setAssignedClientIds([]);
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function fetchRole(userId: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    setRole((data?.role as AppRole) ?? null);
  }

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles" as never)
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(((data as { full_name: string | null } | null) ?? { full_name: null }) as Profile);
  }

  async function fetchAssignments(userId: string) {
    const { data } = await supabase
      .from("client_assignments" as never)
      .select("client_id")
      .eq("user_id", userId);
    const ids = ((data as { client_id: string }[] | null) ?? []).map((r) => r.client_id);
    setAssignedClientIds(ids);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setRole(null);
    setProfile(null);
    setAssignedClientIds([]);
  }

  return (
    <AuthContext.Provider
      value={{ user, session, role, profile, assignedClientIds, loading, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
