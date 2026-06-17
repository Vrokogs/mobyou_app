export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[oklch(0.55_0.2_260)] via-[oklch(0.45_0.18_260)] to-[oklch(0.3_0.12_260)] items-center justify-center p-12">
        <div className="max-w-md text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <span className="text-3xl font-bold tracking-tight">MOBYOU</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Gestão Inteligente de E-Scooters
          </h1>
          <p className="text-lg text-white/80">
            Controle total do seu negócio: vendas, manutenção, garantias, contratos e muito mais em uma única plataforma.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              Tempo real
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              Multi-perfil
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              Documentos digitais
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
