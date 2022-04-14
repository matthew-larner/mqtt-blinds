#! /bin/sh

#testing subrcription: set position
mosquitto_pub -h 127.0.0.1 -t 123/D001/mqtt-blinds/bed_1_roller_blind/set -m '40'

#testing subrcription: close command
mosquitto_pub -h 127.0.0.1 -t 123/D002/homeassistant/cover/bed_1_curtain/config -m 'close'

#testing subrcription: open command
mosquitto_pub -h 127.0.0.1 -t 123/D002/homeassistant/cover/bed_1_curtain/config -m 'open'
