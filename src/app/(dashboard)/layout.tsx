"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
  id: string;
  nome: string;
  email: string;
  role: string;
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
        .select("id, nome, email, role")
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
          <img src="/images/logo-mobyou.jpg" alt="MOBYOU" className="w-24 h-24" />
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
        onLogout={handleLogout}
      />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b border-[#d5d9e0] px-4 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 sticky top-0 z-10">
          <SidebarTrigger className="text-[#0A1628]" />
          <Separator orientation="vertical" className="h-6" />
        </header>
        <main className="flex-1 p-4 sm:p-6 bg-[#f0f2f5] min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
