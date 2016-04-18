function ImpulseTemplate(config) {
  this.title = 'Bitwig';
  this.midiRotaries = {
    rotary1:        32,
    rotary2:        33,
    rotary3:        34,
    rotary4:        35,
    rotary5:        36,
    rotary6:        37,
    rotary7:        38,
    rotary8:        39
  };
  this.sysexHeader = 'F0 00 20 29 43 ';

  this.init = function(config) {
    if (config.title) {
      this.title = config.title;
    }

    // The title must be exactly 8 characters.
    this.title = this.title.forceLength(8);

    if (config.midiRotaries) {
      this.midiRotaries = config.midiRotaries;
    }

    // We need to set which cc values are to be sent for the rotary controllers
    // when the rotary state is midi. (in the other states - plugin and mixer -
    // the impulse does not allow us to define this)
    // The reason why we need to overwrite the defaults is that in the default
    // impulse template (BascMidi) the midi rotaries 7 and 8 use the exact same
    // cc values as the rewind and forward buttons, so we cant differentiate them.
  };

  this.getSysexImpulseTemplate = function() {
    var message = this.sysexHeader + '00 00 ';
    message += this.title.toHex(8);

    message += '00 03 02 01 40 0B 00 24 3B 40 00 00 3C 60 40 01 00 24 54 40 10 04 24 54 40 10 04 09 ';
    message += this.midiRotaries.rotary1 + ' ';
    message += '7F 00 10 08 01 09 ';
    message += this.midiRotaries.rotary2 + ' ';
    message += '7F 00 10 08 01 09 ';
    message += this.midiRotaries.rotary3 + ' ';
    message += '7F 00 10 08 01 09 ';
    message += this.midiRotaries.rotary4 + ' ';
    message += '7F 00 10 08 01 09 ';
    message += this.midiRotaries.rotary5 + ' ';
    message += '7F 00 10 08 01 09 ';
    message += this.midiRotaries.rotary6 + ' ';
    message += '7F 00 10 08 01 09 ';
    message += this.midiRotaries.rotary7 + ' ';
    message += '7F 00 10 08 01 09 ';
    message += this.midiRotaries.rotary8 + ' ';
    message += ' 7F 00 10 08 01 08 43 7F 00 10 08 01 08 45 7F 00 10 08 01 08 47 7F 00 10 08 01 08 48 7F 00 10 08 01 08 3C 7F 00 10 08 01 08 3E 7F 00 10 08 01 08 40 7F 00 10 08 01 08 41 7F 00 10 08 01 09 29 7F 00 10 08 01 09 2A 7F 00 10 08 01 09 2B 7F 00 10 08 01 09 2C 7F 00 10 08 01 09 2D 7F 00 10 08 01 09 2E 7F 00 10 08 01 09 2F 7F 00 10 08 01 09 30 7F 00 10 08 01 09 31 7F 00 10 08 01 11 33 7F 00 10 08 01 11 34 7F 00 10 08 01 11 35 7F 00 10 08 01 11 36 7F 00 10 08 01 11 37 7F 00 10 08 01 11 38 7F 00 10 08 01 11 39 7F 00 10 08 01 11 3A 7F 00 10 08 01 11 3B 7F 00 10 08 01 09 01 7F 00 10 08 01 F7';

    return message;
  };

  this.init(config);
  sendSysex(this.getSysexImpulseTemplate());
}