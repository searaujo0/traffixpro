/**
 * Dicionário de rótulos PT-BR alinhados ao Facebook Ads Manager (BR).
 * Mantido aqui para que toda a UI use exatamente os mesmos nomes que
 * o usuário vê dentro do Gerenciador de Anúncios.
 */

/** Rótulos das colunas/métricas padrão do Ads Manager */
export const META_METRIC_LABELS = {
  spend: "Valor usado",
  impressions: "Impressões",
  reach: "Alcance",
  frequency: "Frequência",
  linkClicks: "Cliques no link",
  ctr: "CTR (taxa de cliques no link)",
  cpc: "CPC (custo por clique no link)",
  cpm: "CPM (custo por mil impressões)",
  results: "Resultados",
  costPerResult: "Custo por resultado",
  messages: "Conversas iniciadas por mensagens",
  costPerMessage: "Custo por conversa iniciada por mensagens",
  roas: "ROAS (retorno sobre o investimento em publicidade)",
} as const;

/**
 * Mapeia o `action_type` cru da Graph API para o nome usado no
 * Ads Manager BR. Quando o tipo não é reconhecido, devolvemos
 * "Resultados" como fallback genérico — exatamente como o
 * Facebook faz quando não há tradução específica.
 */
const ACTION_TYPE_TO_LABEL: Record<string, string> = {
  // Leads / Cadastros
  "lead": "Leads",
  "offsite_conversion.fb_pixel_lead": "Leads (pixel)",
  "onsite_conversion.lead_grouped": "Leads no Facebook",
  "complete_registration": "Cadastros concluídos",
  "offsite_conversion.fb_pixel_complete_registration": "Cadastros concluídos (pixel)",

  // Compras
  "purchase": "Compras",
  "offsite_conversion.fb_pixel_purchase": "Compras (pixel)",
  "onsite_conversion.purchase": "Compras no Facebook",

  // Mensagens
  "onsite_conversion.total_messaging_connection": "Conversas iniciadas por mensagens",
  "onsite_conversion.messaging_conversation_started_7d": "Conversas iniciadas por mensagens",
  "onsite_conversion.messaging_first_reply": "Novas conexões por mensagens",

  // Engajamento
  "post_engagement": "Engajamento com a publicação",
  "page_engagement": "Engajamento com a Página",
  "video_view": "Visualizações do vídeo (3 segundos)",

  // Tráfego
  "link_click": "Cliques no link",
  "landing_page_view": "Visualizações da página de destino",

  // Outros
  "add_to_cart": "Adições ao carrinho",
  "initiate_checkout": "Finalizações de compra iniciadas",
  "add_payment_info": "Informações de pagamento adicionadas",
  "subscribe": "Assinaturas",
};

/** Devolve o rótulo PT-BR para um action_type da Graph API. */
export function labelForActionType(actionType: string | null | undefined): string {
  if (!actionType) return META_METRIC_LABELS.results;
  return ACTION_TYPE_TO_LABEL[actionType] ?? META_METRIC_LABELS.results;
}

/**
 * Ordem de prioridade para escolher qual action_type representa
 * o "Resultado" principal de uma campanha quando não temos o
 * objetivo explícito. A ordem segue a forma como o Ads Manager
 * destaca a coluna Resultados: vendas > leads > mensagens > engajamento.
 */
export const RESULT_PRIORITY: Array<string> = [
  // Vendas (mais valiosas)
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
  "onsite_conversion.purchase",
  // Leads
  "offsite_conversion.fb_pixel_lead",
  "lead",
  "onsite_conversion.lead_grouped",
  // Cadastros
  "complete_registration",
  "offsite_conversion.fb_pixel_complete_registration",
  // Mensagens
  "onsite_conversion.total_messaging_connection",
  "onsite_conversion.messaging_conversation_started_7d",
  // Engajamento / Tráfego
  "landing_page_view",
  "link_click",
  "post_engagement",
  "video_view",
];

/** Tipos exclusivamente de mensagens — separados para a coluna própria. */
export const MESSAGE_ACTION_TYPES: Array<string> = [
  "onsite_conversion.total_messaging_connection",
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply",
];