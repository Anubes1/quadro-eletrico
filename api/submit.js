import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  try {
    const body = req.body;

    if (!body || typeof body !== "object") {
      return res.status(400).json({ erro: "Corpo da requisição inválido" });
    }

    const registro = {
      id: crypto.randomUUID(),
      enviadoEm: new Date().toISOString(),
      nomeQuadro: body.nomeQuadro || "",
      local: body.local || "",
      dataVistoria: body.dataVistoria || "",
      responsavel: body.responsavel || "",
      registro: body.registro || "",
      tensao: body.tensaoQd === "outro" ? body.tensaoQdOther : body.tensaoQd,
      tipoQd: body.tipoQd === "outro" ? body.tipoQdOther : body.tipoQd,
      correnteGeral: body.correnteGeral || "",
      estadoIdentificacao: body.estadoIdentificacao || "",
      estadoGeral: body.estadoGeral || "",
      aterramento: body.aterramento || "",
      grauProtecao: body.grauProtecao || "",
      observacoesGerais: body.observacoesGerais || "",
      totalCurrent: body.totalCurrent || "",
      power: body.power || "",
      powerFactor: body.powerFactor || "",
      tecnicoResponsavel: body.tecnicoResponsavel || "",
      dataHora: body.dataHora || "",
      obsFinais: body.obsFinais || "",
      devices: body.devices || {},
      circuitsA: body.circuitsA || [],
      circuitsB: body.circuitsB || [],
      inspectionChecklist: body.inspectionChecklist || [],
      savedAt: body.savedAt || new Date().toISOString(),
    };

    // Upstash: lê lista existente e adiciona o novo registro
    let registros = [];
    try {
      const existing = await kv.get("quadros_eletricos");
      registros = Array.isArray(existing) ? existing : [];
    } catch {
      registros = [];
    }

    registros.push(registro);
    await kv.set("quadros_eletricos", registros);

    return res.status(200).json({
      sucesso: true,
      id: registro.id,
      mensagem: `Quadro "${registro.nomeQuadro}" enviado com sucesso!`,
      totalRegistros: registros.length,
    });
  } catch (err) {
    console.error("Erro ao salvar:", err);
    return res.status(500).json({ erro: "Erro interno: " + err.message });
  }
}
