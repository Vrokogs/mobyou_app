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
  Clock, Trophy, Radar, CalendarClock, Boxes, BarChart3, Bell,
} from "lucide-react";
import { podeManutencao } from "@/lib/constants";

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
      { title: "Atendimentos", href: "/gestor/atendimentos", icon: Bell },
      { title: "Ordens de Serviço", href: "/gestor/ordens", icon: ClipboardList },
      { title: "Orçamentos", href: "/gestor/orcamentos", icon: DollarSign },
      { title: "Garantias", href: "/gestor/garantias", icon: ShieldCheck },
      { title: "Manutenções", href: "/gestor/manutencoes", icon: CalendarClock },
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
      { title: "Vendas", href: "/gestor/vendas", icon: ShoppingCart },
      { title: "Peças", href: "/gestor/pecas", icon: Boxes },
      { title: "Ranking", href: "/gestor/ranking", icon: Trophy },
      { title: "Montagem", href: "/gestor/montagem", icon: Wrench },
      { title: "Relatórios", href: "/gestor/relatorios", icon: BarChart3 },
      { title: "Financeiro", href: "/gestor/financeiro", icon: DollarSign },
      { title: "Folha de Ponto", href: "/gestor/ponto", icon: Clock },
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
      { title: "Ranking", href: "/vendedor/ranking", icon: Trophy },
    ],
  },
  {
    label: "Documentos",
    items: [
      { title: "Contratos", href: "/vendedor/contratos", icon: FileText },
      { title: "Importar NF", href: "/vendedor/importar-nf", icon: Upload },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Folha de Ponto", href: "/vendedor/ponto", icon: Clock },
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

const clienteNav: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Início", href: "/cliente", icon: LayoutDashboard },
      { title: "Minha Scooter", href: "/cliente/scooter", icon: Bike },
    ],
  },
  {
    label: "Serviços",
    items: [
      { title: "Ordens de Serviço", href: "/cliente/ordens", icon: Wrench },
      { title: "Histórico", href: "/cliente/historico", icon: ClipboardList },
    ],
  },
  {
    label: "Documentos",
    items: [
      { title: "Meus Documentos", href: "/cliente/documentos", icon: FileText },
    ],
  },
];

const navByRole: Record<string, NavGroup[]> = {
  gestor: gestorNav,
  vendedor: vendedorNav,
  tecnico: tecnicoNav,
  cliente: clienteNav,
};

// Grupo de OS liberado a vendedores que também fazem manutenção.
// Dá acesso à área completa de OS (mesmas telas do gestor) + fila do técnico.
const oficinaGroup: NavGroup = {
  label: "Oficina",
  items: [
    { title: "Atendimentos", href: "/gestor/atendimentos", icon: Bell },
    { title: "Ordens de Serviço", href: "/gestor/ordens", icon: ClipboardList },
    { title: "Orçamentos", href: "/gestor/orcamentos", icon: DollarSign },
    { title: "Manutenções", href: "/gestor/manutencoes", icon: CalendarClock },
    { title: "Minhas OS", href: "/tecnico/ordens", icon: Wrench },
  ],
};

interface AppSidebarProps {
  userRole: string;
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

export function AppSidebar({ userRole, userName, userEmail, onLogout }: AppSidebarProps) {
  const pathname = usePathname();
  let navigation = navByRole[userRole] || [];
  // Vendedor habilitado à manutenção ganha o grupo de OS.
  if (userRole === "vendedor" && podeManutencao(userEmail)) {
    navigation = [...navigation, oficinaGroup];
  }

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
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
              <DropdownMenuTrigger
                render={<SidebarMenuButton className="h-auto py-2" />}
              >
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
