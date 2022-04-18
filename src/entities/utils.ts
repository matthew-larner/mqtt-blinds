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

export const getRollerByName = (hubs: IHub[], blindsdName: string) => {
  const hub = hubs.find((hub) => {
    return hub.blinds.find((blind) => toSnakeCase(blind.name) === blindsdName);
  });
  const blind = hub.blinds[0];

  return { hub, blind };
};

export const getRoller = (hubs: IHub[], address: string, motor: string) => {
  const hub = hubs.find((hub: IHub) => hub.bridge_address === address);
  const blind = hub.blinds.find(
    (blind) => blind.motor_address.toLowerCase() === motor.toLowerCase()
  );

  return { hub, blind };
};

export const preparePayload = async (topic: string, message) => {
  const payload = message.toString().replace(/\s/g, "");

  let topicChunk = topic.split("/");
  let operation = "";
  let blindsName = topicChunk[1];

  if (topicChunk.length === 3 && topicChunk[topicChunk.length - 1] === "set") {
    operation = "commandTopic";
  } else if (
    topicChunk.length === 4 &&
    topicChunk[topicChunk.length - 1] === "set"
  ) {
    operation = "setPositionTopic";
  }

  if (blindsName === "available") {
    blindsName = null;
  } else if (blindsName === "cover") {
    blindsName = topic.split("/")[2];
  }

  return { payload, operation, blindsName };
};
