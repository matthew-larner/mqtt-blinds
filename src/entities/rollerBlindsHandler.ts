import { RollerBlindHandler } from "../contracts";

import * as util from "./utils";

export const commandsHandler =
  ({ mqttClient, hubs, mqttConfig }: RollerBlindHandler) =>
  async (data: Buffer) => {
    const message = data.toString().replace(/\s/g, "");
    const bridge_address = message.substring(1, 4);
    const motor_address = message.substring(4, 7);
    const action = message.substring(7, 8);
    const position = message.substring(8, 11);

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
