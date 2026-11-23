import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const BASE_URL = "https://api.g1.datacrazy.io";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const load = (file) => JSON.parse(fs.readFileSync(path.join(root, "catalog", file), "utf8"));
const operations = load("operations.json");
const flowBlocks = load("flow-blocks.json");
const flowAuthoring = load("flow-authoring.json");
for (const { method, path: notePath, note } of load("notes.json")) {
  const op = operations.find((o) => o.method === method && o.path === notePath);
  if (op) op.pitfall = note;
}
const SECRET_KEY = /^(config|webhook)$|token|secret|password|api_?key/i;
const redact = (value) => {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SECRET_KEY.test(k) && v !== null && v !== "" ? "[oculto pelo plugin]" : redact(v)]));
};
const MAX_OUTPUT = 15000;
const VERSION = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const LATEST_URL = "https://raw.githubusercontent.com/crm-datacrazy-io/datacrazy-agent-plugin/main/package.json";
const HARNESS = {
  "claude-code": {
    storeKey: "Guardar a chave no plugin: no Claude Code digitar /plugin, abrir a aba Installed, escolher datacrazy e Configure options. Atalho: /plugin configure datacrazy@datacrazy.",
    update: "no terminal, claude plugin marketplace update datacrazy e depois claude plugin update datacrazy@datacrazy; no app do Claude, Plugins > Add > Manage marketplaces > Check for updates e depois Update na página do plugin. Depois reiniciar o Claude Code",
  },
}[process.env.DATACRAZY_HARNESS] || {
  storeKey: "Guardar a chave na configuração deste plugin na ferramenta em uso, no campo de segredo ou na variável DATACRAZY_API_KEY do servidor datacrazy.",
  update: "atualizar o plugin datacrazy pelo gerenciador de plugins da ferramenta em uso e reiniciá-la",
};
const newer = (a, b) => {
  const [x, y] = [a, b].map((v) => String(v).split(".").map(Number));
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};
let updateNotice;
async function updateNoticeOnce() {
  if (updateNotice !== undefined) return "";
  updateNotice = "";
  try {
    const latest = (await (await fetch(LATEST_URL, { signal: AbortSignal.timeout(3000) })).json()).version;
    if (newer(latest, VERSION))
      updateNotice = `\n[plugin desatualizado: instalada ${VERSION}, disponível ${latest}. Ao final da resposta, avise o usuário em uma frase e diga como atualizar: ${HARNESS.update}.]`;
  } catch {}
  return updateNotice;
}
const BLOCKED_ACCOUNTS = /^\/api\/v1\/accounts\/(billing|companies|company\/|company-users|users|profile|trial-challenges|admin)/;

const SETUP = [
  "A chave de API do Datacrazy não está configurada neste plugin.",
  "NÃO peça para o usuário colar a chave no chat e não aceite chave enviada no chat.",
  "Oriente o usuário, nesta ordem:",
  "1. Entrar na conta de PRODUÇÃO em https://crm.datacrazy.io/config/api (Configurações > Chaves de API) e criar uma chave. Só um administrador consegue criar.",
  "2. " + HARNESS.storeKey,
  "3. Repetir o pedido. Se as tools não aparecerem, reiniciar a ferramenta.",
  "O plugin só opera a conta de produção. Chave de QA, homologação, preview ou teste não funciona e não deve ser usada.",
].join("\n");

