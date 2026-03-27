import { BaseSideService } from "@zeppos/zml/base-side";
import { API_BASE, API_KEY } from "../config.local";

async function fetchFromApi(endpoint, res) {
  const url = API_BASE + endpoint;

  try {
    const response = await fetch({
      url: url,
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    const body = response.body;
    const data = typeof body === "string" ? JSON.parse(body) : body;
    res(null, { result: data });
  } catch (err) {
    res(null, {
      result: { error: err ? err.message || String(err) : "Fetch failed" },
    });
  }
}

AppSideService(
  BaseSideService({
    onInit() {},

    onRequest(req, res) {
      const method = req.method;
      const params = req.params || {};

      if (method === "GET_WATCH_NOTES") {
        fetchFromApi("/folders/Watch", res);
      } else if (method === "GET_ROOT_FOLDERS") {
        fetchFromApi("/folders", res);
      } else if (method === "GET_FOLDER") {
        fetchFromApi("/folders/" + (params.path || ""), res);
      } else if (method === "GET_NOTE_BLOCKS") {
        let endpoint = "/notes/" + (params.path || "");
        const qs = [];
        if (params.offset !== undefined) qs.push("offset=" + params.offset);
        if (params.limit !== undefined) qs.push("limit=" + params.limit);
        if (qs.length > 0) endpoint += "?" + qs.join("&");
        fetchFromApi(endpoint, res);
      } else {
        res(null, { result: { error: "Unknown method: " + method } });
      }
    },

    onDestroy() {},
  })
);
