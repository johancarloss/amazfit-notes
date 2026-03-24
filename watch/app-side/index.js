import { BaseSideService } from "@zeppos/zml/base-side";

var API_BASE = "https://amazfit-notes.duckdns.org/api/v1";
var API_KEY = "REDACTED_API_KEY";

async function fetchFromApi(endpoint, res) {
  var url = API_BASE + endpoint;
  console.log("Fetching:", url);

  try {
    var response = await fetch({
      url: url,
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    var body = response.body;
    var data = typeof body === "string" ? JSON.parse(body) : body;
    console.log("API OK");
    res(null, { result: data });
  } catch (err) {
    console.log("API error:", err);
    res(null, { result: { error: err ? err.message || String(err) : "Fetch failed" } });
  }
}

AppSideService(
  BaseSideService({
    onInit() {
      console.log("Side Service init");
    },

    onRequest(req, res) {
      var method = req.method;
      var params = req.params || {};

      console.log("Request:", method);

      if (method === "GET_WATCH_NOTES") {
        fetchFromApi("/folders/Watch", res);
      } else if (method === "GET_ROOT_FOLDERS") {
        fetchFromApi("/folders", res);
      } else if (method === "GET_FOLDER") {
        fetchFromApi("/folders/" + (params.path || ""), res);
      } else if (method === "GET_NOTE_BLOCKS") {
        var endpoint = "/notes/" + (params.path || "");
        if (params.max_blocks) {
          endpoint += "?max_blocks=" + params.max_blocks;
        }
        fetchFromApi(endpoint, res);
      } else {
        res(null, { result: { error: "Unknown method: " + method } });
      }
    },

    onDestroy() {
      console.log("Side Service destroyed");
    },
  })
);
