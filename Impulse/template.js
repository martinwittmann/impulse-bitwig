function ImpulseTemplate(config) {
  /*
    Midi channel:
      0x00 == ch1
      0x01 == ch2
      ...
      0x10 == Use from template
  */

  /*
    Midi port:
    0x00 == From template
    0x01 == Usb
    0x02 == Midi
    0x03 = All
    0x04 == Off
  */

  /*
    Keyboard velocity curve:
    0x01 == Soft
    0x02 == Medium
    0x03 == Hard
  */

  /*
    Aftertouch
    0x01 == On
    0x00 == Off
  */

  /*
    Octave:
    0x3C == C-2
    0x3D == C-1
    0x3E == C0
    0x3F == C1
    0x40 == C2
    0x41 == C3
    0x42 == C4
    0x43 == C5
    0x44 == C6
    0x45 == C7
  */

  /*
    Transpose:
    0x00 == -11 semitones
    0x01 == -10 semitones
    0x0B == +-0 semitones
    0x0C == +01 semitoneS
    0x0D == +02 semitones
    0x16 == +11 semitones
  */

  /*
    Activate Zones
    0x00 == Off
    0x01 == On
  */

  /*
    Rotary encoders, pads and faders:
    [type] [note/cc/msb] [max value] [min value] [midi port + channel] [lsb] [unknown]
    
    Type of midi message:
    0x08 == Note on/off
    0x09 == CC
    0x0A == RPN
    0x0B == NRPN
    0x11 == CC (this is used in parts of the default templates)

    Note / CC# / MSB
    Depending on type

    Max value/pressure 
    0x00 - 0x7F (0-127)

    Min value/pressure
    0x00 - 0x7F (0-127)

    Midi port + channel:
      First nibble == port
      0x6? == All
      0x4? == Usb
      0x2? == Midi
      0x1? == From template

      Second nibble == midi channel
      0x?0 == Channel 1
      0x01 == Channel 2
      ...
      0x10 == From template

      Setting the midi port to template forces the midi channel to template too,
      ignoring the value we give.

    LSB (if type == rpn or nrpn)

    Unknown (default == 0x01):
      I did not find any value corresponding to this and changing it to anything
      else did not make any difference I could make out. 
  */

  // We need to set which cc values are to be sent for the rotary controllers
  // when the rotary state is midi. (in the other states - plugin and mixer -
  // the impulse does not allow us to define this)
  // The reason why we need to overwrite the defaults is that in the default
  // impulse template (BascMidi) the midi rotaries 7 and 8 use the exact same
  // cc values as the rewind and forward buttons, so we cant differentiate them.

  this.header = 'F0 00 20 29 43 00 00';

  this.data = {
      title: 'Bitwig',
      keyboardMidiChannel: '00',
      keyboardMidiPort: '03',
      keyboardVelocity: '02',
      aftertouch: '01',
      octave: '40',
      transpose: '0B',

      activateZones: '00',

      zone1StartNote: '24',
      zone1EndNote: '3B',
      zone1Octave: '40',
      zone1MidiChannel: '00',
      zone1MidiPort: '00',

      zone2StartNote: '3D',
      zone2EndNote: '60',
      zone2Octave: '40',
      zone2MidiChannel: '01',
      zone2MidiPort: '00',

      zone3StartNote: '24',
      zone3EndNote: '54',
      zone3Octave: '40',
      zone3MidiChannel: '02',
      zone3MidiPort: '10',

      zone4StartNote: '24',
      zone4EndNote: '54',
      zone4Octave: '40',
      zone4MidiChannel: '03',
      zone4MidiPort: '10',

      rotary1MessageType: '09',
      rotary1Note: '32',
      rotary1MaxValue: '7F',
      rotary1MinValue: '00',
      rotary1MidiPortAndChannel: '10',
      rotary1Lsb: '08',
      rotary1Unknown: '01',

      rotary2MessageType: '09',
      rotary2Note: '33',
      rotary2MaxValue: '7F',
      rotary2MinValue: '00',
      rotary2MidiPortAndChannel: '10',
      rotary2Lsb: '08',
      rotary2Unknown: '01',

      rotary3MessageType: '09',
      rotary3Note: '34',
      rotary3MaxValue: '7F',
      rotary3MinValue: '00',
      rotary3MidiPortAndChannel: '10',
      rotary3Lsb: '08',
      rotary3Unknown: '01',

      rotary4MessageType: '09',
      rotary4Note: '35',
      rotary4MaxValue: '7F',
      rotary4MinValue: '00',
      rotary4MidiPortAndChannel: '10',
      rotary4Lsb: '08',
      rotary4Unknown: '01',

      rotary5MessageType: '09',
      rotary5Note: '36',
      rotary5MaxValue: '7F',
      rotary5MinValue: '00',
      rotary5MidiPortAndChannel: '10',
      rotary5Lsb: '08',
      rotary5Unknown: '01',

      rotary6MessageType: '09',
      rotary6Note: '37',
      rotary6MaxValue: '7F',
      rotary6MinValue: '00',
      rotary6MidiPortAndChannel: '10',
      rotary6Lsb: '08',
      rotary6Unknown: '01',

      rotary7MessageType: '09',
      rotary7Note: '38',
      rotary7MaxValue: '7F',
      rotary7MinValue: '00',
      rotary7MidiPortAndChannel: '10',
      rotary7Lsb: '08',
      rotary7Unknown: '01',

      rotary8MessageType: '09',
      rotary8Note: '39',
      rotary8MaxValue: '7F',
      rotary8MinValue: '00',
      rotary8MidiPortAndChannel: '10',
      rotary8Lsb: '08',
      rotary8Unknown: '01',

      pad1MessageType: '09',
      pad1Note: '44',
      pad1MaxValue: '7F',
      pad1MinValue: '00',
      pad1MidiPortAndChannel: '10',
      pad1Lsb: '08',
      pad1Unknown: '01',

      pad2MessageType: '09',
      pad2Note: '45',
      pad2MaxValue: '7F',
      pad2MinValue: '00',
      pad2MidiPortAndChannel: '10',
      pad2Lsb: '08',
      pad2Unknown: '01',

      pad3MessageType: '09',
      pad3Note: '47',
      pad3MaxValue: '7F',
      pad3MinValue: '00',
      pad3MidiPortAndChannel: '10',
      pad3Lsb: '08',
      pad3Unknown: '01',

      pad4MessageType: '09',
      pad4Note: '48',
      pad4MaxValue: '7F',
      pad4MinValue: '00',
      pad4MidiPortAndChannel: '10',
      pad4Lsb: '08',
      pad4Unknown: '01',

      pad5MessageType: '09',
      pad5Note: '3C',
      pad5MaxValue: '7F',
      pad5MinValue: '00',
      pad5MidiPortAndChannel: '10',
      pad5Lsb: '08',
      pad5Unknown: '01',

      pad6MessageType: '09',
      pad6Note: '3E',
      pad6MaxValue: '7F',
      pad6MinValue: '00',
      pad6MidiPortAndChannel: '10',
      pad6Lsb: '08',
      pad6Unknown: '01',

      pad7MessageType: '09',
      pad7Note: '40',
      pad7MaxValue: '7F',
      pad7MinValue: '00',
      pad7MidiPortAndChannel: '10',
      pad7Lsb: '08',
      pad7Unknown: '01',

      pad8MessageType: '09',
      pad8Note: '41',
      pad8MaxValue: '7F',
      pad8MinValue: '00',
      pad8MidiPortAndChannel: '10',
      pad8Lsb: '08',
      pad8Unknown: '01',

      // These faders (except the master fader) are only available on the 49 and 61 key versions.
      fader1MessageType: '09',
      fader1CC: '29',
      fader1MaxValue: '7F',
      fader1MinValue: '00',
      fader1MidiPortAndChannel: '10',
      fader1Lsb: '08',
      fader1Unknown: '01',

      fader2MessageType: '09',
      fader2CC: '2A',
      fader2MaxValue: '7F',
      fader2MinValue: '00',
      fader2MidiPortAndChannel: '10',
      fader2Lsb: '08',
      fader2Unknown: '01',

      fader3MessageType: '09',
      fader3CC: '2B',
      fader3MaxValue: '7F',
      fader3MinValue: '00',
      fader3MidiPortAndChannel: '10',
      fader3Lsb: '08',
      fader3Unknown: '01',

      fader4MessageType: '09',
      fader4CC: '2C',
      fader4MaxValue: '7F',
      fader4MinValue: '00',
      fader4MidiPortAndChannel: '10',
      fader4Lsb: '08',
      fader4Unknown: '01',

      fader5MessageType: '09',
      fader5CC: '2D',
      fader5MaxValue: '7F',
      fader5MinValue: '00',
      fader5MidiPortAndChannel: '10',
      fader5Lsb: '08',
      fader5Unknown: '01',

      fader6MessageType: '09',
      fader6CC: '2E',
      fader6MaxValue: '7F',
      fader6MinValue: '00',
      fader6MidiPortAndChannel: '10',
      fader6Lsb: '08',
      fader6Unknown: '01',

      fader7MessageType: '09',
      fader7CC: '2F',
      fader7MaxValue: '7F',
      fader7MinValue: '00',
      fader7MidiPortAndChannel: '10',
      fader7Lsb: '08',
      fader7Unknown: '01',

      fader8MessageType: '09',
      fader8CC: '30',
      fader8MaxValue: '7F',
      fader8MinValue: '00',
      fader8MidiPortAndChannel: '10',
      fader8Lsb: '08',
      fader8Unknown: '01',

      masterFaderMessageType: '09',
      masterFaderCC: '31',
      masterFaderMaxValue: '7F',
      masterFaderMinValue: '00',
      masterFaderMidiPortAndChannel: '10',
      masterFaderLsb: '08',
      masterFaderUnknown: '01',

      // These controls are not in use on the Impulse 25 (the only one I own).
      // But since there's 9 of them and the 49 and 61 key version have 9 additional
      // solo/mute buttons, these values are most probably for them.
      fader1BtnMessageType: '11',
      fader1BtnCC: '33',
      fader1BtnMaxValue: '7F',
      fader1BtnMinValue: '00',
      fader1BtnMidiPortAndChannel: '10',
      fader1BtnLsb: '08',
      fader1BtnUnknown: '01',

      fader2BtnMessageType: '11',
      fader2BtnCC: '34',
      fader2BtnMaxValue: '7F',
      fader2BtnMinValue: '00',
      fader2BtnMidiPortAndChannel: '10',
      fader2BtnLsb: '08',
      fader2BtnUnknown: '01',

      fader3BtnMessageType: '11',
      fader3BtnCC: '35',
      fader3BtnMaxValue: '7F',
      fader3BtnMinValue: '00',
      fader3BtnMidiPortAndChannel: '10',
      fader3BtnLsb: '08',
      fader3BtnUnknown: '01',

      fader4BtnMessageType: '11',
      fader4BtnCC: '36',
      fader4BtnMaxValue: '7F',
      fader4BtnMinValue: '00',
      fader4BtnMidiPortAndChannel: '10',
      fader4BtnLsb: '08',
      fader4BtnUnknown: '01',

      fader5BtnMessageType: '11',
      fader5BtnCC: '37',
      fader5BtnMaxValue: '7F',
      fader5BtnMinValue: '00',
      fader5BtnMidiPortAndChannel: '10',
      fader5BtnLsb: '08',
      fader5BtnUnknown: '01',

      fader6BtnMessageType: '11',
      fader6BtnCC: '38',
      fader6BtnMaxValue: '7F',
      fader6BtnMinValue: '00',
      fader6BtnMidiPortAndChannel: '10',
      fader6BtnLsb: '08',
      fader6BtnUnknown: '01',

      fader7BtnMessageType: '11',
      fader7BtnCC: '39',
      fader7BtnMaxValue: '7F',
      fader7BtnMinValue: '00',
      fader7BtnMidiPortAndChannel: '10',
      fader7BtnLsb: '08',
      fader7BtnUnknown: '01',

      fader8BtnMessageType: '11',
      fader8BtnCC: '3A',
      fader8BtnMaxValue: '7F',
      fader8BtnMinValue: '00',
      fader8BtnMidiPortAndChannel: '10',
      fader8BtnLsb: '08',
      fader8BtnUnknown: '01',

      masterFaderBtnMessageType: '11',
      masterFaderBtnCC: '3B',
      masterFaderBtnMaxValue: '7F',
      masterFaderBtnMinValue: '00',
      masterFaderBtnMidiPortAndChannel: '10',
      masterFaderBtnLsb: '08',
      masterFaderBtnUnknown: '01',

      // This could be the page up/down button which the impulse 25 does not have.
      // But there are 2 separate buttons, so why only 1 set of control values?
      bankUpDownMessageType: '09',
      bankUpDownCC: '01',
      bankUpDownMaxValue: '7F',
      bankUpDownMinValue: '00',
      bankUpDownMidiPortAndChannel: '10',
      bankUpDownLsb: '08',
      bankUpDownUnknown: '01',
  };

  this.init = function(config) {
    for (var property in config) {
      this.data[property] = config[property];
    }
  };

  this.getTemplate = function(config, isShiftState) {
    config = config || {};
    isShiftState = isShiftState || false;
    var result = this.header, setting;

    for (var property in this.data) {
      // In shift state we set everything to FF assuming that the invalid value
      // does not overwrite any existing value.
      setting = isShiftState ? '80' : this.data[property];
      if ('undefined' != typeof config[property]) {
        setting = config[property];
      }

      if ('title' == property) {
        setting = setting.toHex(8);
      }

      if (setting) {
        result += ' ' + setting;
      }
    }
    return result + ' F7';
  };

  this.sendTemplateToDevice = function(template) {
    sendSysex(template);
  };

  this.init(config);
  this.sendTemplateToDevice(this.getTemplate());
}