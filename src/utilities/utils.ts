import * as YAML from "yaml";
import * as fs from "fs";
import { IHub } from "../contracts";
import { CommandOnQueue, ReceivedResponse, RequestIds } from "../lib/Global";
import * as logger from "../lib/logger/logger";

let inProcess = false;

export const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

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

export const getRollerByName = (hubs: IHub[], blindName: string) => {
  const hub = hubs.find((hub) => {
    return hub.blinds.find((blind) => toSnakeCase(blind.name) === blindName);
  });

  const blind = hub.blinds.find(
    (item: any) => toSnakeCase(item.name) == blindName
  );

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

export const queuer = async (
  func1: Function,
  func2: Function,
  tries: number,
  command: string,
  isAsync: boolean
) => {
  let next = false; //TODO : add async contition here
  let requested = false;
  let tries_ = tries;
  let tryCount = 0;

  do {
    const pendingResponse = RequestIds.indexOf(command) !== -1;

    if (!pendingResponse) {
      next = true;
    }

    tries--;
    tryCount++;

    if (!requested) {
      console.info(`* * * * * Sending request try(${tryCount}) for `, command);
      func1();
      requested = true;
    } else if (!next) {
      console.log(
        `* * * * * Waiting reply from server... ${tryCount} for `,
        command
      );
    }

    if (tries <= 0 || next) {
      const index = RequestIds.indexOf(command);
      if (index !== -1) {
        RequestIds.splice(index, 1); // 2nd parameter means remove one item only
      }

      if (pendingResponse) {
        return false;
      }
      func2();
      return true;
    }
    // once second every retry
    await stall(1000);
  } while (!next && !isAsync);
};

export const FileParser = async (fileUrl: string) => {
  return {
    readFile: () => YAML.parse(fs.readFileSync(fileUrl, "utf8")),
  };
};

export const stall = async (stallTime = 3000) => {
  await new Promise((resolve) => setTimeout(resolve, stallTime));
};

export const looper = async (isAsync: boolean) => {
  let times = 20;

  for (let x = 0; x < CommandOnQueue.length; x++) {
    let serverResponse = "";
    let tries = times;
    if (inProcess) {
      console.log("Still in process!. message put in queue...");
      return;
    }

    CommandOnQueue[x].func1();

    if (CommandOnQueue.length < 1) return;
    for (let i = 0; i < times; i++) {
      inProcess = true;
      if (!isAsync) await stall(1000);

      if (!isAsync)
        console.log(
          `Waiting to received ${CommandOnQueue[x].command} from TCP Server...(${tries})`
        );

      if (ReceivedResponse.indexOf(CommandOnQueue[x].command) !== -1) {
        serverResponse = ReceivedResponse[0];
        ReceivedResponse.splice(CommandOnQueue[x].command);
        CommandOnQueue[x].func2();
        break;
      }
      tries--;
    }
    if (!isAsync) {
      if (serverResponse) {
        logger.info(`>>>>> Server responded! -> ${serverResponse}`);
      } else {
        logger.error(`!!!!! No response from server!`);
      }
    }
    inProcess = false;
  }
};