const INSTRUCTIONS = [
  "Estas tools operam a conta REAL de PRODUÇÃO do usuário no Datacrazy (CRM, atendimento e automações). Tudo o que você grava vale de verdade: mensagens chegam a clientes reais.",
  "Como trabalhar: 1) dc_search para achar a operação; 2) dc_call com o método e o caminho exatos que a busca devolveu. Nunca invente caminho: rota fora do catálogo é recusada.",
  "Faça o que o usuário pediu, sem pedir confirmação para ação simples e específica (criar ou editar um registro, mover um negócio, enviar uma mensagem que ele ditou para um contato que ele indicou).",
  "Peça confirmação antes de: excluir, agir em massa (vários registros de uma vez), disparar mensagem para vários contatos, ativar automação e mudar configuração da conta. Diga o que será afetado e quantos registros, espere o sim e só então chame com confirmed: true.",
  "Se faltar um dado obrigatório e ele não puder ser descoberto por busca, pergunte. Se a busca achar mais de um registro possível (dois contatos com o mesmo nome), mostre as opções e pergunte qual.",
  "Rótulos do catálogo: documentada (API pública oficial); interna-provada (rota interna sem documentação pública, testada); interna-nao-provada (rota interna não testada, pode falhar); erro-conhecido e bloqueada-para-chave-de-api (não funcionam). Prefira documentada quando ela resolver. Ao usar rota interna, avise o usuário em uma frase que ela não faz parte da API pública documentada e pode mudar.",
  "Chave de API: nunca peça, repita nem aceite a chave no chat. Se o usuário colar uma chave, não a use nem a repita, diga que você não usa chave enviada pelo chat, recomende revogá-la e criar outra, e oriente a configuração segura (a tool devolve o passo a passo quando a chave falta). Só existe produção: recuse chave ou endereço de QA, homologação ou preview.",
  "Limite: 60 chamadas por minuto por rota, variando com o plano da conta. Em 429 a tool já espera e repete.",
  "Cada operação devolvida por dc_search pode trazer o campo pitfall: é uma armadilha conhecida daquela rota; siga-a. Antes de contar, somar, achar o primeiro ou o último, ler uma conversa inteira ou percorrer listas grandes, leia a skill leitura-em-volume. O tamanho de uma página nunca é o total da conta.",
  "Automações (flows): leia a skill automacoes do plugin datacrazy antes de criar ou editar. Envio de mídia: skill atendimento. Relatórios e métricas: skill relatorios.",
  "Responda ao usuário em português, com o resultado e o que foi alterado. Não mostre JSON bruto, IDs internos nem nome de tool, salvo se ele pedir.",
].join("\n");

const SYNONYMS = {
  negocio: ["business", "businesses"], negocios: ["business", "businesses"], oportunidade: ["business"], venda: ["business"],
  etiqueta: ["tag", "tags"], etiquetas: ["tag", "tags"], funil: ["pipeline", "pipelines"], funis: ["pipeline"],
  etapa: ["stage", "stages"], etapas: ["stage", "stages"], conversa: ["conversation", "conversations"], conversas: ["conversation", "conversations"],
  mensagem: ["message", "messages"], mensagens: ["message", "messages"], atividade: ["activity", "activities"], atividades: ["activity", "activities"],
  tarefa: ["activity", "activities"], automacao: ["flow", "flows"], automacoes: ["flow", "flows"], fluxo: ["flow", "flows"],
  produto: ["product", "products"], produtos: ["product", "products"], lista: ["list", "lists"], listas: ["list", "lists"],
  atendente: ["attendant", "attendants"], atendentes: ["attendant", "attendants"], usuario: ["attendant", "user", "users"], usuarios: ["attendant", "users"],
  campo: ["field", "additional"], campos: ["field", "additional"], personalizado: ["additional"], anexo: ["attachment", "attachments"], anexos: ["attachment", "attachments"],
  arquivo: ["file", "files", "upload"], nota: ["note", "notes"], anotacao: ["note", "notes"], contato: ["lead", "leads", "contact"], contatos: ["lead", "leads"],
  cliente: ["lead", "leads"], clientes: ["lead", "leads"], criar: ["create", "post"], cadastrar: ["create"], editar: ["update", "patch"], atualizar: ["update"],
  alterar: ["update"], excluir: ["delete", "remove"], apagar: ["delete", "remove"], remover: ["delete", "remove"], listar: ["list", "find", "search"],
  buscar: ["find", "search", "list"], enviar: ["send"], mover: ["move"], ganhar: ["win"], ganho: ["win"], perder: ["lose"], perda: ["loss", "lose"],
  motivo: ["reason"], departamento: ["department", "departments"], setor: ["department"], canal: ["instance", "instances"], whatsapp: ["instance", "whatsapp"],
  instancia: ["instance", "instances"], horario: ["working", "hours"], relatorio: ["metrics", "summary"], metrica: ["metrics"], metricas: ["metrics"],
  lixeira: ["trash"], restaurar: ["restore"], importar: ["import"], exportar: ["export"], modelo: ["template", "templates"], agendar: ["schedule", "scheduled"],
  transferir: ["transfer", "attendant"], finalizar: ["finish"], encerrar: ["finish"], duplicado: ["duplicate", "duplicates"], historico: ["history"],
  segmento: ["segment", "segments"], integracao: ["integration", "integrations"], webhook: ["integration", "webhook"], disparo: ["boost", "boosts", "bulk"],
  campanha: ["boost", "boosts"], responsavel: ["attendant"], telefone: ["phone"], endereco: ["address"], pasta: ["folder", "folders"],
};

