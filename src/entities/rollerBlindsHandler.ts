import { Handler } from "../contracts";

import * as util from "./utils";

export const commandsHandler =
  ({ mqttClient, blindRollerClient, hub, mqttConfig }: Handler) =>
  (data: Buffer) => {
    logger.info(
      "ReceivedX mqtt-blind message:",
      data.toString().replace(/\s/g, "")
    );
  };
