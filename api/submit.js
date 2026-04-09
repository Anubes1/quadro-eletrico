import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ─── Limites de tamanho por campo ────────────────────────────────────────────
const LIMITES = {
  nomeQuadro: 100, local: 100, responsavel: 100, registro: 50,
  correnteGeral: 20, grauProtecao: 20, tecnicoResponsavel: 100,
  observacoesGerais: 1000, obsFinais: 1000,
};

// ─── Sanitiza string: remove tags HTML e limita tamanho ──────────────────────
function sanitize(value, maxLen = 200) {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, "").trim().slice(0, maxLen);
}

// ─── Rate limiting simples via Redis (máx. 10 envios por IP por hora) ────────
async function checkRateLimit(ip) {
  const key = `rate:submit:${ip}`;
  const count = await kv.incr(key);
  if (count === 1) await kv.expire(key, 3600); // janela de 1 hora
  return count;
}

export default async function handler(req, res) {
  // CORS restrito ao próprio domínio
  const origem = process.env.ALLOWED_ORIGIN || "https://formulario-sigma-gilt.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", origem);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || "unknown";
  try {
    const tentativas = await checkRateLimit(ip);
    if (tentativas > 10) {
      return res.status(429).json({ erro: "Muitas requisições. Tente novamente em 1 hora." });
    }
  } catch {
    // Se o rate limit falhar, permite continuar (não bloqueia o fluxo)
  }

  // ── Validação do tamanho do payload (máx. 100 KB) ─────────────────────────
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 100_000) {
    return res.status(413).json({ erro: "Payload muito grande. Máximo: 100 KB." });
  }

  try {
    const body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ erro: "Corpo da requisição inválido" });
    }

    // ── Campos obrigatórios ────────────────────────────────────────────────
    if (!body.nomeQuadro?.trim() || !body.responsavel?.trim()) {
      return res.status(400).json({ erro: "Campos obrigatórios ausentes: nomeQuadro, responsavel" });
    }

    // ── Validação de arrays ────────────────────────────────────────────────
    if (body.circuitsA && !Array.isArray(body.circuitsA)) {
      return res.status(400).json({ erro: "Campo circuitsA deve ser um array" });
    }
    if (body.circuitsB && !Array.isArray(body.circuitsB)) {
      return res.status(400).json({ erro: "Campo circuitsB deve ser um array" });
    }

    // ── Monta registro com dados sanitizados ──────────────────────────────
    const registro = {
      id: crypto.randomUUID(),
      enviadoEm: new Date().toISOString(),
      ip, // útil para auditoria
      nomeQuadro:          sanitize(body.nomeQuadro, LIMITES.nomeQuadro),
      local:               sanitize(body.local, LIMITES.local),
      dataVistoria:        sanitize(body.dataVistoria, 10),
      responsavel:         sanitize(body.responsavel, LIMITES.responsavel),
      registro:            sanitize(body.registro, LIMITES.registro),
      tensao:              sanitize(body.tensaoQd === "outro" ? body.tensaoQdOther : body.tensaoQd, 30),
      tipoQd:              sanitize(body.tipoQd === "outro" ? body.tipoQdOther : body.tipoQd, 50),
      correnteGeral:       sanitize(body.correnteGeral, LIMITES.correnteGeral),
      estadoIdentificacao: sanitize(body.estadoIdentificacao, 30),
      estadoGeral:         sanitize(body.estadoGeral, 30),
      aterramento:         sanitize(body.aterramento, 30),
      grauProtecao:        sanitize(body.grauProtecao, LIMITES.grauProtecao),
      observacoesGerais:   sanitize(body.observacoesGerais, LIMITES.observacoesGerais),
      totalCurrent:        sanitize(body.totalCurrent, 20),
      power:               sanitize(body.power, 20),
      powerFactor:         sanitize(body.powerFactor, 10),
      tecnicoResponsavel:  sanitize(body.tecnicoResponsavel, LIMITES.tecnicoResponsavel),
      dataHora:            sanitize(body.dataHora, 20),
      obsFinais:           sanitize(body.obsFinais, LIMITES.obsFinais),
      devices:             typeof body.devices === "object" ? body.devices : {},
      circuitsA:           Array.isArray(body.circuitsA) ? body.circuitsA.slice(0, 100) : [],
      circuitsB:           Array.isArray(body.circuitsB) ? body.circuitsB.slice(0, 100) : [],
      inspectionChecklist: Array.isArray(body.inspectionChecklist) ? body.inspectionChecklist.slice(0, 50) : [],
      savedAt:             sanitize(body.savedAt, 30),
    };

    // RPUSH: acrescenta ao final da lista de forma atômica
    const totalRegistros = await kv.rpush("quadros_eletricos", JSON.stringify(registro));

    return res.status(200).json({
      sucesso: true,
      id: registro.id,
      mensagem: `Quadro "${registro.nomeQuadro}" enviado com sucesso!`,
      totalRegistros,
    });
  } catch (err) {
    // Erro genérico: não expõe detalhes internos ao cliente
    console.error("Erro ao salvar:", err);
    return res.status(500).json({ erro: "Erro interno ao processar a requisição." });
  }
}
