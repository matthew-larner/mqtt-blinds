import { OnMessageCallback } from "mqtt";

export interface MqttClient {
  onMessage: (callback: OnMessageCallback) => void;
  onPublish: (topic: string, payload: string) => void;
}

export interface BlindRollerClient {
  onMessage: (callback: (data: Buffer) => void) => void;
  write: (data: any, cb?: (error?: Error) => void) => void;
}

export interface Handler {
  mqttClient: MqttClient;
  blindRollerClient: BlindRollerClient;
  hub?: any;
  mqttConfig?: any;
  bridge_address?: any;
}
