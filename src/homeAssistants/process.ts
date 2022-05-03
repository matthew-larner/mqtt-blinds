import { IHub, IBlind, BlindRollerClient, UdpClient } from "../contracts";
import { RequestIds } from "../lib/Global";
import * as logger from "../lib/logger/logger";

import { isJsonString, paddedNumber, queuer } from "../utilities/utils";

export const setCommandTopic = async (
  hub: IHub,
  blind: IBlind,
  blindRollerClient: BlindRollerClient[],
  topic: string,
  pload: string,
  mqttClient: any,
  protocol: string,
  udpClient: UdpClient[],
  isAsync: boolean,
  timeout: number,
  operation
): Promise<string> => {
  const payload = isJsonString(pload)
    ? JSON.parse(pload.toLowerCase())
    : pload.toLowerCase();

  let result: any = prepareSetPositionTopicCommand(
    payload,
    hub.bridge_address,
    blind.motor_address
  );
  if (operation === "commandTopic") {
    result = prepareCommandTopicCommand(
      payload,
      hub.bridge_address,
      blind.motor_address
    );
  }

  const { command, toSet } = result;

  RequestIds.push(command);

  if (protocol.toLowerCase() === "udp") {
    let tries = timeout;
    try {
      const queuerResponse = await queuer(
        () => udpClient[hub.bridge_address].send(command),
        () => sendMqttMessage(mqttClient, topic, command, toSet),
        tries,
        command,
        isAsync
      );
      if (queuerResponse) {
        return `>>>>> UDP Server response received! -> ${command}`;
      } else {
        return `>>>>> UDP Server response not yet received! -> ${command}`;
      }
    } catch (error) {
      console.error("UDP Send Error:", error);
    }
  } else if (protocol.toLowerCase() === "tcp") {
    let tries = timeout;
    try {
      const queuerResponse = await queuer(
        () => blindRollerClient[hub.bridge_address].write(command),
        () => sendMqttMessage(mqttClient, topic, command, toSet),
        tries,
        command,
        isAsync
      );
      // if (isAsync) {
      //   console.info(`Request sent to TCP Server! -> ${command}`);
      // } else
      if (queuerResponse) {
        console.info(`TCP Server response received! -> ${command}`);
      } else {
        console.info(`TCP Server response not yet received! -> ${command}`);
        return "TCP RESPONSE NOT YET REC";
      }
    } catch (error) {
      console.error("TCP Send Error:", error);
    }
  } else {
    console.error(`${protocol} is not supported!`);
  }
};

const sendMqttMessage = (
  mqttClient,
  _topic: string,
  action: string,
  blindName: string,
  position?: string
) => {
  let msg: Object;

  msg = {
    action,
    position,
  };

  const payload = JSON.stringify(msg);
  logger.info("********* send mqtt subscription topic " + payload);
  mqttClient.onPublish(_topic, payload);
};

const prepareSetPositionTopicCommand = (
  payload: string,
  bridge_address: string,
  motor_address: string
) => {
  const num = Number(payload);

  if (isNaN(num) || typeof payload == "string") {
    return logger.error("not a number!");
  } else {
    if (num > 100 || num < 0) {
      return logger.error("Allowed range 0 to 100");
    }
  }
  const numberToSet: string = paddedNumber(parseInt(payload), 3);

  // send TCP Command

  return {
    command: `!${bridge_address}${motor_address}m${numberToSet};`,
    toSet: numberToSet,
  };
};

const prepareCommandTopicCommand = (
  payload: string,
  bridge_address: string,
  motor_address: string
) => {
  const validPayload = ["open", "close", "stop"];
  if (!validPayload.includes(payload)) {
    return logger.error('Only allowed: "open", "close", "stop"');
  }

  const action = payload === "open" ? "o" : payload === "close" ? "c" : "s";

  // send TCP Command
  return {
    command: `!${bridge_address}${motor_address}${action};`,
    toSet: action,
  };
};
