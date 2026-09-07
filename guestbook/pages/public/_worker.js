// Reuse the same validated API; the original Worker retains the daily D1 cleanup.
import guestbook from "../../worker.js";

export default {
  fetch(request, env, context) {
    return guestbook.fetch(request, env, context);
  }
};
