import { teamsAndDepartments } from "./teams";
import { DROPDOWN_OPTIONS } from "./sampleWorkersExcel";

export const MOCK_OTP_CODE = "202688";

/**
 * Curated mock registry of Harvesters Gbagada workers covering all user-journey branches:
 *  - Workers with email on file + complete details
 *  - Workers with email on file + missing Role / Department / Team (must be updated)
 *  - Workers WITHOUT email on file + complete or partial details
 */
export const MOCK_WORKERS_POOL = [
  {
    id: "wb26-w-01",
    firstName: "Adebayo",
    lastName: "Okafor",
    phone: "08034521908",
    email: "adebayo.okafor@harvestersng.org",
    role: "Cell Leader",
    team: "Ministry",
    department: "Leadership Training",
  },
  {
    id: "wb26-w-02",
    firstName: "Mayowa",
    lastName: "Agboade",
    phone: "08023198450",
    email: "", // Branch: No email on record -> prompts for email first, plus missing Department & Team
    role: "Worker",
    team: "",
    department: "",
  },
  {
    id: "wb26-w-03",
    firstName: "Temitope",
    lastName: "Balogun",
    phone: "08149203847",
    email: "temitope.balogun@gmail.com",
    role: "", // Branch: Has email, but Role & Department are empty and must be updated
    team: "Membership",
    department: "",
  },
  {
    id: "wb26-w-04",
    firstName: "Chidinma",
    lastName: "Nwosu",
    phone: "07065812390",
    email: "chidinma.nwosu@yahoo.com",
    role: "Assistant HOD",
    team: "General Service",
    department: "Communications (DMU)",
  },
  {
    id: "wb26-w-05",
    firstName: "Folasade",
    lastName: "Ogunleye",
    phone: "08091234098",
    email: "", // Branch: No email on record + missing Role
    role: "",
    team: "Program",
    department: "Exalted Tribe",
  },
  {
    id: "wb26-w-06",
    firstName: "Oluwaseun",
    lastName: "Adeleke",
    phone: "08056781234",
    email: "seun.adeleke@outlook.com",
    role: "Small Group Leader",
    team: "Maturity",
    department: "Prayer and Bible Study",
  },
  {
    id: "wb26-w-07",
    firstName: "Emmanuel",
    lastName: "Eze",
    phone: "08123459876",
    email: "emmanuel.eze@gmail.com",
    role: "Worker",
    team: "", // Branch: Has email, missing Team & Department
    department: "",
  },
  {
    id: "wb26-w-08",
    firstName: "Kelechi",
    lastName: "Iheanacho",
    phone: "09034128765",
    email: "", // Branch: No email on record, complete team/dept
    role: "Worker",
    team: "Mission",
    department: "Evangelism",
  },
  {
    id: "wb26-w-09",
    firstName: "Oluwadamilola",
    lastName: "Akinwale",
    phone: "08087654321",
    email: "damilola.akinwale@gmail.com",
    role: "HOD",
    team: "Next Gen",
    department: "Harvesters Kidzone",
  },
  {
    id: "wb26-w-10",
    firstName: "Babajide",
    lastName: "Sanwo",
    phone: "08071122334",
    email: "babajide.s@harvestersng.org",
    role: "", // Branch: Has email, missing Role & Department
    team: "Districts",
    department: "",
  },
  {
    id: "wb26-w-11",
    firstName: "Tolulope",
    lastName: "Fashola",
    phone: "08160099887",
    email: "tolu.fashola@gmail.com",
    role: "Zonal Leader",
    team: "Districts",
    department: "Gbagada Estate Community",
  },
  {
    id: "wb26-w-12",
    firstName: "Ifeanyi",
    lastName: "Okonkwo",
    phone: "07038844221",
    email: "",
    role: "Worker",
    team: "Membership",
    department: "Guest Welcome",
  },
  {
    id: "wb26-w-13",
    firstName: "Ayomide",
    lastName: "Oladipo",
    phone: "08039988776",
    email: "ayomide.oladipo@gmail.com",
    role: "",
    team: "",
    department: "",
  },
  {
    id: "wb26-w-14",
    firstName: "Bukola",
    lastName: "Adeyemi",
    phone: "08182233445",
    email: "bukola.adeyemi@gmail.com",
    role: "Interest Group Leader",
    team: "Interactive Groups",
    department: "Women of Wisdom",
  },
  {
    id: "wb26-w-15",
    firstName: "Tosin",
    lastName: "Ogunbiyi",
    phone: "09012233445",
    email: "",
    role: "",
    team: "Ministry",
    department: "Workforce Admin",
  },
  {
    id: "wb26-w-16",
    firstName: "Ngozi",
    lastName: "Obi",
    phone: "08064455667",
    email: "ngozi.obi@gmail.com",
    role: "Worker",
    team: "Membership",
    department: "Growth Track",
  },
];

/**
 * Mask an email address for privacy in public search results (e.g. "ad***r@harvestersng.org")
 */
export function maskEmail(email = "") {
  const trimmed = String(email || "").trim();
  if (!trimmed || !trimmed.includes("@")) return "";
  const [local, domain] = trimmed.split("@");
  if (local.length <= 2) return `${local[0] || "*"}***@${domain}`;
  return `${local.slice(0, 2)}•••${local.slice(-1)}@${domain}`;
}

/**
 * Mask an 11-digit phone number for public display (e.g. "0803 ••• 1908")
 */
