import * as YAML from "yaml";
import * as fs from "fs";
import { IHub } from "../contracts";


export const toSnakeCase = (str: string) => {
  const convert = (str: string) =>
    str &&
    str
      .match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
      )
      .map((x) => x.toLowerCase())
      .join("_");

  return convert(str);
};

export const paddedNumber = (number: number, length: number) => {
  var str = "" + number;
  while (str.length < length) {
    str = "0" + str;
  }

  return str;
};

/** Only position reports update HA. A stop acknowledgement has no position. */
export const parseBlindResponse = (message: string, hubs: IHub[]) => {
  for (const hub of hubs) {
    for (const blind of hub.blinds) {
      const prefix = `!${hub.bridge_address}${blind.motor_address}`;
      if (!message.startsWith(prefix)) continue;
      const reply = message.slice(prefix.length);
      const position = /^r(\d{3})(?:b\d+)?(?:,[^;]*)?;$/.exec(reply);
      if (position && Number(position[1]) <= 100) {
        return { blindName: toSnakeCase(blind.name), position: position[1] };
      }
      return null;
    }
  }
  return null;
};

export const hubAvailabilityTopic = (config: any, hub: IHub) =>
  `${config.availability_topic}/hub/${encodeURIComponent(hub.host)}_${hub.port}`;

export const FileParser = async (fileUrl: string) => {
  return {
    readFile: () => YAML.parse(fs.readFileSync(fileUrl, "utf8")),
  };
};
