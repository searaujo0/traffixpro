import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export async function exportElementToPDF(element: HTMLElement, filename: string, title: string) {
  // Forçar fundo claro temporário para captura legível
  const canvas = await html2canvas(element, {
    backgroundColor: "#0a0e1a",
    scale: 2,
    useCORS: true,
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Header
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageWidth, 22, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("TraffixPro", 12, 10);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(title, 12, 16);
  pdf.text(new Date().toLocaleDateString("pt-BR"), pageWidth - 12, 16, { align: "right" });

  // Body image
  const imgWidth = pageWidth - 16;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 26;

  pdf.addImage(imgData, "PNG", 8, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - position;

  while (heightLeft > 0) {
    pdf.addPage();
    position = -(imgHeight - heightLeft) + 10;
    pdf.addImage(imgData, "PNG", 8, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
