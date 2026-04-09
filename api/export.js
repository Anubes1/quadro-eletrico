import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ─── Comparação de senha resistente a timing attack ──────────────────────────
function senhaValida(recebida, esperada) {
  if (!recebida || !esperada) return false;
  if (recebida.length !== esperada.length) return false;
  let diff = 0;
  for (let i = 0; i < esperada.length; i++) {
    diff |= recebida.charCodeAt(i) ^ esperada.charCodeAt(i);
  }
  return diff === 0;
}

// ─── Rate limiting para o export (máx. 20 tentativas por IP por hora) ────────
async function checkExportRateLimit(ip) {
  const key = `rate:export:${ip}`;
  const count = await kv.incr(key);
  if (count === 1) await kv.expire(key, 3600);
  return count;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ erro: "Método não permitido" });

  // ── Rate limiting no export (anti-brute force na senha) ───────────────────
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || "unknown";
  try {
    const tentativas = await checkExportRateLimit(ip);
    if (tentativas > 20) {
      return res.status(429).json({ erro: "Muitas tentativas. Tente novamente em 1 hora." });
    }
  } catch {
    // Permite continuar se o rate limit falhar
  }

  // ── Validação da senha (via Authorization header — mais seguro que query string) ──
  // Suporta os dois modos:
  //   1. Header:        Authorization: Bearer SUA_SENHA   (recomendado)
  //   2. Query string:  /api/export?senha=SUA_SENHA       (legado, ainda funciona)
  const SENHA = process.env.EXPORT_SENHA;
  if (!SENHA) return res.status(500).json({ erro: "Variável EXPORT_SENHA não configurada." });

  const authHeader = req.headers["authorization"];
  const senhaHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const senhaQuery = req.query.senha;
  const senhaRecebida = senhaHeader || senhaQuery;

  if (!senhaValida(senhaRecebida, SENHA)) {
    // Delay artificial para dificultar brute force
    await new Promise((r) => setTimeout(r, 500));
    return res.status(401).json({ erro: "Acesso negado." });
  }

  try {
    const itens = await kv.lrange("quadros_eletricos", 0, -1);

    let registros = itens.map((item) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item;
      } catch {
        return item;
      }
    });

    // ── Filtros opcionais ──────────────────────────────────────────────────
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

    // Remove o IP dos registros antes de exportar (privacidade)
    const registrosSemIp = registros.map(({ ip: _ip, ...rest }) => rest);

    const hoje = new Date().toISOString().slice(0, 10);

    // Cache-Control: nenhum cache para dados sensíveis
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="quadros-eletricos_${hoje}.json"`);

    return res.status(200).send(
      JSON.stringify(
        {
          exportadoEm: new Date().toISOString(),
          totalRegistros: registrosSemIp.length,
          filtrosAplicados: {
            responsavel: req.query.responsavel || null,
            de: req.query.de || null,
            ate: req.query.ate || null,
            local: req.query.local || null,
          },
          registros: registrosSemIp,
        },
        null,
        2
      )
    );
  } catch (err) {
    console.error("Erro ao exportar:", err);
    return res.status(500).json({ erro: "Erro interno ao processar a exportação." });
  }
}
