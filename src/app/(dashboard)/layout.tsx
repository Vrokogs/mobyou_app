"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
  id: string;
  nome: string;
  email: string;
  role: string;
  avatar_url: string | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, nome, email, role, avatar_url")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
      }
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A1628]">
        <div className="flex flex-col items-center gap-6">
          <img src="/images/logo-mobyou.png" alt="MOBYOU" className="w-24 h-24" />
          <div className="w-8 h-8 border-2 border-[#D4731A] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-white/50">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <SidebarProvider>
      <AppSidebar
        userRole={profile.role}
        userName={profile.nome}
        userEmail={profile.email}
        avatarUrl={profile.avatar_url}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <Topbar
          userId={profile.id}
          userName={profile.nome}
          userRole={profile.role}
          avatarUrl={profile.avatar_url}
          onAvatarChange={(url) => setProfile((p) => (p ? { ...p, avatar_url: url } : p))}
          onLogout={handleLogout}
        />
        <main className="flex-1 bg-muted/40 p-4 sm:p-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
