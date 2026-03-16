import api from "./api";

export const getDiscoverFeed = async ({ status, page = 1, pageSize = 20 } = {}) => {
  const params = { page, page_size: pageSize };
  if (status) params.status = status;
  const res = await api.get("/discover/", { params });
  return res.data; // { total, page, page_size, results: [...capsules] }
};

export const searchDiscover = async (query) => {
  const res = await api.get("/discover/search/", { params: { q: query } });
  return res.data; // { capsules, people, events }
};

export const getFriendsFeed = async ({ page = 1, pageSize = 20 } = {}) => {
  const res = await api.get("/discover/friends/", { params: { page, page_size: pageSize } });
  return res.data; // { total, page, page_size, results: [...capsules] }
};

export const getGlobalFeed = async () => {
  const res = await api.get("/discover/global/");
  return res.data; // { events, capsules }
};
