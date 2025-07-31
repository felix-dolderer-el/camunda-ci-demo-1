import assert from "assert";

export const env = getValidatedEnv();

function getValidatedEnv(): {
  CAMUNDA_URL: string;
  CAMUNDA_USER: string;
  CAMUNDA_PASS: string;
} {
  const CAMUNDA_URL = process.env.CAMUNDA_URL;
  const CAMUNDA_USER = process.env.CAMUNDA_USER;
  const CAMUNDA_PASS = process.env.CAMUNDA_PASS;
  if (!CAMUNDA_URL) {
    throw new Error("CAMUNDA_URL is not set");
  } else if (!CAMUNDA_USER) {
    throw new Error("CAMUNDA_USER is not set");
  } else if (!CAMUNDA_PASS) {
    throw new Error("CAMUNDA_PASS is not set");
  }
  return { CAMUNDA_URL, CAMUNDA_USER, CAMUNDA_PASS };
}
