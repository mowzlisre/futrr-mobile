import api from "./api";

export const getProfile = async () => {
  const res = await api.get("/users/me/");
  return res.data;
};

export const updateProfile = async (data) => {
  const res = await api.patch("/users/me/update/", data);
  return res.data;
};

export const searchUsers = async (query) => {
  const res = await api.get("/users/search/", { params: { q: query } });
  return res.data.results ?? res.data;
};

export const getUserProfile = async (userId) => {
  const res = await api.get(`/users/${userId}/`);
  return res.data;
};

export const deleteAccount = async (password) => {
  const res = await api.delete("/users/delete-account/", { data: { password } });
  return res.data;
};

export const getQuota = async () => {
  const res = await api.get("/users/me/quota/");
  return res.data;
};

export const createSupportTicket = async ({ category, subject, message }) => {
  const res = await api.post("/users/support/", { category, subject, message });
  return res.data;
};

export const getSupportTickets = async () => {
  const res = await api.get("/users/support/tickets/");
  return res.data;
};

export const uploadAvatar = async (fileUri) => {
  const form = new FormData();
  const filename = fileUri.split("/").pop();
  const ext = filename.split(".").pop().toLowerCase();
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  form.append("avatar", { uri: fileUri, name: filename, type: mimeType });
  const res = await api.post("/users/me/avatar/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // { avatar: presigned_url }
};
