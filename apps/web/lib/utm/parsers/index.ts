import { hotmartParser } from "./hotmart";
import { kiwifyParser } from "./kiwify";
import { hublaParser } from "./hubla";
import { assinyParser } from "./assiny";
import type { GatewayParser } from "./types";

export const PARSERS: Record<string, GatewayParser> = {
  hotmart: hotmartParser,
  kiwify: kiwifyParser,
  hubla: hublaParser,
  assiny: assinyParser,
};

export type Gateway = keyof typeof PARSERS;
