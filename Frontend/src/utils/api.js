import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: true, // send session cookie
});

export async function fetchPresets() {
  const { data } = await api.get("/api/presets");
  return data;
}

export async function fetchHistory() {
  const { data } = await api.get("/api/history");
  return data;
}

export async function deleteHistoryRecord(id) {
  await api.delete(`/api/history/${id}`);
}

export async function generatePDF({ photos, widthMm, heightMm, bgColor, country, documentType, copies, skipBgRemoval }) {
  const form = new FormData();
  photos.forEach((f) => form.append("photos", f));
  form.append("width_mm",  widthMm);
  form.append("height_mm", heightMm);
  form.append("bg_color",  bgColor);
  form.append("country",   country || "");
  form.append("document_type", documentType || "");
  form.append("copies",    JSON.stringify(copies));
  form.append("skip_bg_removal", skipBgRemoval ? "true" : "false");

  const response = await api.post("/api/process", form, {
    responseType: "blob",
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data; // Blob
}

export default api;