const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const stem = (t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t);
const tokenize = (s) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length > 1).map(stem);
const index = operations.map((op) => ({
  op,
  strong: new Set(tokenize([op.name, op.area, op.path.replace(/:\w+/g, "")].filter(Boolean).join(" "))),
  medium: new Set(op.label === "documentada" || op.name ? tokenize(op.desc || "") : []),
  weak: new Set(tokenize(op.desc || "")),
}));
const VERB_METHODS = {
  listar: ["GET"], buscar: ["GET"], ver: ["GET"], consultar: ["GET"], list: ["GET"], get: ["GET"], find: ["GET"], quantos: ["GET"], quantas: ["GET"],
  criar: ["POST"], cadastrar: ["POST"], adicionar: ["POST"], create: ["POST"], add: ["POST"], enviar: ["POST"], send: ["POST"],
  editar: ["PATCH", "PUT"], atualizar: ["PATCH", "PUT"], alterar: ["PATCH", "PUT"], update: ["PATCH", "PUT"],
  excluir: ["DELETE"], apagar: ["DELETE"], deletar: ["DELETE"], delete: ["DELETE"],
};
const LABEL_BONUS = { documentada: 4, "interna-provada": 1, "interna-nao-provada": 0, "erro-conhecido": -2, "bloqueada-para-chave-de-api": -2 };

function search({ query, method, limit }) {
  const raw = norm(query).split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  const verbs = new Set(raw.flatMap((t) => VERB_METHODS[t] || []));
  const nouns = raw.filter((t) => !VERB_METHODS[t]);
  const groups = (nouns.length ? nouns : raw).map((t) => [stem(t), ...(SYNONYMS[t] || SYNONYMS[stem(t)] || []).map(stem)]);
  const wanted = method ? String(method).toUpperCase() : null;
  const scored = [];
  for (const { op, strong, medium, weak } of index) {
    if (wanted && op.method !== wanted) continue;
    let score = 0;
    let hits = 0;
    for (const group of groups) {
      const best = Math.max(...group.map((t) => (strong.has(t) ? 4 : medium.has(t) ? 2 : weak.has(t) ? 1 : 0)));
      if (best) hits++;
      score += best;
    }
    if (!hits) continue;
    score += hits * 2 + (LABEL_BONUS[op.label] || 0) + (verbs.has(op.method) ? 4 : 0);
    scored.push({ score, op });
  }
  scored.sort((a, b) => b.score - a.score || a.op.path.length - b.op.path.length);
  const top = scored.slice(0, Math.min(Math.max(Number(limit) || 8, 1), 20)).map((s) => s.op);
  if (!top.length) return "Nenhuma operação encontrada. Tente outras palavras (em português ou inglês) ou o nome do recurso: leads, businesses, conversations, flows, tags, pipelines.";
  return JSON.stringify({ total: scored.length, operations: top });
}

const segments = (p) => p.split("/").filter(Boolean);
function findOperation(method, pathname) {
  const parts = segments(pathname);
  let found = null;
  for (const op of operations) {
    if (op.method !== method) continue;
    const pattern = segments(op.path);
    if (pattern.length !== parts.length) continue;
    if (!pattern.every((seg, i) => seg.startsWith(":") || seg === parts[i])) continue;
    if (!found || pattern.filter((s) => s.startsWith(":")).length < segments(found.path).filter((s) => s.startsWith(":")).length) found = op;
  }
  return found;
}

function appendQuery(params, key, value) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) value.forEach((v, i) => appendQuery(params, `${key}[${i}]`, v));
  else if (typeof value === "object") for (const [k, v] of Object.entries(value)) appendQuery(params, `${key}[${k}]`, v);
  else params.append(key, String(value));
}

function unwrap(status, json) {
  if (status < 400 || !json || typeof json !== "object") return { status, error: null };
  const inner = json.message && typeof json.message === "object" ? json.message : json;
  return {
    status: status === 400 && Number(inner.statusCode) ? Number(inner.statusCode) : status,
    error: { message: inner.message ?? json.message, code: inner.code ?? json.code },
  };
}

