import { readBoundedJson, RequestBodyTooLargeError } from "../../src/lib/http/json-body";

/** Older route fixtures only expose json(); adapt them to a real byte stream. */
export const boundedJsonForRouteFixture = {
  RequestBodyTooLargeError,
  async readBoundedJson(request: Request, limit: number) {
    const fixture = request as Pick<Request, "json"> & { body?: Request["body"] };
    if ("body" in fixture) return readBoundedJson(request, limit);
    return readBoundedJson(new Request("https://fixture.test", { method: "POST", body: JSON.stringify(await fixture.json()) }), limit);
  },
};
