"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithGoogle,
  signOut,
  ALLOWED_ADMIN_EMAIL,
  type User,
} from "./auth";

import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: () => Promise<User>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Sync server-side session cookie with current Firebase auth state */
async function syncSessionCookie(user: User | null) {
  try {
    if (user) {
      const token = await user.getIdToken();
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } else {
      await fetch("/api/session", { method: "DELETE" });
    }
  } catch (error) {
    console.error("Failed to sync session cookie:", error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const prevUidRef = useRef<string | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      const uid = firebaseUser?.uid ?? null;
      if (uid !== prevUidRef.current) {
        prevUidRef.current = uid;
        syncSessionCookie(firebaseUser);
      }
    });
    return unsubscribe;
  }, []);

  async function signIn() {
    try {
      const signedInUser = await signInWithGoogle();
      if (signedInUser.email?.toLowerCase() !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
        await signOut();
        throw new Error(`Access restricted to ${ALLOWED_ADMIN_EMAIL}`);
      }
      return signedInUser;
    } catch (error) {
      console.error("Sign-in failed:", error);
      throw error;
    }
  }

  async function logOut() {
    try {
      await fetch("/api/session", { method: "DELETE" });
      await signOut();
      setUser(null);
      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Sign-out failed:", error);
      router.push("/admin/login");
    }
  }

  const isAdmin = Boolean(
    user?.email?.toLowerCase() === ALLOWED_ADMIN_EMAIL.toLowerCase()
  );

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
