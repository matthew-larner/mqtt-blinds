import { Handler } from "../contracts";

import * as util from "./utils";

export const commandsHandler =
  ({ mqttClient, blindRollerClient, hub, mqttConfig }: Handler) =>
  (data: Buffer) => {
    console.info(
      "ReceivedX mqtt-blind message:",
      data.toString().replace(/\s/g, "")
    );
  };
