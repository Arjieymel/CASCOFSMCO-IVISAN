import axios from "axios";

const AxiosInstance = axios.create({ baseURL: "http://127.0.0.1:8000/api" });

AxiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  config.headers = config.headers ?? {};

  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  // Prevent browser & proxy caching for all API requests
  config.headers["Cache-Control"] = "no-cache, no-store, max-age=0, must-revalidate";
  config.headers["Pragma"] = "no-cache";
  config.headers["Expires"] = "0";

  // Attach a timestamp query parameter for GET requests to guarantee fresh data
  if (config.method?.toLowerCase() === "get") {
    config.params = {
      ...(config.params || {}),
      _t: Date.now()
    };
  }

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

AxiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    if (status !== 422 && status !== 401) {
      console.error("Unexpected response error: ", error);
    }

    return Promise.reject(error);
  },
);

export default AxiosInstance;
