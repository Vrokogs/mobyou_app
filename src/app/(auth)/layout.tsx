"use client";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel - branding */}
      <div className="lg:w-1/2 bg-[#0A1628] flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #D4731A 1px, transparent 1px),
                              radial-gradient(circle at 75% 75%, #D4731A 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }} />
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628] via-transparent to-[#0A1628] opacity-80" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-md">
          {/* Logo */}
          <div className="w-32 h-32 lg:w-44 lg:h-44 relative mb-2">
            <img
              src="/images/logo-mobyou.svg"
              alt="MOBYOU Logo"
              className="w-full h-full object-contain drop-shadow-2xl"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            {/* Fallback if image not loaded */}
            <div className="hidden w-full h-full rounded-2xl bg-gradient-to-br from-[#D4731A] to-[#E8871E] items-center justify-center flex-col gap-1">
              <span className="text-4xl font-black text-[#0A1628] tracking-widest">M</span>
              <span className="text-xs font-bold text-[#0A1628]/80 tracking-[0.3em]">MOBYOU</span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight">
              Mobilidade Elétrica
            </h1>
            <div className="w-16 h-1 bg-gradient-to-r from-[#D4731A] to-[#E8871E] mx-auto rounded-full" />
            <p className="text-sm lg:text-base text-white/60 max-w-xs mx-auto">
              Gestão completa de e-scooters: vendas, manutenção, garantias e documentos em um só lugar.
            </p>
          </div>

          {/* Feature pills - hidden on mobile for cleaner login */}
          <div className="hidden lg:flex flex-wrap gap-3 justify-center pt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D4731A]" />
              Tempo real
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D4731A]" />
              Multi-perfil
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D4731A]" />
              Assinatura digital
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#f0f2f5] min-h-[60vh] lg:min-h-screen">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
