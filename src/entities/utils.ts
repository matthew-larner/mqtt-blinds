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

export const preparePayload = async (topic: string, message, hubs) => {
  const blinds = [];
  for (let i = 0; i < hubs.length; i++) {
    const bridge_address = hubs[i].bridge_address;

    const res = hubs[i].blinds.map((b) => {
      return {
        protocol: hubs[i].protocol,
        address: `${bridge_address}${b.motor_address}`,
        name: toSnakeCase(b.name),
      };
    });

    blinds.push(...res);
  }

  const payload = message.toString().replace(/\s/g, "");

  let topicChunk = topic.split("/");
  let operation = "";
  let blindsName = topicChunk[1];

  let protocol = blinds.find((item) => item.name === `${blindsName}`)?.protocol;

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

  return { payload, operation, blindsName, protocol };
};

export const prePareAndValidateTopic = (message: string, hubs: any) => {
  const blinds = [];
  for (let i = 0; i < hubs.length; i++) {
    const bridge_address = hubs[i].bridge_address;

    const res = hubs[i].blinds.map((b) => {
      return {
        address: `${bridge_address}${b.motor_address}`,
        name: toSnakeCase(b.name),
      };
    });

    blinds.push(...res);
  }

  let cleanTopic = message.replace(/[,;! ]+/g, "").trim(); // clean

  // check if command topic or set position topic
  // get last string
  const ls = cleanTopic[cleanTopic.length - 1];

  let keyword = "";
  let position: any = 0;
  let action = ls;
  if (isNaN(Number(ls))) {
    // for command topic.  strip last string to be use as keyword

    keyword = cleanTopic.slice(0, -1);
  } else {
    //set position topic, trip last 4 string to be use as keyword
    action = "m";
    keyword = cleanTopic.slice(0, -4);
    position = cleanTopic.slice(-3);
  }

  let blind = blinds.find((item) => item.address === keyword);
  let blindName = blind?.name;

  cleanTopic = `!${cleanTopic};`; // return required character that temporary removed

  // get bridge_address and motor_address

  return { blindName, position, action };
};
