import api from "./api";

export const getCapsules = async () => {
  const res = await api.get("/capsules/");
  return res.data;
};

export const getCapsule = async (id) => {
  const res = await api.get(`/capsules/${id}/`);
  return res.data;
};

export const createCapsule = async (data) => {
  const res = await api.post("/capsules/", data);
  return res.data;
};

export const deleteCapsule = async (id) => {
  await api.delete(`/capsules/${id}/`);
};

export const addCapsuleContent = async (id, content) => {
  if (content.content_type === "text") {
    const res = await api.post(`/capsules/${id}/contents/`, {
      content_type: "text",
      body: content.body,
    });
    return res.data;
  }

  const form = new FormData();
  form.append("content_type", content.content_type);
  form.append("file", content.file);
  if (content.duration) form.append("duration", String(content.duration));

  const res = await api.post(`/capsules/${id}/contents/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const addRecipient = async (id, recipientData) => {
  const res = await api.post(`/capsules/${id}/recipients/`, recipientData);
  return res.data;
};

export const toggleFavorite = async (id) => {
  const res = await api.post(`/capsules/${id}/favorite/`);
  return res.data; // { favorited: true | false }
};

export const joinCapsule = async (shareToken) => {
  const res = await api.get(`/capsules/join/${shareToken}/`);
  return res.data;
};

export const getMapCapsules = async ({ lat_min, lat_max, lng_min, lng_max }) => {
  const res = await api.get("/capsules/map/", {
    params: { lat_min, lat_max, lng_min, lng_max },
  });
  return res.data;
};

export const unlockCapsule = async (id, passphrase = null) => {
  const body = passphrase ? { passphrase } : {};
  const res = await api.post(`/capsules/${id}/unlock/`, body);
  return res.data;
};

export const getFavorites = async () => {
  const res = await api.get("/capsules/favorites/");
  return res.data;
};
