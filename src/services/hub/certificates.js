import { hubGet, hubPost, hubRequest } from "./client";

export function fetchTemplates() {
  return hubGet("/certificate-templates");
}

export function createTemplate(data) {
  return hubPost("/certificate-templates", data);
}

export function verifyCertificate(certificateNumber) {
  return hubRequest("GET", `/verify/${certificateNumber}`, undefined, undefined, false);
}

export function downloadCertificate(certificateNumber) {
  return hubRequest("GET", `/certificates/${certificateNumber}/download`, undefined, {
    responseType: "blob",
  }, false);
}
