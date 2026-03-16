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

export const followUser = async (userId) => {
  const res = await api.post(`/users/${userId}/follow/`);
  return res.data;
};

export const unfollowUser = async (userId) => {
  const res = await api.delete(`/users/${userId}/unfollow/`);
  return res.data;
};

export const getMyFollowers = async () => {
  const res = await api.get("/users/me/followers/");
  return res.data;
};

export const getMyFollowing = async () => {
  const res = await api.get("/users/me/following/");
  return res.data;
};
