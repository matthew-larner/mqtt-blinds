import { IHub, IBlind, BlindRollerClient, UdpClient } from "../../contracts";
import * as logger from "../../lib/logger/logger";
import * as util from "../utils";
// prepare and send TCP command for set topic

// to be use if need to publish a message
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
  logger.info("send mqtt subscription topic " + payload);
  mqttClient.onPublish(_topic, payload);
};

function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

// prepare and send TCP command for config topic
export const commandTopic = (
  hub: IHub,
  blind: IBlind,
  blindRollerClient: BlindRollerClient[],
  topic: string,
  pload: string,
  mqttClient: any,
  protocol: string,
  udpClient: UdpClient[]
) => {
  const payload = isJsonString(pload)
    ? JSON.parse(pload.toLowerCase())
    : pload.toLowerCase();

  const validPayload = ["open", "close", "stop"];
  if (!validPayload.includes(payload)) {
    return logger.error('Only allowed: "open", "close", "stop"');
  }

  const action = payload === "open" ? "o" : payload === "close" ? "c" : "s";

  // send TCP Command
  const command = `!${hub.bridge_address}${blind.motor_address}${action};`;

  if (protocol.toLowerCase() === "udp") {
    udpClient[hub.bridge_address].send(command, (err: any) => {
      sendMqttMessage(mqttClient, topic, command, action);
    });
  } else {
    blindRollerClient[hub.bridge_address].write(command, (err: any) => {
      sendMqttMessage(mqttClient, topic, command, action);
    });
  }
};

export const setPositionTopic = (
  hub: IHub,
  blind: IBlind,
  blindRollerClient: BlindRollerClient[],
  topic: string,
  pload: string,
  mqttClient: any,
  protocol: string,
  udpClient: UdpClient[]
) => {
  const payload = isJsonString(pload)
    ? JSON.parse(pload.toLowerCase())
    : pload.toLowerCase();

  const num = Number(payload);

  if (isNaN(num) || typeof payload == "string") {
    return logger.error("not a number!");
  } else {
    if (num > 100 || num < 0) {
      return logger.error("Allowed range 0 to 100");
    }
  }
  const numberToSet: string = util.paddedNumber(parseInt(payload), 3);

  // send TCP Command

  const command = `!${hub.bridge_address}${blind.motor_address}m${numberToSet};`;

  if (protocol.toLowerCase() === "udp") {
    udpClient[hub.bridge_address].send(command, (err: any) => {
      sendMqttMessage(mqttClient, topic, command, numberToSet);
    });
  } else {
    blindRollerClient[hub.bridge_address].write(command, (err: any) => {
      sendMqttMessage(mqttClient, topic, command, numberToSet);
    });
  }
};