async function request(method, pathname, { query, body, form } = {}) {
  const key = (process.env.DATACRAZY_API_KEY || "").trim();
  if (!key || key.startsWith("${")) return { setup: true };
  const url = new URL(BASE_URL + pathname);
  for (const [k, v] of Object.entries(query || {})) appendQuery(url.searchParams, k, v);
  const headers = { Authorization: "Bearer " + key };
  let payload;
  if (form) payload = form;
  else if (body !== undefined && method !== "GET") {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, { method, headers, body: payload, signal: AbortSignal.timeout(60000) });
    if (res.status !== 429 || attempt === 2) break;
    const wait = Math.min(Number(res.headers.get("retry-after")) || 20, 65);
    await new Promise((r) => setTimeout(r, wait * 1000 + 500));
  }
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {}
  const { status, error } = unwrap(res.status, json);
  return { status, error, data: json !== undefined ? json : text };
}

function render(result, op) {
  if (result.setup) return { text: SETUP, isError: true };
  if (result.status === 401)
    return { text: "Chave recusada (401). A chave configurada é inválida, expirou ou não é da conta de produção.\n" + SETUP.split("\n").slice(1).join("\n"), isError: true };
  if (result.status === 429) return { text: "Limite de chamadas atingido mesmo após esperar. Aguarde um minuto antes de tentar de novo e reduza o número de chamadas.", isError: true };
  if (result.error) {
    const hint = result.status >= 500 ? " Erro interno do Datacrazy: não repita a mesma chamada; informe o usuário." : " Confira os parâmetros com dc_search antes de tentar de novo.";
    return { text: JSON.stringify({ status: result.status, error: result.error, label: op?.label }) + hint, isError: true };
  }
  if (result.data?.details?.code === "skip-limit-exceeded")
    return { text: "A API não devolve registros com skip acima de 10000 (página vazia não significa fim). Continue por data: ordene por createdAt desc e use filter[createdAtLessOrEqual] com a data do último registro lido. Para o mais antigo, use order[createdAt]=asc com take=1. Para o total, use skipTotals=false." };
  let out = typeof result.data === "string" ? result.data : JSON.stringify(redact(result.data));
  let truncated = "";
  if (out.length > MAX_OUTPUT) {
    out = out.slice(0, MAX_OUTPUT);
    truncated = "\n[resposta cortada: use filtros, take e skip para pedir menos dados]";
  }
  const warn = op && op.label !== "documentada" ? `\n[rota ${op.label}: avise o usuário que não faz parte da API pública documentada]` : "";
  return { text: `status ${result.status}\n${out}${truncated}${warn}` };
}

async function call({ method, path: rawPath, query, body, confirmed }) {
  const m = String(method || "").toUpperCase();
  const pathname = String(rawPath || "").split("?")[0];
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(m)) return { text: "Método inválido. Use GET, POST, PUT, PATCH ou DELETE.", isError: true };
  if (!pathname.startsWith("/api/v1/") || pathname.includes("..") || pathname.includes("//"))
    return { text: "Caminho inválido. Use o caminho exato devolvido por dc_search, começando por /api/v1/. O servidor é sempre o de produção.", isError: true };
  if (/[:{}<>]/.test(pathname)) return { text: "O caminho ainda tem um trecho de exemplo (como :id). Troque cada trecho pelo valor real, encontrado antes com uma busca. Nada foi chamado.", isError: true };
  if (String(rawPath).includes("?")) return { text: "Passe os filtros no campo query, não no caminho.", isError: true };
  const op = findOperation(m, pathname);
  if (!op || (BLOCKED_ACCOUNTS.test(pathname) && m !== "GET"))
    return { text: "Rota fora do catálogo do plugin; não foi chamada. Use dc_search para achar a operação. Cobrança, plano, usuários e exclusão da conta não são operados por aqui: oriente o usuário a usar o painel do Datacrazy.", isError: true };
  if (op.label === "erro-conhecido" || op.label === "bloqueada-para-chave-de-api") return { text: `Operação indisponível (${op.label}). ${op.note || ""} Não foi chamada.`, isError: true };
  if (op.upload) return { text: "Esta rota recebe arquivo. Use a tool dc_upload.", isError: true };
  if (op.destructive && confirmed !== true)
    return { text: "Ação destrutiva ou em massa; não foi executada. Diga ao usuário exatamente o que será afetado (o quê e quantos registros) e peça confirmação. Só depois do sim chame de novo com confirmed: true. Se o usuário já pediu de forma explícita esta ação exata sobre este item específico, isso vale como confirmação.", isError: true };
  return render(await request(m, pathname, { query, body }), op);
}

