// studio/src/lib/api.ts
//
// The default-exported axios client the vendored media suite talks to.
//
// The gn-apex original lives in the console and reads its token from the
// console's zustand auth store. The Studio is standalone, so this shim keeps
// the same surface — a default `apiClient` with `get`/`post`/... — but sources
// the bearer token from the Studio's own access-token store
// (`src/lib/api/client.ts`) and points at the same backend the Studio's `http`
// client already uses. `withCredentials` stays on so a session cookie works in
// same-parent-domain deployments too.

import axios from 'axios';
import { API_BASE_URL, getAccessToken } from './api/client';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiClient;
