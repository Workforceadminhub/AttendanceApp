/**
 * Render and trigger a high-DPI PNG download of the worker's official Workers Ball 2026 Pass.
 */
export async function downloadWorkersBallPassPng({
  firstName,
  lastName,
  email,
  phone,
  role,
  department,
  team,
  accessCode,
  qrCode,
}) {
  if (typeof document === "undefined") return;

  const canvas = document.createElement("canvas");
  const scale = 2;
  const width = 1080;
  const height = 620;
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  // Outer Cream Background
  ctx.fillStyle = "#FAFAF7";
  ctx.fillRect(0, 0, width, height);

  // Architectural Grid Lines on Cream Margin
  ctx.strokeStyle = "#E5E5E0";
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  // Main Pass Container (Deep Ink #0A0E1A)
  const cardX = 48;
  const cardY = 48;
  const cardW = width - 96;
  const cardH = height - 96;

  ctx.fillStyle = "#0A0E1A";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 12);
  ctx.fill();

  // Top Sienna Accent Bar
  ctx.fillStyle = "#B5471F";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, 8, [12, 12, 0, 0]);
  ctx.fill();

  // Subtle geometric orbital rings inside the pass
  ctx.save();
  ctx.strokeStyle = "rgba(250, 250, 247, 0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cardX + cardW - 160, cardY + cardH / 2, 190, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cardX + cardW - 160, cardY + cardH / 2, 135, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Perforated vertical divider before stub
  const stubX = cardX + cardW - 310;
  ctx.save();
  ctx.strokeStyle = "#2C3142";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(stubX, cardY + 24);
  ctx.lineTo(stubX, cardY + cardH - 24);
  ctx.stroke();
  ctx.restore();

  // Punch-out semicircles at top & bottom of perforation
  ctx.fillStyle = "#FAFAF7";
  ctx.beginPath();
  ctx.arc(stubX, cardY, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(stubX, cardY + cardH, 14, 0, Math.PI * 2);
  ctx.fill();

  // Left side content: Eyebrow
  ctx.fillStyle = "#D26840";
  ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("HARVESTERS INTERNATIONAL CHRISTIAN CENTRE · GBAGADA", cardX + 44, cardY + 56);

  // Main Event Title
  ctx.fillStyle = "#FAFAF7";
  ctx.font = "700 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText("Workers Ball 2026", cardX + 44, cardY + 108);

  // Subtitle
  ctx.fillStyle = "#9A9A95";
  ctx.font = "400 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText("A Night of Honour, Excellence & Celebration · Official Admit One Pass", cardX + 44, cardY + 138);

  // Hairline horizontal rule
  ctx.strokeStyle = "#1A1F2E";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 44, cardY + 164);
  ctx.lineTo(stubX - 36, cardY + 164);
  ctx.stroke();

  // Attendee Name
  ctx.fillStyle = "#6B6B66";
  ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("REGISTERED WORKER", cardX + 44, cardY + 198);

  const fullName = `${firstName || ""} ${lastName || ""}`.trim() || "Registered Worker";
  ctx.fillStyle = "#FAFAF7";
  ctx.font = "700 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(fullName, cardX + 44, cardY + 234);

  // Role & Phone row
  ctx.fillStyle = "#6B6B66";
  ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("ROLE / DESIGNATION", cardX + 44, cardY + 284);
  ctx.fillText("TEAM", cardX + 330, cardY + 284);

  ctx.fillStyle = "#E5E5E0";
  ctx.font = "600 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(role || "Worker", cardX + 44, cardY + 310);
  ctx.fillText(team || "Gbagada Workforce", cardX + 330, cardY + 310);

  // Department & Email row
  ctx.fillStyle = "#6B6B66";
  ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("DEPARTMENT", cardX + 44, cardY + 360);
  ctx.fillText("VERIFIED CONTACT", cardX + 330, cardY + 360);

  ctx.fillStyle = "#E5E5E0";
  ctx.font = "600 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(department || "General Workforce", cardX + 44, cardY + 386);
  ctx.font = "400 14px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "#9A9A95";
  ctx.fillText(email || phone || "", cardX + 330, cardY + 386);

  // Bottom Status Pill on Left
  ctx.fillStyle = "#1A1F2E";
  ctx.beginPath();
  ctx.roundRect(cardX + 44, cardY + 432, 320, 44, 6);
  ctx.fill();

  ctx.fillStyle = "#4A6B3F";
  ctx.beginPath();
  ctx.arc(cardX + 66, cardY + 454, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FAFAF7";
  ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("STATUS: CONFIRMED · ADMIT ONE", cardX + 82, cardY + 458);

  // Right Stub: Access Code & Matrix
  const rightCenter = stubX + (cardX + cardW - stubX) / 2;

  ctx.fillStyle = "#9A9A95";
  ctx.textAlign = "center";
  ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("UNIQUE ACCESS CODE", rightCenter, cardY + 76);

  // Code Box
  ctx.fillStyle = "#1A1F2E";
  ctx.strokeStyle = "#B5471F";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(stubX + 28, cardY + 94, 254, 64, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#FAFAF7";
  ctx.font = "700 22px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(accessCode || "HGWB-CONFIRMED", rightCenter, cardY + 134);

  // Deterministic Verification Matrix or real QR Code
  const codeForMatrix = accessCode || "HGWB-PASS";
  const gridSize = 9;
  const cellSize = 16;
  const matrixW = gridSize * cellSize;
  const matrixX = rightCenter - matrixW / 2;
  const matrixY = cardY + 195;

  ctx.fillStyle = "#FAFAF7";
  ctx.beginPath();
  ctx.roundRect(matrixX - 16, matrixY - 16, matrixW + 32, matrixW + 32, 8);
  ctx.fill();

  let qrRendered = false;
  if (qrCode) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve) => {
        let settled = false;
        const done = (success) => {
          if (settled) return;
          settled = true;
          qrRendered = success;
          resolve();
        };

        img.onload = () => {
          try {
            ctx.drawImage(img, matrixX - 10, matrixY - 10, matrixW + 20, matrixW + 20);
            done(true);
          } catch {
            done(false);
          }
        };
        img.onerror = () => done(false);
        img.src = qrCode;

        if (img.complete && img.naturalWidth > 0) {
          try {
            ctx.drawImage(img, matrixX - 10, matrixY - 10, matrixW + 20, matrixW + 20);
            done(true);
          } catch {
            done(false);
          }
        }
      });
    } catch {
      qrRendered = false;
    }
  }

  if (!qrRendered) {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const isCorner =
          (r < 3 && c < 3) ||
          (r < 3 && c >= gridSize - 3) ||
          (r >= gridSize - 3 && c < 3);
        const charCode = codeForMatrix.charCodeAt((r * gridSize + c) % codeForMatrix.length) || 65;
        const bit = isCorner || (charCode + r * 7 + c * 13) % 3 === 0;
        if (bit) {
          ctx.fillStyle = isCorner ? "#B5471F" : "#0A0E1A";
          ctx.fillRect(
            matrixX + c * cellSize + 1,
            matrixY + r * cellSize + 1,
            cellSize - 2,
            cellSize - 2
          );
        }
      }
    }
  }

  ctx.fillStyle = "#9A9A95";
  ctx.font = "500 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("PRESENT CODE AT CHECK-IN", rightCenter, cardY + 412);
  ctx.fillStyle = "#6B6B66";
  ctx.fillText("HICC GBAGADA · EDITION 2026", rightCenter, cardY + 434);

  // Trigger download
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = `Workers-Ball-2026-Pass-${accessCode || "confirmed"}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