const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", mp4: "video/mp4", mov: "video/quicktime", pdf: "application/pdf", mp3: "audio/mpeg", ogg: "audio/ogg", csv: "text/csv", txt: "text/plain" };
async function upload({ file_path, kind, folder }) {
  const type = ["image", "video", "file"].includes(kind) ? kind : "file";
  if (!file_path || !fs.existsSync(file_path) || !fs.statSync(file_path).isFile()) return { text: "Arquivo não encontrado: " + file_path, isError: true };
  const name = path.basename(file_path);
  const mimeType = MIME[path.extname(name).slice(1).toLowerCase()] || "application/octet-stream";
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(file_path)], { type: mimeType }), name);
  const dir = encodeURIComponent(String(folder || "agente").replace(/[^\w-]/g, "-"));
  const result = await request("POST", `/api/v1/crm/files/upload/${type}/${dir}`, { form });
  if (result.setup || result.error) return render(result, { label: "interna-provada" });
  const url = result.data?.url;
  return { text: JSON.stringify({ url, fileName: name, mimeType, size: fs.statSync(file_path).size, type: type === "file" ? "FILE" : type.toUpperCase() }) + "\n[rota interna-provada: avise o usuário que não faz parte da API pública documentada]" };
}

const PLUGIN_KEYS = Object.values(flowAuthoring.containers).map((c) => c.pluginsKey).filter(Boolean);
const EMPTY = { string: "", number: 0, boolean: false, "string[]": [], object: {}, "object[]": [] };
function exampleBlock(block) {
  const container = flowAuthoring.containers[block.type];
  if (!container?.pluginsKey) return undefined;
  const options = Object.fromEntries(Object.entries(block.optionsSchema || {}).map(([k, v]) => [k, v.default ?? EMPTY[v.type] ?? ""]));
  const plugin = { name: block.name, options };
  const connections = Object.fromEntries(Object.keys(container.connections).filter((k) => !k.includes(".")).map((k) => [k, ""]));
  return { id: "b1", type: block.type, options: { [container.pluginsKey]: container.singlePlugin ? plugin : [plugin], ...connections } };
}

function blocks({ query, type, names, recipe }) {
  if (recipe) {
    const found = flowAuthoring.recipes.find((r) => r.id === recipe);
    return found ? JSON.stringify(found) : "Receita não encontrada. Liste as receitas com dc_flow_blocks sem parâmetros.";
  }
  if (Array.isArray(names) && names.length) {
    const found = flowBlocks.filter((b) => names.includes(b.name));
    if (!found.length) return "Nenhum bloco com esses nomes. Liste com dc_flow_blocks sem names.";
    return JSON.stringify({
      blocks: found.map((b) => ({ ...b, blockOptions: flowAuthoring.containers[b.type]?.options, connections: flowAuthoring.containers[b.type]?.connections, example: exampleBlock(b) })),
      reminder: "Monte cada bloco como no example: o item { name, options } vai dentro da lista do tipo do bloco (triggers, actions, conditions, messages...), nunca direto em options.",
    });
  }
  const terms = tokenize(query || "").flatMap((t) => [t, ...(SYNONYMS[t] || []).map(stem)]);
  const list = flowBlocks
    .filter((b) => !type || b.type === type)
    .filter((b) => !terms.length || terms.some((t) => norm(b.name + " " + b.group + " " + b.description).includes(t)))
    .map((b) => ({ name: b.name, type: b.type, group: b.group, description: b.description }));
  return JSON.stringify({
    rules: flowAuthoring.rules,
    listsPerBlockType: Object.fromEntries(Object.entries(flowAuthoring.containers).map(([t, c]) => [t, c.pluginsKey || "(sem lista: opções direto em options)"])),
    recipes: flowAuthoring.recipes.map((r) => ({ id: r.id, title: r.title, whenToUse: r.whenToUse })),
    total: list.length,
    blocks: list.slice(0, 60),
    next: "Chame de novo com names para receber o schema de opções e um exemplo pronto de cada bloco escolhido, ou com recipe para receber uma receita completa. Nas regras, flow_block_catalog e flow_block_details são esta tool; nomes como tag_list e instance_list são operações que você acha com dc_search.",
  });
}