export function maskPhone(phone = "") {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 4)} ••• ${digits.slice(-4)}`;
}

/**
 * Search mock workers by name or phone number and ALWAYS return 10 results
 * (ranking exact/partial matches first, then filling remaining slots so the 10-result
 * journey can be experienced with any query).
 */
export async function searchWorkersBallMock(query = "") {
  const raw = String(query || "").trim();
  const qLower = raw.toLowerCase();
  const qDigits = raw.replace(/\D/g, "");

  // Simulate realistic network latency for radar scan animation
  await new Promise((r) => setTimeout(r, 520));

  const scored = MOCK_WORKERS_POOL.map((worker, idx) => {
    const fullName = `${worker.firstName} ${worker.lastName}`.toLowerCase();
    let score = 0;
    if (qLower && fullName.startsWith(qLower)) score += 100;
    else if (qLower && (worker.firstName.toLowerCase().startsWith(qLower) || worker.lastName.toLowerCase().startsWith(qLower))) score += 80;
    else if (qLower && fullName.includes(qLower)) score += 60;

    if (qDigits.length >= 2 && worker.phone.includes(qDigits)) {
      score += 90;
    }
    if (qLower && worker.department?.toLowerCase().includes(qLower)) {
      score += 30;
    }
    return { worker, score, idx };
  });

  // Sort by highest match score, preserving pool order as tiebreaker
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

  const topTen = scored.slice(0, 10).map((item) => ({ ...item.worker }));

  // If the user typed a very specific custom name that wasn't in our static pool,
  // inject a dynamic top match at #1 so they see their exact searched name/phone!
  const hasDirectMatch = scored[0]?.score > 0;
  if (!hasDirectMatch && raw.length >= 2) {
    const isPhoneQuery = qDigits.length >= 7 && qDigits.length === raw.replace(/\s+/g, "").length;
    const parts = raw.split(/\s+/).filter(Boolean);
    const customFirst = isPhoneQuery
      ? "Chukwudi"
      : parts[0]
        ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
        : "Worker";
    const customLast = isPhoneQuery
      ? "Nwankwo"
      : parts.slice(1).join(" ")
        ? parts.slice(1).join(" ").charAt(0).toUpperCase() + parts.slice(1).join(" ").slice(1)
        : "Harvester";
    const customPhone = isPhoneQuery
      ? qDigits.padEnd(11, "4").slice(0, 11)
      : "08037650912";

    topTen[0] = {
      id: `wb26-custom-${Date.now()}`,
      firstName: customFirst,
      lastName: customLast,
      phone: customPhone,
      email: `${customFirst.toLowerCase()}.${customLast.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
      role: "Worker",
      team: "",
      department: "",
    };
  }

  return topTen;
}

/**
 * Generate a deterministic, ceremonial Workers Ball 2026 access code (HGWB-XXXXXX).
 */
export function generateWorkersBallCode(worker) {
  const seedStr = `${worker.firstName || ""}${worker.lastName || ""}${worker.phone || ""}`;
  let hash = 2026;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 33 + seedStr.charCodeAt(i)) % 9000;
  }
  const num = String(1000 + (hash % 9000)).padStart(4, "0");
  const initials = `${(worker.firstName || "H")[0]}${(worker.lastName || "W")[0]}`.toUpperCase();
  return `HGWB-${initials}${num}`;
}

export function getAllRoleOptions() {
  return DROPDOWN_OPTIONS["Worker Role"] || [
    "Worker",
    "Cell Leader",
    "Small Group Leader",
    "Assistant HOD",
    "HOD",
  ];
}

export function getAllTeamOptions() {
  return teamsAndDepartments.map((t) => t.team);
}

export function getDepartmentsForTeam(teamName = "") {
  if (!teamName) return [];
  const found = teamsAndDepartments.find(
    (t) => t.team.toLowerCase() === String(teamName).trim().toLowerCase()
  );
  return found ? found.department : [];
}

/**
 * Render and trigger a high-DPI PNG download of the worker's official Workers Ball 2026 Pass.
 */
export function downloadWorkersBallPassPng({
  firstName,
  lastName,
  email,
  phone,
  role,
  department,
  team,
  accessCode,
}) {
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
  ctx.fillText(accessCode, rightCenter, cardY + 134);

  // Deterministic Verification Matrix (QR-inspired geometric grid)
  const gridSize = 9;
  const cellSize = 16;
  const matrixW = gridSize * cellSize;
  const matrixX = rightCenter - matrixW / 2;
  const matrixY = cardY + 195;

  ctx.fillStyle = "#FAFAF7";
  ctx.beginPath();
  ctx.roundRect(matrixX - 16, matrixY - 16, matrixW + 32, matrixW + 32, 8);
  ctx.fill();

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const isCorner =
        (r < 3 && c < 3) ||
        (r < 3 && c >= gridSize - 3) ||
        (r >= gridSize - 3 && c < 3);
      const charCode = accessCode.charCodeAt((r * gridSize + c) % accessCode.length) || 65;
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

  ctx.fillStyle = "#9A9A95";
  ctx.font = "500 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("PRESENT CODE AT CHECK-IN", rightCenter, cardY + 412);
  ctx.fillStyle = "#6B6B66";
  ctx.fillText("HICC GBAGADA · EDITION 2026", rightCenter, cardY + 434);

  // Trigger download
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = `Workers-Ball-2026-Pass-${accessCode}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
