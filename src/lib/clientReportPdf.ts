import { jsPDF } from "jspdf";
import type { ClientRow, SaleRow } from "@/lib/data";
import type { AccountPerformance, DailyPoint, DashboardSummary } from "@/lib/dashboard";

const BRAND = { r: 99, g: 102, b: 241 }; // primary
const ACCENT = { r: 16, g: 185, b: 129 }; // success
const WARN = { r: 245, g: 158, b: 11 };
const TEXT = { r: 30, g: 41, b: 59 };
const MUTED = { r: 100, g: 116, b: 139 };
const BORDER = { r: 226, g: 232, b: 240 };
const SOFT_BG = { r: 248, g: 250, b: 252 };

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlPrecise = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;
const dateBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

type ReportData = {
  client: ClientRow;
  summary: DashboardSummary;
  daily: DailyPoint[];
  accounts: AccountPerformance[];
  sales: SaleRow[];
  periodLabel: string;
};

export async function generateClientReportPDF(data: ReportData) {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 14;
  let y = 0;

  const setFill = (c: { r: number; g: number; b: number }) => pdf.setFillColor(c.r, c.g, c.b);
  const setText = (c: { r: number; g: number; b: number }) => pdf.setTextColor(c.r, c.g, c.b);
  const setDraw = (c: { r: number; g: number; b: number }) => pdf.setDrawColor(c.r, c.g, c.b);

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 18) {
      addFooter();
      pdf.addPage();
      y = margin;
      addPageHeader();
    }
  };

  const addPageHeader = () => {
    setFill(BRAND);
    pdf.rect(0, 0, pageW, 1.5, "F");
    y = 8;
  };

  let pageNum = 0;
  const addFooter = () => {
    pageNum = pdf.getNumberOfPages();
    setText(MUTED);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("TraffixPro • Relatório gerado em " + new Date().toLocaleString("pt-BR"), margin, pageH - 8);
    pdf.text(`Página ${pageNum}`, pageW - margin, pageH - 8, { align: "right" });
  };

  // ============ COVER ============
  setFill(BRAND);
  pdf.rect(0, 0, pageW, 70, "F");
  setText({ r: 255, g: 255, b: 255 });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("TRAFFIXPRO", margin, 18);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Relatório de Performance", margin, 24);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26);
  pdf.text(data.client.name, margin, 46);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const meta: string[] = [];
  if (data.client.segment) meta.push(data.client.segment);
  meta.push(data.client.status === "active" ? "Ativo" : data.client.status);
  pdf.text(meta.join("  •  "), margin, 54);

  pdf.setFontSize(10);
  pdf.text(`Período: ${data.periodLabel}`, margin, 62);

  y = 82;

  // ============ HIGHLIGHT BOX (ROI) ============
  setFill(SOFT_BG);
  setDraw(BORDER);
  pdf.roundedRect(margin, y, pageW - margin * 2, 32, 3, 3, "FD");
  setText(MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("RESULTADO DO PERÍODO", margin + 6, y + 8);

  const roiColor = data.summary.roi >= 0 ? ACCENT : { r: 239, g: 68, b: 68 };
  setText(roiColor);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(pct(data.summary.roi), margin + 6, y + 22);
  setText(MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("ROI", margin + 6, y + 28);

  // Right side: revenue - spend
  const rightX = pageW - margin - 6;
  setText(TEXT);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(brl(data.summary.revenue), rightX, y + 14, { align: "right" });
  setText(MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("Faturamento", rightX, y + 19, { align: "right" });

  setText(TEXT);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(brl(data.summary.spend), rightX, y + 26, { align: "right" });
  setText(MUTED);
  pdf.setFontSize(8);
  pdf.text("Investimento", rightX, y + 30, { align: "right" });

  y += 40;

  // ============ KPIs GRID ============
  sectionTitle("Métricas principais");
  const kpis: Array<{ label: string; value: string; sub?: string }> = [
    { label: "Investimento", value: brl(data.summary.spend) },
    { label: "Faturamento", value: brl(data.summary.revenue) },
    { label: "ROAS", value: `${data.summary.roas.toFixed(2).replace(".", ",")}x` },
    { label: "Vendas", value: num(data.summary.salesCount) },
    { label: "Leads", value: num(data.summary.conversions), sub: data.summary.cpl ? `${brlPrecise(data.summary.cpl)}/lead` : undefined },
    { label: "Mensagens WhatsApp", value: num(data.summary.messages), sub: data.summary.costPerMessage ? `${brlPrecise(data.summary.costPerMessage)}/msg` : undefined },
    { label: "Cliques", value: num(data.summary.clicks), sub: data.summary.cpc ? `${brlPrecise(data.summary.cpc)}/clique` : undefined },
    { label: "CTR", value: pct(data.summary.ctr) },
    { label: "Impressões", value: num(data.summary.impressions) },
    { label: "Alcance", value: num(data.summary.reach) },
    { label: "CPM", value: data.summary.cpm ? brlPrecise(data.summary.cpm) : "—" },
    { label: "Frequência", value: data.summary.frequency.toFixed(2).replace(".", ",") },
  ];

  drawKpiGrid(kpis);

  // ============ DAILY CHART ============
  if (data.daily.length > 0) {
    ensureSpace(80);
    sectionTitle("Evolução diária");
    drawDailyChart(data.daily);
  }

  // ============ ACCOUNTS TABLE ============
  if (data.accounts.length > 0) {
    ensureSpace(40);
    sectionTitle("Contas de anúncio vinculadas");
    drawTable(
      ["Conta", "Investido", "Leads", "Cliques", "CTR", "CPL"],
      [55, 28, 22, 22, 22, 28],
      data.accounts.map((a) => [
        a.name,
        brl(a.spend),
        num(a.conversions),
        num(a.clicks),
        pct(a.ctr),
        a.cpl ? brlPrecise(a.cpl) : "—",
      ]),
    );
  }

  // ============ SALES TABLE ============
  if (data.sales.length > 0) {
    ensureSpace(40);
    sectionTitle("Vendas registradas");
    const salesRows = data.sales.slice(0, 30).map((s) => [
      dateBR(s.sale_date),
      String(s.quantity),
      brlPrecise(Number(s.unit_value)),
      brlPrecise(s.quantity * Number(s.unit_value)),
      s.notes ?? "—",
    ]);
    drawTable(["Data", "Qtd", "Valor unit.", "Total", "Obs."], [22, 16, 30, 30, 79], salesRows);
    if (data.sales.length > 30) {
      setText(MUTED);
      pdf.setFontSize(8);
      pdf.text(`+ ${data.sales.length - 30} venda(s) não exibida(s)`, margin, y);
      y += 5;
    }
  }

  // ============ DAILY TABLE ============
  if (data.daily.length > 0) {
    ensureSpace(40);
    sectionTitle("Detalhamento diário");
    const rows = data.daily.map((d) => [
      dateBR(d.date),
      brl(d.spend),
      num(d.impressions),
      num(d.clicks),
      num(d.conversions),
      num(d.messages),
      brl(d.salesValue),
    ]);
    drawTable(["Data", "Invest.", "Impr.", "Cliques", "Leads", "Msg", "Vendas"], [22, 28, 25, 22, 22, 20, 35], rows);
  }

  addFooter();

  pdf.save(`relatorio-${data.client.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);

  // ============ helpers ============
  function sectionTitle(t: string) {
    ensureSpace(12);
    setFill(BRAND);
    pdf.rect(margin, y, 3, 5, "F");
    setText(TEXT);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(t, margin + 6, y + 4);
    y += 9;
  }

  function drawKpiGrid(items: Array<{ label: string; value: string; sub?: string }>) {
    const cols = 3;
    const gap = 3;
    const cardW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
    const cardH = 22;
    items.forEach((kpi, i) => {
      const col = i % cols;
      if (col === 0 && i > 0) y += cardH + gap;
      if (col === 0) ensureSpace(cardH + gap);
      const x = margin + col * (cardW + gap);
      setFill(SOFT_BG);
      setDraw(BORDER);
      pdf.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
      setText(MUTED);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.text(kpi.label.toUpperCase(), x + 4, y + 5);
      setText(TEXT);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text(kpi.value, x + 4, y + 13);
      if (kpi.sub) {
        setText(MUTED);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.text(kpi.sub, x + 4, y + 18);
      }
    });
    y += cardH + 6;
  }

  function drawDailyChart(daily: DailyPoint[]) {
    const chartW = pageW - margin * 2;
    const chartH = 60;
    const chartX = margin;
    const chartY = y;

    setFill(SOFT_BG);
    setDraw(BORDER);
    pdf.roundedRect(chartX, chartY, chartW, chartH, 2, 2, "FD");

    const padL = 16;
    const padR = 6;
    const padT = 8;
    const padB = 14;
    const innerW = chartW - padL - padR;
    const innerH = chartH - padT - padB;

    const maxSpend = Math.max(1, ...daily.map((d) => d.spend));
    const maxConv = Math.max(1, ...daily.map((d) => d.conversions));

    // grid lines
    setDraw(BORDER);
    pdf.setLineWidth(0.1);
    for (let g = 0; g <= 4; g++) {
      const gy = chartY + padT + (innerH * g) / 4;
      pdf.line(chartX + padL, gy, chartX + padL + innerW, gy);
    }

    const stepX = daily.length > 1 ? innerW / (daily.length - 1) : 0;

    // spend area (filled bars-ish)
    setFill({ r: BRAND.r, g: BRAND.g, b: BRAND.b });
    daily.forEach((d, i) => {
      const h = (d.spend / maxSpend) * innerH;
      const px = chartX + padL + i * stepX - 1;
      pdf.rect(px, chartY + padT + innerH - h, 2, h, "F");
    });

    // conversions line
    setDraw(ACCENT);
    pdf.setLineWidth(0.6);
    for (let i = 0; i < daily.length - 1; i++) {
      const x1 = chartX + padL + i * stepX;
      const y1 = chartY + padT + innerH - (daily[i].conversions / maxConv) * innerH;
      const x2 = chartX + padL + (i + 1) * stepX;
      const y2 = chartY + padT + innerH - (daily[i + 1].conversions / maxConv) * innerH;
      pdf.line(x1, y1, x2, y2);
    }

    // x labels (sparse)
    setText(MUTED);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    const labelEvery = Math.max(1, Math.ceil(daily.length / 8));
    daily.forEach((d, i) => {
      if (i % labelEvery !== 0 && i !== daily.length - 1) return;
      const lx = chartX + padL + i * stepX;
      pdf.text(dateBR(d.date), lx, chartY + chartH - 4, { align: "center" });
    });

    // legend
    setFill(BRAND);
    pdf.rect(chartX + padL, chartY + 3, 3, 3, "F");
    setText(MUTED);
    pdf.setFontSize(8);
    pdf.text("Investimento", chartX + padL + 5, chartY + 5.5);
    setFill(ACCENT);
    pdf.rect(chartX + padL + 32, chartY + 3, 3, 3, "F");
    pdf.text("Leads", chartX + padL + 37, chartY + 5.5);

    y += chartH + 6;
  }

  function drawTable(headers: string[], widths: number[], rows: string[][]) {
    const rowH = 7;
    const headerH = 8;
    ensureSpace(headerH + rowH * 2);

    // header
    setFill(BRAND);
    pdf.rect(margin, y, pageW - margin * 2, headerH, "F");
    setText({ r: 255, g: 255, b: 255 });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    let hx = margin + 3;
    headers.forEach((h, i) => {
      pdf.text(h, hx, y + 5.5);
      hx += widths[i];
    });
    y += headerH;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    rows.forEach((row, idx) => {
      ensureSpace(rowH);
      if (idx % 2 === 1) {
        setFill(SOFT_BG);
        pdf.rect(margin, y, pageW - margin * 2, rowH, "F");
      }
      setText(TEXT);
      let cx = margin + 3;
      row.forEach((cell, i) => {
        const maxW = widths[i] - 2;
        const text = pdf.splitTextToSize(String(cell), maxW)[0] ?? "";
        pdf.text(text, cx, y + 5);
        cx += widths[i];
      });
      setDraw(BORDER);
      pdf.setLineWidth(0.1);
      pdf.line(margin, y + rowH, pageW - margin, y + rowH);
      y += rowH;
    });
    y += 6;
  }
}