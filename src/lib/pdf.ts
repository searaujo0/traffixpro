import { jsPDF } from "jspdf";

export async function exportElementToPDF(element: HTMLElement, filename: string, title: string) {
  // Use html-to-image dynamically to avoid SSR issues and support modern CSS (oklab/oklch)
  const { toPng } = await import("html-to-image");

  const scale = 2;
  const imgData = await toPng(element, {
    backgroundColor: "#0a0e1a",
    pixelRatio: scale,
    style: {
      transform: "scale(1)",
      transformOrigin: "top left",
    }
  });

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
  const imgHeight = (element.clientHeight * imgWidth) / element.clientWidth;
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
