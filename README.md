# MQTT Blinds

A containerised app to control Acmeda/Dooya roller blinds via MQTT to be used with home automation like Home Assistant.

## How it works

This docker container communicates with motorised blinds via TCP commands. It supports 2-way communication (MQTT->TCP and TCP->MQTT). It will automatically create blinds/curtains in Home Assistant if you have [MQTT discovery enabled](https://www.home-assistant.io/docs/mqtt/discovery/).

## Setup Steps

1. Create a [MQTT server](https://hub.docker.com/_/eclipse-mosquitto)
2. Setup config file `configuration.yml` in `/config` directory (example below)
3. Setup docker compose file (example below)
4. Enable Home Assistant MQTT discovery if integrating with Home Assistant (optional): https://www.home-assistant.io/docs/mqtt/discovery/
5. Run the app by running `docker-compose up --build`

## Example Docker Compose File

```
version: '3'
services:
  mqtt-blinds:
    container_name: mqtt-blinds
    image: matthewlarner/mqtt-blinds:latest
    volumes:
      - ./config:/usr/src/app/config
    environment:
      - TZ=Australia/Sydney
    restart: always
```

## Example Config

```
# MQTT Settings
mqtt:
  broker: 192.168.1.102
  port: 1884
  username: xxxx
  password: xxxx
  qos: 2
  retain: true
  discovery: true
  discovery_prefix: homeassistant
  topic_prefix: mqtt-blinds
  availability_topic: mqtt-blinds/available

# Global Config for Motorised Blind Hub Communication
hub_communication:
  async: false
  timeout: 10 # seconds

# Motorised Blind Hubs
hubs:
  - host: 192.168.20.201
    port: 1487
    type: 'dooya'
    protocol: udp
    bridge_address: '123'
    blinds:
      - name: 'Bed 1 Roller Blind'
        type: 'blind'
        motor_address: 'D001'
        reverse_direction: false
      - name: 'Bed 1 Curtain'
        type: 'curtain'
        motor_address: 'D002'
        reverse_direction: true
  - host: 192.168.20.202
    port: 1487
    type: 'acmeda'
    protocol: tcp
    bridge_address: '' # Leave blank for Acmeda
    blinds:
      - name: 'Kitchen Roller Blind'
        type: 'blind'
        motor_address: 'L40'
        reverse_direction: false
      - name: 'Bed 4 Curtain'
        type: 'curtain'
        motor_address: '53T'
        reverse_direction: true
```

**Where:**

- `hub_communication.async`: retained for compatibility. Commands are now always processed in order per hub. Different hubs can process commands independently.
- `hub_communication.timeout`: seconds allowed for each connection/write/acknowledgement attempt. Defaults to 10 when missing or invalid.
- `hub.host/port` is the host/port of your blind hub
- `hub.type` is the brand of the blind hub. `acmeda` and `dooya` are supported.
- `hub.protocol` is the protocol to use when communication with the hub. Either `tcp` or `udp`.
- `hub.bridge_address` is the address of the blind hub. You can get this by polling your motorised blind hub/API.
- `blinds.name`: The name to be displayed in Home Assistant
- `blinds.type` is either: `blind` (a motorised roller blind), `curtain` (a motorised curtain or awning)
- `blinds.motor_address`: The address of the motor. You can get this by polling your motorised blind hub/API
- `blinds.reverse_direction`: If `true`, reverse the direction of up/open and down/closed.


## Command reliability

TCP commands wait for a connected controller and a matching command acknowledgement.
A failed command is retried up to three times. Commands expire 60 seconds after
being queued, including time spent waiting behind earlier commands, so an old
command is not executed much later. Failures are logged with the blind name.
Retries can repeat a command if its acknowledgement was lost.

The bridge accepts controller command echoes, including signal metadata such as
`!NOCo,R7D;`, or a matching final position report. An acknowledgement confirms
receipt only. Home Assistant positions update from `r` position reports, not
from the requested target or a stop acknowledgement. TCP replies are buffered
and split at message boundaries.

TCP cover availability requires both the MQTT bridge and that cover's controller
to be connected. UDP has no persistent connection, so its availability still
tracks the MQTT bridge; a successful UDP send does not confirm device receipt.

## Development checks

Run `npm ci`, then `npm test` to compile and run the regression tests. These tests
use simulated connections and do not contact Home Assistant or any blinds.
Container builds also run these tests before producing an image.
