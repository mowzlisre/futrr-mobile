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

export const removeRecipient = async (capsuleId, recipientId) => {
  await api.delete(`/capsules/${capsuleId}/recipients/${recipientId}/`);
};

export const toggleFavorite = async (id) => {
  const res = await api.post(`/capsules/${id}/favorite/`);
  return res.data; // { favorited: true | false }
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

export const acceptCapsuleInvitation = async (capsuleId) => {
  const res = await api.post(`/capsules/${capsuleId}/invitation/`);
  return res.data;
};

export const declineCapsuleInvitation = async (capsuleId) => {
  await api.delete(`/capsules/${capsuleId}/invitation/`);
};

export const togglePin = async (id) => {
  const res = await api.post(`/capsules/${id}/pin/`);
  return res.data; // { pinned: true | false }
};

export const updateVisibility = async (id, { is_public, listed_in_atlas, latitude, longitude, location_name } = {}) => {
  const body = {};
  if (is_public !== undefined) body.is_public = is_public;
  if (listed_in_atlas !== undefined) body.listed_in_atlas = listed_in_atlas;
  if (latitude !== undefined) body.latitude = latitude;
  if (longitude !== undefined) body.longitude = longitude;
  if (location_name !== undefined) body.location_name = location_name;
  const res = await api.patch(`/capsules/${id}/visibility/`, body);
  return res.data; // { is_public, listed_in_atlas, latitude, longitude, location_name }
};

export const getPinnedCapsules = async (userId = null) => {
  const url = userId ? `/capsules/pinned/${userId}/` : "/capsules/pinned/";
  const res = await api.get(url);
  return res.data;
};
