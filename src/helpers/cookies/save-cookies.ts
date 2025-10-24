import { writeFile } from "node:fs/promises";

import type { Cookie } from "tough-cookie";

import { COOKIES_PATH } from "../../constants";

export const saveCookies = async (cookies: Cookie[]): Promise<void> => {
  try {
    await writeFile(
      COOKIES_PATH,
      JSON.stringify(
        cookies.map((c) => c.toString()),
        null,
        2,
      ),
    );
  } catch (err) {
    console.error("Error updating cookies file:", err);
  }
};
