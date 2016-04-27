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


  this.getSysexImpulseTemplate = function(padsMidiChannel, keyboardMidiChannel) {
    padsMidiChannel = padsMidiChannel || '00';
    var zone1MidiChannel = keyboardMidiChannel || '00';
    var zone2MidiChannel = keyboardMidiChannel || '01';
    var zone3MidiChannel = keyboardMidiChannel || '02';
    var zone4MidiChannel = keyboardMidiChannel || '03';
    keyboardMidiChannel = keyboardMidiChannel || '00';

    var message = this.sysexHeader + '00 00 ';
    message += this.title.toHex(8);

    // 00 == keyboard midi channel
    // keyboard midi port: 03 = all, 02 == midi, 01 == usb, 04 == off
    message += keyboardMidiChannel + ' 03 ';

    // keyboard velocity curve 01-03, see impulse documentation
    // Aftertouch on/off (00/01)
    message += '02 01 ';

    var octave = '40';
    // The currently selected octave: 0x3C-0x45 == C-2 to C7
    // The transpose value, +-11 is possible, 0x0B == 0, 0x00 == -11, 0x16 == +11
    message += octave + ' 0B ';

    // keyboard zones on/off == 00/01
    message += '00 ';

    // zone 1 start note, 24 == c1
    // zone 1 end note
    // zone 1 octave, 40 == 0
    // zone 1 midi channel, 00 == channel 1, 10 == from template
    // zone 1 midi ports, see keyboard midi ports
    message += '24 3B 40 ' + zone1MidiChannel + ' 00 ';

    // zone 2 start note, 24 == c1
    // zone 2 end note
    // zone 2 octave, 40 == 0
    // zone 2 midi channel, 00 == channel 1, 10 == from template
    // zone 2 midi ports, see keyboard midi ports
    message += '3d 60 40 ' + zone2MidiChannel + ' 00 ';

    // zone 3 start note, 24 == c1
    // zone 3 end note
    // zone 3 octave, 40 == 0
    // zone 3 midi channel, 00 == channel 1, 10 == from template
    // zone 3 midi ports, see keyboard midi ports
    message += '24 54 40 ' + zone3MidiChannel + ' 04 ';

    // zone 4 start note, 24 == c1
    // zone 4 end note
    // zone 4 octave, 40 == 0
    // zone 4 midi channel, 00 == channel 1, 10 == from template
    // zone 4 midi ports, see keyboard midi ports
    message += '24 54 40 ' + zone4MidiChannel + ' 04 ';

    // Rotary encoder settings 
    message += '09 ' + this.midiRotaries.rotary1 + ' 7F 00 10 08 01 ';
    message += '09 ' + this.midiRotaries.rotary2 + ' 7F 00 10 08 01 ';
    message += '09 ' + this.midiRotaries.rotary3 + ' 7F 00 10 08 01 ';
    message += '09 ' + this.midiRotaries.rotary4 + ' 7F 00 10 08 01 ';
    message += '09 ' + this.midiRotaries.rotary5 + ' 7F 00 10 08 01 ';
    message += '09 ' + this.midiRotaries.rotary6 + ' 7F 00 10 08 01 ';
    message += '09 ' + this.midiRotaries.rotary7 + ' 7F 00 10 08 01 ';
    message += '09 ' + this.midiRotaries.rotary8 + ' 7F 00 10 08 01 ';

    // offset 98, 254 chars

    // Pads
    // 08: type of midi message to send, 08 == note on/off, 09 == cc,
    //     0x0a == rpn, 0x0b == nrpn, 11 == cc
    // 44 = midi note, cc# or  msb if (n)rpn
    // 7F Max value/pressure 
    // 00 Min value/pressure
    // Midi port + channel: First nibble == port 6 == all, 4 == usb, 2 == midi, 1== tpl
    //                      seconds nibble midi channel 00 == ch1, 01 == ch2,...
    //                      setting the port to tpl forces the midi channel to tpl
    //                      ignoring the value we give.
    // 08 == lsb if (n)rpn
    // 01 ??
    message += '08 44 7F 00 10 08 01 ';
    message += '08 45 7F 00 10 08 01 ';
    message += '08 47 7F 00 10 08 01 ';
    message += '08 48 7F 00 10 08 01 ';
    message += '08 3C 7F 00 10 08 01 ';
    message += '08 3E 7F 00 10 08 01 ';
    message += '08 40 7F 00 10 08 01 ';
    message += '08 41 7F 00 10 08 01 ';


    // My guess is that these values are for the 49/61 key versions which come
    // with additional 9 faders + 9 buttons (8 + master).
    message += '09 29 7F 00 10 08 01 ';
    message += '09 2A 7F 00 10 08 01 ';
    message += '09 2B 7F 00 10 08 01 ';
    message += '09 2C 7F 00 10 08 01 ';
    message += '09 2D 7F 00 10 08 01 ';
    message += '09 2E 7F 00 10 08 01 ';
    message += '09 2F 7F 00 10 08 01 ';
    message += '09 30 7F 00 10 08 01 ';
    message += '09 31 7F 00 10 08 01 ';

    message += '11 33 7F 00 10 08 01 ';
    message += '11 34 7F 00 10 08 01 ';
    message += '11 35 7F 00 10 08 01 ';
    message += '11 36 7F 00 10 08 01 ';
    message += '11 37 7F 00 10 08 01 ';
    message += '11 38 7F 00 10 08 01 ';
    message += '11 39 7F 00 10 08 01 ';
    message += '11 3A 7F 00 10 08 01 ';
    message += '11 3B 7F 00 10 08 01 ';

    // This could be the page up/down button which the impulse 25 does not have.
    message += '09 01 7F 00 10 08 01 ';

    message += 'F7';

    println(message);
    return message;
  };

  this.toShiftMode = function() {
    // Set keyboard and pads to channel 16 which we told bitwig to ignore.
    sendSysex(this.getSysexImpulseTemplate('0f', '0f'));
  };

  this.toRegularMode = function() {
    sendSysex(this.getSysexImpulseTemplate());
  };

  this.init(config);
  this.toRegularMode();
}