import PDFDocument from "pdfkit";

const reportTypeLabels = {
  laboratory: "Laboratori",
  energy: "Energjia",
  alerts: "Alarmet",
  equipment_health: "Shëndeti i pajisjeve",
  maintenance: "Mirëmbajtja",
  simulation: "Simulimi",
};

export async function exportReport(report) {
  const format = report.parameters.format;
  if (format === "csv") {
    return {
      contentType: "text/csv; charset=utf-8",
      extension: "csv",
      content: csvReport(report),
    };
  }
  return {
    contentType: "application/pdf",
    extension: "pdf",
    content: await pdfReport(report),
  };
}

function csvReport(report) {
  const rows = [
    ["Universiteti", report.universityName],
    ["Laboratori", report.laboratoryName ?? "Të gjithë laboratorët"],
    ["Titulli", report.title],
    ["Lloji", reportTypeLabels[report.reportType] ?? report.reportType],
    ["Periudha nga", iso(report.periodStart)],
    ["Periudha deri", iso(report.periodEnd)],
    ["Gjeneruar më", report.parameters.generatedAt],
    ["Autori", report.generatedByName],
    ["Burimi i të dhënave", report.parameters.dataSource],
    [],
    ["Koha", "Vlera", "Minimumi", "Maksimumi", "Mostra"],
    ...(report.parameters.snapshot?.series ?? []).map((point) => [
      point.bucketStart,
      point.value,
      point.minimum,
      point.maximum,
      point.samples,
    ]),
  ];
  return Buffer.from(`\uFEFF${rows.map(csvRow).join("\r\n")}`, "utf8");
}

function pdfReport(report) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      margin: 48,
      size: "A4",
      info: { Title: report.title },
    });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    document.fillColor("#58427c").fontSize(11).text("CAMPUSLAB TWIN");
    document.moveDown(0.5).fillColor("#17151b").fontSize(22).text(report.title);
    document
      .moveDown(0.4)
      .fontSize(10)
      .fillColor("#68646e")
      .text(
        `${report.universityName} · ${report.laboratoryName ?? "Të gjithë laboratorët"}`,
      );
    document.moveDown(1.4);
    metadata(
      document,
      "Lloji",
      reportTypeLabels[report.reportType] ?? report.reportType,
    );
    metadata(
      document,
      "Periudha",
      `${iso(report.periodStart)} — ${iso(report.periodEnd)}`,
    );
    metadata(document, "Gjeneruar më", report.parameters.generatedAt);
    metadata(document, "Autori", report.generatedByName);
    metadata(document, "Burimi i të dhënave", report.parameters.dataSource);
    const snapshot = report.parameters.snapshot;
    if (snapshot) {
      document
        .moveDown(1)
        .fillColor("#17151b")
        .fontSize(14)
        .text("Përmbledhja");
      document.moveDown(0.5).fontSize(10);
      metadata(document, "Vlera mesatare", snapshot.summary?.value ?? "—");
      metadata(document, "Minimumi", snapshot.summary?.minimum ?? "—");
      metadata(document, "Maksimumi", snapshot.summary?.maximum ?? "—");
      metadata(document, "Mostra", snapshot.summary?.samples ?? 0);
      if (snapshot.recommendations?.length) {
        document
          .moveDown(1)
          .fontSize(14)
          .fillColor("#17151b")
          .text("Rekomandimet");
        for (const item of snapshot.recommendations) {
          document
            .moveDown(0.5)
            .fontSize(10)
            .fillColor("#58427c")
            .text(item.title);
          document
            .fillColor("#17151b")
            .text(`${item.explanation} ${item.action}`);
        }
      }
    }
    document
      .moveDown(1.5)
      .fontSize(8)
      .fillColor("#68646e")
      .text(`Raporti #${report.id} · Gjeneruar nga CampusLab Twin`);
    document.end();
  });
}

function metadata(document, label, value) {
  document.fillColor("#68646e").text(label, { continued: true, width: 130 });
  document.fillColor("#17151b").text(`  ${value ?? "—"}`);
}

function csvRow(values) {
  return values.map((value) => csvCell(value)).join(",");
}

function csvCell(value = "") {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function iso(value) {
  return value instanceof Date ? value.toISOString() : String(value ?? "");
}
