import { RollerBlindHandler } from "../contracts";

import * as util from "./utils";
import { prePareAndValidateTopic } from "./utils";

export const udpRollerBlindsCommandsHandler = ({
  mqttClient,
  hubs,
  mqttConfig,
}: RollerBlindHandler) => {
  return async (data: Buffer) => {
    const message = data.toString().replace(/\s/g, "");

    const { blindName, position, action } = prePareAndValidateTopic(
      message,
      hubs
    );

    if (!blindName) {
      return console.error(
        `Can not continue!  bridge_address and motor_address not found! ${message}`
      );
    }

    const unique_id = blindName;
    let positionSet: string = "0";
    switch (action) {
      case "o":
        positionSet = "100";
        break;
      case "s":
        positionSet = "50";
        break;
      case "m":
        positionSet = position;
        break;
      default:
        positionSet = "0";
        break;
    }

    const topic = `${mqttConfig.topic_prefix}/${unique_id}/${positionSet}`;
    const payload = {
      position: positionSet,
    };
    console.info(`Blind-roller -> Publish: ${topic} : ${payload}`);
    mqttClient.onPublish(topic, JSON.stringify(payload));
  };
};