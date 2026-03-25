import api from "./api";

export const getEvents = async ({ page = 1, pageSize = 20 } = {}) => {
  const res = await api.get("/events/", { params: { page, page_size: pageSize } });
  return res.data; // { total, page, page_size, results: [...events] }
};

export const checkEventSlug = async (slug) => {
  const res = await api.get("/events/check-slug/", { params: { slug } });
  return res.data; // { available: bool, slug: string }
};

export const createEvent = async (data, bannerUri) => {
  // Create event with JSON first, then upload banner separately if needed
  const res = await api.post("/events/", data);
  if (bannerUri && res.data?.id) {
    const form = new FormData();
    const ext = bannerUri.split(".").pop() || "jpg";
    form.append("banner_image", {
      uri: bannerUri,
      name: `banner.${ext}`,
      type: "image/jpeg",
    });
    const updated = await api.patch(`/events/${res.data.id}/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return updated.data;
  }
  return res.data;
};

export const getEvent = async (id) => {
  const res = await api.get(`/events/${id}/`);
  return res.data;
};

export const updateEvent = async (id, data, bannerUri) => {
  // First update JSON fields
  const res = await api.patch(`/events/${id}/`, data);
  // Then upload banner if provided
  if (bannerUri) {
    const form = new FormData();
    const ext = bannerUri.split(".").pop() || "jpg";
    form.append("banner_image", {
      uri: bannerUri,
      name: `banner.${ext}`,
      type: "image/jpeg",
    });
    const updated = await api.patch(`/events/${id}/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return updated.data;
  }
  return res.data;
};

export const deleteEvent = async (id) => {
  await api.delete(`/events/${id}/`);
};
