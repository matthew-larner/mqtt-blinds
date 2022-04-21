import { RollerBlindHandler } from "../contracts";

import * as util from "./utils";

export const rollerBlindsCommandsHandler = ({
  mqttClient,
  hubs,
  mqttConfig,
}: RollerBlindHandler) => {
  return async (data: Buffer) => {
    const message = data.toString().replace(/\s/g, "");

    const parts = message.split("|");

    const bridge_address = parts[1];
    const motor_address = parts[2];
    const action = parts[3];
    const position = parts[4];

    //const clean = message.replace(/\|/g, ""); // remove separator

    const { hub, blind } = util.getRoller(hubs, bridge_address, motor_address);

    if (!hub || !blind) {
      // thi means bridge_address and or motor_address is not found in configuration.yml
      throw new Error("Invalid Command");
    }

    const unique_id = util.toSnakeCase(blind.name);
    let positionSet: string = "0";
    switch (action.toLocaleLowerCase()) {
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
