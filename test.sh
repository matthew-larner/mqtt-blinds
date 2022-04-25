#! /bin/sh

# UDP Protocol
#test for command topic
mosquitto_pub -h 127.0.0.1 -t mqtt-blinds/bed_1_roller_blind/set -m 'opn'

#test for set position topic
mosquitto_pub -h 127.0.0.1 -t mqtt-blinds/bed_1_roller_blind/position/set -m '50'


# TCP Protocol
#test for command topic
mosquitto_pub -h 127.0.0.1 -t mqtt-blinds/bed_4_curtain/set -m 'close'

#test for set position topic
mosquitto_pub -h 127.0.0.1 -t mqtt-blinds/bed_4_curtain/position/set -m '40'


