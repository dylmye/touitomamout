import { readFile } from "node:fs/promises";

import type { Cookie } from "tough-cookie";

import { COOKIES_PATH } from "../../constants";

export const getCookies = async (): Promise<Cookie[] | null> => {
  try {
    const fileContent = await readFile(COOKIES_PATH, "utf-8");

    return JSON.parse(fileContent);
  } catch {
    return null;
  }
};