const TOOLS = [
  {
    name: "dc_search",
    description: "Busca no catálogo o que dá para fazer na conta Datacrazy do usuário e devolve as operações com método, caminho, parâmetros e rótulo. Use sempre antes de dc_call. Aceita palavras em português ou inglês (ex.: 'criar lead', 'mover negócio etapa', 'enviar mensagem conversa', 'flow activate'). Não chama a API.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "O que você quer fazer, em poucas palavras." }, method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], description: "Opcional: filtra pelo método." }, limit: { type: "number", description: "Quantas operações devolver (padrão 8, máximo 20)." } }, required: ["query"] },
  },
  {
    name: "dc_call",
    description: "Executa uma operação na conta de PRODUÇÃO do usuário no Datacrazy. Use o método e o caminho exatos devolvidos por dc_search, trocando os trechos :id pelos valores reais. Rota fora do catálogo é recusada. Operação destrutiva ou em massa só roda com confirmed: true, depois de o usuário confirmar.",
    inputSchema: { type: "object", properties: { method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] }, path: { type: "string", description: "Caminho começando por /api/v1/, sem domínio e sem query string." }, query: { type: "object", description: "Parâmetros de query. Objeto aninhado vira colchetes: {filter:{startDate:'...'}} é enviado como filter[startDate]=..." }, body: { type: "object", description: "Corpo JSON para POST, PUT, PATCH e DELETE." }, confirmed: { type: "boolean", description: "true somente depois de o usuário confirmar esta ação destrutiva ou em massa." } }, required: ["method", "path"] },
  },
  {
    name: "dc_upload",
    description: "Envia um arquivo do computador do usuário para o Datacrazy e devolve a URL pública. Use antes de mandar imagem, vídeo ou documento em uma conversa, ou de anexar arquivo a lead ou negócio.",
    inputSchema: { type: "object", properties: { file_path: { type: "string", description: "Caminho absoluto do arquivo local." }, kind: { type: "string", enum: ["image", "video", "file"], description: "image, video ou file (qualquer outro tipo, inclusive áudio e PDF)." }, folder: { type: "string", description: "Pasta de destino (opcional)." } }, required: ["file_path", "kind"] },
  },
  {
    name: "dc_flow_blocks",
    description: "Catálogo para montar automações. Sem names: devolve as regras de montagem, as receitas prontas e a lista de blocos (gatilhos, ações, condições, mensagens, espera) filtrada por busca ou tipo. Com names: devolve o schema de opções e um exemplo pronto de cada bloco. Com recipe: devolve uma receita completa. Não chama a API.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Palavras para filtrar, ex.: 'tag', 'mensagem', 'etapa'." }, type: { type: "string", enum: ["trigger", "action", "condition", "chat", "delay", "api", "field-operation"] }, names: { type: "array", items: { type: "string" }, description: "Nomes exatos dos blocos para receber o schema completo e um exemplo." }, recipe: { type: "string", description: "Id de uma receita para receber os blocos prontos." } } },
  },
];

const HANDLERS = { dc_search: async (a) => ({ text: search(a) }), dc_call: call, dc_upload: upload, dc_flow_blocks: async (a) => ({ text: blocks(a) }) };
const send = (message) => process.stdout.write(JSON.stringify(message) + "\n");

async function handle(msg) {
  if (msg.id === undefined || msg.id === null) return;
  const reply = (result) => send({ jsonrpc: "2.0", id: msg.id, result });
  if (msg.method === "initialize")
    return reply({ protocolVersion: msg.params?.protocolVersion || "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "datacrazy", version: VERSION }, instructions: INSTRUCTIONS });
  if (msg.method === "ping") return reply({});
  if (msg.method === "tools/list") return reply({ tools: TOOLS });
  if (msg.method === "tools/call") {
    const handler = HANDLERS[msg.params?.name];
    if (!handler) return send({ jsonrpc: "2.0", id: msg.id, error: { code: -32602, message: "Tool desconhecida" } });
    try {
      const { text, isError } = await handler(msg.params.arguments || {});
      return reply({ content: [{ type: "text", text: text + (await updateNoticeOnce()) }], isError: Boolean(isError) });
    } catch (err) {
      return reply({ content: [{ type: "text", text: "Falha ao falar com o Datacrazy: " + (err?.name === "TimeoutError" ? "tempo esgotado" : err?.message || "erro de rede") }], isError: true });
    }
  }
  send({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } });
}

readline.createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  handle(msg);
});
