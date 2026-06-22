import { describe, expect, test } from "vitest";
import { checkZune, getZuneInstallHelp } from "../src/node/zune.js";

describe("zune", () => {
  test("reports unavailable binaries", async () => {
    const result = await checkZune("definitely-not-zune-ui-claps");
    expect(result.available).toBe(false);
    expect(getZuneInstallHelp("zune")).toContain("https://zune.sh/");
  });
});
