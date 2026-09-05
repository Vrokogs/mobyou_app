// Brasas caindo sobre o fundo do ranking. Enfeite puro: fica atrás do conteúdo,
// não recebe clique e some para quem pede menos animação no sistema.
//
// A lista é fixa, não sorteada. Math.random() aqui geraria posições diferentes
// no servidor e no navegador, e o React reclamaria de hidratação — além de a
// animação "pular" no primeiro render.
const BRASAS = [
  { esq: 6, tam: 3, dur: 11, atraso: 0 },
  { esq: 14, tam: 2, dur: 14, atraso: 3.5 },
  { esq: 22, tam: 4, dur: 9, atraso: 1.2 },
  { esq: 31, tam: 2, dur: 13, atraso: 6 },
  { esq: 39, tam: 3, dur: 10, atraso: 2.4 },
  { esq: 47, tam: 2, dur: 15, atraso: 8 },
  { esq: 55, tam: 3, dur: 12, atraso: 4.6 },
  { esq: 63, tam: 2, dur: 10, atraso: 0.8 },
  { esq: 71, tam: 4, dur: 13, atraso: 7.2 },
  { esq: 79, tam: 2, dur: 11, atraso: 2 },
  { esq: 87, tam: 3, dur: 14, atraso: 5.4 },
  { esq: 94, tam: 2, dur: 9, atraso: 9 },
];

export function Brasas() {
  return (
    <div className="brasas" aria-hidden="true">
      {BRASAS.map((b, i) => (
        <span
          key={i}
          className="brasa"
          style={{
            left: `${b.esq}%`,
            width: `${b.tam}px`,
            height: `${b.tam}px`,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.atraso}s`,
          }}
        />
      ))}
    </div>
  );
}
