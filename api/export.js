import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ erro: "Método não permitido" });

  // Proteção por senha: /api/export?senha=SUA_SENHA
  const SENHA = process.env.EXPORT_SENHA;
  if (!SENHA) {
    return res.status(500).json({ erro: "Variável EXPORT_SENHA não configurada no servidor." });
  }
  if (req.query.senha !== SENHA) {
    return res.status(401).json({ erro: "Senha inválida. Acesso negado." });
  }

  try {
    const existing = await kv.get("quadros_eletricos");
    let registros = Array.isArray(existing) ? existing : [];

    // Filtros opcionais via query string
    // Ex: /api/export?senha=xxx&responsavel=João&de=2026-01-01&ate=2026-12-31&local=Bombas
    if (req.query.responsavel) {
      registros = registros.filter((r) =>
        r.responsavel?.toLowerCase().includes(req.query.responsavel.toLowerCase())
      );
    }
    if (req.query.de) {
      registros = registros.filter((r) => r.dataVistoria >= req.query.de);
    }
    if (req.query.ate) {
      registros = registros.filter((r) => r.dataVistoria <= req.query.ate);
    }
    if (req.query.local) {
      registros = registros.filter((r) =>
        r.local?.toLowerCase().includes(req.query.local.toLowerCase())
      );
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const nomeArquivo = `quadros-eletricos_${hoje}.json`;

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);

    return res.status(200).send(
      JSON.stringify(
        {
          exportadoEm: new Date().toISOString(),
          totalRegistros: registros.length,
          filtrosAplicados: {
            responsavel: req.query.responsavel || null,
            de: req.query.de || null,
            ate: req.query.ate || null,
            local: req.query.local || null,
          },
          registros,
        },
        null,
        2
      )
    );
  } catch (err) {
    console.error("Erro ao exportar:", err);
    return res.status(500).json({ erro: "Erro interno: " + err.message });
  }
}
