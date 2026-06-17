"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Users, Bike, ClipboardList, FileText, Wrench,
  Package, ShieldCheck, Award, Upload, DollarSign, Settings,
  LogOut, ChevronUp, UserCog, Hash, ShoppingCart,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const gestorNav: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", href: "/gestor", icon: LayoutDashboard },
      { title: "Clientes", href: "/gestor/clientes", icon: Users },
      { title: "Scooters", href: "/gestor/scooters", icon: Bike },
      { title: "Chassi", href: "/gestor/chassi", icon: Hash },
    ],
  },
  {
    label: "Serviços",
    items: [
      { title: "Ordens de Serviço", href: "/gestor/ordens", icon: ClipboardList },
      { title: "Orçamentos", href: "/gestor/orcamentos", icon: DollarSign },
      { title: "Garantias", href: "/gestor/garantias", icon: ShieldCheck },
    ],
  },
  {
    label: "Documentos",
    items: [
      { title: "Contratos", href: "/gestor/contratos", icon: FileText },
      { title: "Certificados", href: "/gestor/certificados", icon: Award },
      { title: "Importar NF", href: "/gestor/importar-nf", icon: Upload },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Estoque", href: "/gestor/estoque", icon: Package },
      { title: "Financeiro", href: "/gestor/financeiro", icon: DollarSign },
      { title: "Usuários", href: "/gestor/usuarios", icon: UserCog },
    ],
  },
];

const vendedorNav: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", href: "/vendedor", icon: LayoutDashboard },
      { title: "Clientes", href: "/vendedor/clientes", icon: Users },
      { title: "Vendas", href: "/vendedor/vendas", icon: ShoppingCart },
    ],
  },
  {
    label: "Documentos",
    items: [
      { title: "Contratos", href: "/vendedor/contratos", icon: FileText },
      { title: "Importar NF", href: "/vendedor/importar-nf", icon: Upload },
    ],
  },
];

const tecnicoNav: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", href: "/tecnico", icon: LayoutDashboard },
      { title: "Ordens de Serviço", href: "/tecnico/ordens", icon: Wrench },
    ],
  },
];

const navByRole: Record<string, NavGroup[]> = {
  gestor: gestorNav,
  vendedor: vendedorNav,
  tecnico: tecnicoNav,
};

interface AppSidebarProps {
  userRole: string;
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

export function AppSidebar({ userRole, userName, userEmail, onLogout }: AppSidebarProps) {
  const pathname = usePathname();
  const navigation = navByRole[userRole] || [];

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href={`/${userRole}`} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src="/images/logo-mobyou.jpg"
              alt="MOBYOU"
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
          <div>
            <span className="font-bold text-lg text-[#D4731A]">MOBYOU</span>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{userRole}</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== `/${userRole}` && pathname.startsWith(item.href));
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-auto py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#D4731A] text-white text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">{userName}</p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">{userEmail}</p>
                  </div>
                  <ChevronUp className="h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
