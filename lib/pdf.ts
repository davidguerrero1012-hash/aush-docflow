import "server-only";

import { jsPDF } from "jspdf";
import "jspdf-autotable";
import type { Submission } from "@/types";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

/**
 * Generates a PDF document for a submission record.
 * Uses a formal layout with AUSH DocFlow header, sections as tables.
 */
export async function generateSubmissionPDF(
  submission: Submission
): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // -- Header --
  doc.setFillColor(30, 64, 175); // blue-700
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("AUSH DocFlow", margin, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Submission Summary", margin, 27);

  // Reference number and date on the right
  doc.setFontSize(9);
  doc.text(`Ref: ${submission.referenceNumber}`, pageWidth - margin, 18, {
    align: "right",
  });
  doc.text(
    `Date: ${new Date(submission.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    pageWidth - margin,
    24,
    { align: "right" }
  );

  yPos = 45;
  doc.setTextColor(24, 24, 27); // zinc-900

  // -- Section helper --
  function addSection(title: string, rows: [string, string][]) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text(title, margin, yPos);
    yPos += 2;

    doc.autoTable({
      startY: yPos,
      margin: { left: margin, right: margin },
      theme: "plain",
      styles: {
        fontSize: 10,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
        textColor: [24, 24, 27],
        lineColor: [228, 228, 231], // zinc-200
        lineWidth: 0.1,
      },
      columnStyles: {
        0: {
          fontStyle: "bold",
          cellWidth: 55,
          textColor: [113, 113, 122], // zinc-500
        },
        1: { cellWidth: contentWidth - 55 },
      },
      body: rows.map(([label, value]) => [
        label,
        doc.splitTextToSize(value || "N/A", contentWidth - 60).join("\n"),
      ]),
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Page break check
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPos = margin;
    }
  }

  // -- Personal Information --
  addSection("Personal Information", [
    ["Full Name", `${submission.firstName} ${submission.lastName}`],
    ["Date of Birth", submission.dateOfBirth],
    ["Phone", submission.phone],
    ["Email", submission.email],
    ["SSN (Last 4)", "****"], // Never include actual SSN in PDF
  ]);

  // -- Address --
  const addressRows: [string, string][] = [
    ["Street Address", submission.streetAddress],
    ["City", submission.city],
    ["State", submission.state],
    ["ZIP Code", submission.zipCode],
  ];
  if (!submission.mailingSameAsResidential && submission.mailingAddress) {
    addressRows.push([
      "Mailing Address",
      `${submission.mailingAddress.street}, ${submission.mailingAddress.city}, ${submission.mailingAddress.state} ${submission.mailingAddress.zip}`,
    ]);
  } else {
    addressRows.push(["Mailing Address", "Same as residential"]);
  }
  addSection("Address Information", addressRows);

  // -- Employment --
  addSection("Employment Information", [
    ["Employer", submission.employerName],
    ["Occupation", submission.occupation],
    [
      "Annual Income",
      `$${submission.annualIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    ],
    ["Employment Status", submission.employmentStatus.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())],
  ]);

  // -- Document --
  const docTypeLabel = submission.documentType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const docRows: [string, string][] = [
    ["Document Type", docTypeLabel],
  ];
  if (submission.ocrData && submission.ocrData.fields.length > 0) {
    docRows.push([
      "OCR Fields Extracted",
      String(submission.ocrData.fields.length),
    ]);
    docRows.push([
      "Fields Manually Edited",
      submission.ocrFieldsEdited.length > 0
        ? submission.ocrFieldsEdited.join(", ")
        : "None",
    ]);
  }
  addSection("Document Information", docRows);

  // -- Additional Info --
  const additionalRows: [string, string][] = [];
  if (submission.insuranceProvider) {
    additionalRows.push(["Insurance Provider", submission.insuranceProvider]);
  }
  if (submission.policyNumber) {
    additionalRows.push(["Policy Number", submission.policyNumber]);
  }
  additionalRows.push(["Dependents", String(submission.dependentsCount)]);
  if (submission.additionalNotes) {
    additionalRows.push(["Additional Notes", submission.additionalNotes]);
  }
  if (additionalRows.length > 0) {
    addSection("Additional Information", additionalRows);
  }

  // -- Footer --
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170); // zinc-400
    doc.text(
      `AUSH DocFlow | ${submission.referenceNumber} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Return as Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
