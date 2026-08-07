import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { MOBYOU_MODELOS } from "@/lib/constants";

const CORES = [
  "PRETA", "PRETO", "BRANCA", "BRANCO", "AZUL", "VERMELHA", "VERMELHO",
  "CINZA", "VERDE", "AMARELA", "AMARELO", "ROSA", "PRATA", "LARANJA", "ROXA", "ROXO",
];

// Extrai texto de um DANFE (PDF) e tenta garimpar os campos principais.
// Melhor-esforço: o layout da DANFE varia entre emissores. O XML é 100%.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }
    const filename = file.name || "";
    const buffer = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });
    const raw = Array.isArray(text) ? text.join("\n") : text;
    const norm = raw.replace(/ /g, " ").replace(/[ \t]+/g, " ");
    const flat = norm.replace(/\s+/g, " ");

    const cliente = { nome: "", cpf: "", telefone: "", email: "", endereco: "" };
    const venda = { valor: "", numero_nf: "", data_compra: "" };
    const scooter = { modelo: "", marca: "", cor: "", numero_serie: "", chassi: "", ano: "", valor: "" };

    // Chave de acesso (44 dígitos) -> número da NF (posições 25..33)
    const chave =
      (filename.match(/\d{44}/) || [])[0] ||
      (flat.replace(/\D/g, "").match(/\d{44}/) || [])[0] ||
      "";
    if (chave) {
      const nNF = chave.slice(25, 34).replace(/^0+/, "");
      if (nNF) venda.numero_nf = nNF;
    }

    // CPF (11) / CNPJ (14) — destinatário costuma ser o último CPF do documento
    const cpfs = flat.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/g) || [];
    if (cpfs.length) cliente.cpf = cpfs[cpfs.length - 1];

    // E-mail: NÃO extrair (o e-mail da DANFE costuma ser do emitente).
    // O gestor/vendedor preenche o e-mail do cliente manualmente.

    // Telefone
    const fone = flat.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
    if (fone) cliente.telefone = fone[0];

    // Nome do destinatário (após o rótulo do bloco DESTINATÁRIO)
    const destNome = flat.match(
      /DESTINAT[ÁA]RIO[^A-Za-z]+REMETENTE\s+NOME[^A-Za-z]+RAZ[ÃA]O SOCIAL\s+(.+?)\s+(?:CNPJ|CPF|DATA|ENDERE)/i
    );
    if (destNome) cliente.nome = destNome[1].trim();

    // Endereço (após ENDEREÇO no bloco do destinatário)
    const ender = flat.match(/ENDERE[ÇC]O\s+(.+?)\s+(?:BAIRRO|CEP|MUNIC[ÍI]PIO|FONE)/i);
    if (ender) cliente.endereco = ender[1].trim();

    // Valor total da nota
    const val = flat.match(/VALOR TOTAL DA NOTA\s*R?\$?\s*([\d.]+,\d{2})/i);
    if (val) venda.valor = val[1].replace(/\./g, "").replace(",", ".");

    // Data de emissão (dd/mm/aaaa)
    const dataEmi = flat.match(/DATA DA EMISS[ÃA]O\s*(\d{2}\/\d{2}\/\d{4})/i) ||
      flat.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dataEmi) {
      const [d, m, y] = dataEmi[1].split("/");
      venda.data_compra = `${y}-${m}-${d}`;
    }

    // Modelo da scooter: procura um modelo MOBYOU conhecido no texto inteiro.
    // Casa tanto o nome completo ("Mobyou X13") quanto o token curto ("X13").
    const upper = flat.toUpperCase();
    const candidatos = MOBYOU_MODELOS.map((m) => ({
      modelo: m,
      token: m.replace(/^(Mobyou|Bike)\s+/i, "").toUpperCase(),
    })).sort((a, b) => b.token.length - a.token.length); // mais específico primeiro

    for (const c of candidatos) {
      if (upper.includes(c.modelo.toUpperCase()) || upper.includes(c.token)) {
        scooter.modelo = c.modelo;
        scooter.marca = "Mobyou";
        break;
      }
    }

    // Fallback: descrição do produto da DANFE
    if (!scooter.modelo) {
      const prod = flat.match(
        /DESCRI[ÇC][ÃA]O DO[S]? PRODUTO[S]?[^A-Za-z0-9]*(?:\/ SERVI[ÇC]OS)?\s+(.+?)\s+(?:NCM|CFOP|C[ÓO]DIGO)/i
      );
      if (prod) scooter.modelo = prod[1].trim().slice(0, 80);
    }

    // Cor (procura no texto)
    for (const cor of CORES) {
      if (upper.includes(cor)) {
        scooter.cor = cor.charAt(0) + cor.slice(1).toLowerCase();
        break;
      }
    }

    // Chassi/Série (quando vierem nas informações adicionais do produto)
    const chassiM = upper.match(/CHASSI[:\s]*([A-Z0-9]{6,})/);
    if (chassiM) scooter.chassi = chassiM[1];
    const serieM = upper.match(/S[ÉE]RIE[:\s]*([A-Z0-9]{4,})/);
    if (serieM) scooter.numero_serie = serieM[1];

    const algumDado =
      cliente.nome || cliente.cpf || venda.valor || venda.numero_nf || scooter.modelo;

    return NextResponse.json({
      ok: true,
      encontrouAlgo: Boolean(algumDado),
      data: { cliente, scooters: [scooter], venda },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao ler o PDF" },
      { status: 500 }
    );
  }
}
