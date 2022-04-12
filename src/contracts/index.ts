import { OnMessageCallback } from "mqtt";

export interface MqttClient {
  onMessage: (callback: OnMessageCallback) => void;
  publish: (topic: string, payload: string) => void;
}

export interface BlindRollerClient {
  onMessage: (callback: (data: Buffer) => void) => void;
  write: (data: Buffer, cb?: (error?: Error) => void) => void;
}

export interface Handler {
  mqttClient: MqttClient;
  blindRollerClient: BlindRollerClient;
  hubs?: any;
  mqttConfig?: any;
}
