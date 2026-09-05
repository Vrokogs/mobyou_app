// Foto do colaborador. Fica no bucket "fotos", que é público — assim o <img>
// abre direto, sem precisar de link assinado a cada render como acontece com as
// notas fiscais no bucket "documentos".

export const AVATAR_BUCKET = "fotos";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const AVATAR_TIPOS = ["image/jpeg", "image/png", "image/webp"];

// Iniciais para quando não há foto: "Natanna Silva" -> "NS".
export function iniciais(nome: string | null | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const letras = partes.length === 1
    ? partes[0].slice(0, 2)
    : partes[0][0] + partes[partes.length - 1][0];
  return letras.toUpperCase();
}

type SupabaseLike = {
  storage: {
    from: (bucket: string) => {
      upload: (path: string, file: File, opts?: { upsert?: boolean; contentType?: string }) =>
        PromiseLike<{ error: { message: string } | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
  from: (table: string) => unknown;
};

type UpdatePerfil = {
  update: (v: Record<string, unknown>) => {
    eq: (col: string, val: unknown) => PromiseLike<{ error: { message: string } | null }>;
  };
};

export type ResultadoAvatar =
  | { ok: true; url: string }
  | { ok: false; erro: string };

/**
 * Valida, sobe a foto e grava avatar_url no perfil.
 *
 * O caminho é fixo por usuário (avatars/<id>.<ext>) com upsert: trocar a foto
 * substitui a anterior em vez de acumular arquivo órfão no bucket. Como o nome
 * se repete, o CDN serve a antiga — por isso a URL leva ?v=<timestamp>.
 */
export async function salvarAvatar(
  supabase: SupabaseLike,
  userId: string,
  arquivo: File,
): Promise<ResultadoAvatar> {
  if (!AVATAR_TIPOS.includes(arquivo.type)) {
    return { ok: false, erro: "Use uma imagem JPG, PNG ou WEBP." };
  }
  if (arquivo.size > AVATAR_MAX_BYTES) {
    return { ok: false, erro: "A imagem passa de 2 MB. Escolha uma menor." };
  }

  const ext = arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg";
  const caminho = `avatars/${userId}.${ext}`;

  const { error: errUpload } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });
  if (errUpload) return { ok: false, erro: errUpload.message };

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(caminho);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const perfis = supabase.from("profiles") as UpdatePerfil;
  const { error: errPerfil } = await perfis.update({ avatar_url: url }).eq("id", userId);
  if (errPerfil) return { ok: false, erro: errPerfil.message };

  return { ok: true, url };
}
