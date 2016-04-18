load('Impulse.template.js');
var impulse25 = new BitwigController();

loadAPI(1.3);

// Define the device and make it available to Bitwig.
// According to the documentation this needs to be called from the global scope.
host.defineController(
  impulse25.device.vendor,
  impulse25.device.name,
  impulse25.device.version,
  impulse25.device.uuid
);

host.defineMidiPorts(impulse25.device.numMidiOutPorts, impulse25.device.numMidiInPorts);
host.addDeviceNameBasedDiscoveryPair(["Impulse", "MIDIIN2 (Impulse)"], ["Impulse"]);

function init() {
  impulse25.init();
}


function BitwigController() {

  this.defaultTemplateTitle = 'Bitwig';
  this.sysexHeader = 'F0 00 20 29 67';
  this.tracksPerPage = 8;

  // Device state values.
  this.shiftPressed = false;
  this.loopPressed = false;
  this.forwardPressed = false;
  this.rewindPressed = false;
  this.rotaryState = 'plugin';
  this.mixerPage = 0;
  this.mixerPages = ['Mixer', 'Pan', 'Send', 'Record', 'Solo', 'Mute'];

  this.midiRotary1Value = 0;
  this.midiRotary2Value = 0;
  this.midiRotary3Value = 0;
  this.midiRotary4Value = 0;
  this.midiRotary5Value = 0;
  this.midiRotary6Value = 0;
  this.midiRotary7Value = 0;
  this.midiRotary8Value = 0;

  this.index = 0;

  this.device = {
    vendor:           'Novation',
    name:             'Impulse 25',
    version:          '1.1',
    uuid:             '3B1F8670-2433-11E2-81C1-0800200C9A66',
    numMidiOutPorts:  2, 
    numMidiInPorts:   1, 
  };

  // Define all button codes.
  this.buttons = {
    play:           30,
    stop:           29,
    record:         32,
    rewind:         27,
    forward:        28,
    loop:           31,
    pageUp:         11,
    pageDown:       12,
    mixer:          09,
    plugin:         10,
    midi:           08,
    nextTrack:      37,
    prevTrack:      38,
    shift:          39
  };

  this.pads = {
    pad1:           40,
    pad2:           41,
    pad3:           42,
    pad4:           43,
    pad5:           44,
    pad6:           45,
    pad7:           46,
    pad8:           47
  };

  this.clips = {
    clip1:          60,
    clip2:          61,
    clip3:          62,
    clip4:          63,
    clip5:          64,
    clip6:          65,
    clip7:          66,
    clip8:          67
  };

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

  /*
  Colors:
    When the impulse is in clip launch mode (and only then), we can set the pad's
    colors by sending noteOn events: sendNoteOn(0xb0, 60 + [0-7], color);

  These are the available colors:
    0 off
    1 red dark
    2 red medium
    3 red full
    4 off
    5 == 1
    6 == 2
    7 == 3
    8 == red dark blinking
    9 == red medium1 blinking
    10 == red medium2 blinking
    11 == red full blinking
    12 == 8
    13 == 9
    14 == 10
    15 == 11
    16: green
    17 yellowish green
    18 light orange
    19 orange
    20 
    21 
    22 
    23 
    24 green blinking
    25 yellowish green blinking
    26 light orange blinking
    27 orange blinking
    28 
    29 
    30 
    31 
    32 green
    33 yellowish green
    34 greenish yellow
    35 yellow
    36
    37
    38
    39
    40 green blinking
    41 yellowish gree blinking
    42 greenish yellow blinking
    43 yellow blinking
    44
    45
    46
    47
    48 == 32
    49 == 33
    50...
    51
    52
    53
    54
    55
    56 == 40
    57 == 41
    58..
    59
    60
    61
    62
    63
    64 == 0
    65 == 1
    ...
  */

  var self = this;

  this.init = function() {

    // Map all device midi out ports to host in ports.
    for (var i=0;i<impulse25.device.numMidiOutPorts;i++) {
      host.getMidiInPort(i).setMidiCallback(this.onMidiEvent);
      host.getMidiInPort(i).setSysexCallback(this.onSysexEvent);
    }

    // Send host midi clock to device in ports.
    for (i=0;i<impulse25.device.numMidiInPorts;i++) {
      host.getMidiOutPort(i).setShouldSendMidiBeatClock(true);
    }

    // I'm not sure whether or not this is necessary.
    // I don't know what these values mean, but this make the impulse aware of
    // the connection with bitwig
    this.sysexHeader = 'F0 00 20 29 67';
    // 06  setting some state? at least leds and pc connection I know of.
    // 00/01.. sets midi status led below fader, if set to 00 the fader is not recognized.
    // 00 == plugin state, 01 == midi state; whats mixer?
    // 01 == create connection to bitwig, 00, anything else: no connection

    // first byte == action?
    // 06 == status,
    // 07 After setting this, the impulse shows transport messages when pressing transport buttons.
    // 08 == display text in text area on screen's top
    // 09 == display text in the big 3 charachter area

    //sendSysex(this.sysexHeader + "06 01 01 01 F7");

    // After setting this, the impulse shows transport messages when pressing transport buttons.

    this.template = new ImpulseTemplate({
      title: this.defaultTemplateTitle,
      midiRotaties: this.midiRotaties
    });

    //sendSysex(this.sysexHeader + "08 20 62 69 74 77 69 67 20 20 F7"); //bitwig string to display
    //sendSysex(this.sysexHeader + "08 31 2D 41 75 64 69 6F 20 20 20 20 20 20 20 20 20 F7"); // displaytest?

    // These values are copied from the original script.
    // I'm not sure, whether or why we need these values.
    var numSends = 2;
    var numScenes = 0;

    this.cursorTrack = host.createCursorTrack(numSends, numScenes);
    this.cursorDevice = host.createCursorDevice();
    this.trackBank = host.createMainTrackBank(this.tracksPerPage, 0, 0); // numTracks, numSends, numScenes
    this.transport = host.createTransport();
    this.application = host.createApplication();

    this.handleShiftPress(false); // Init the default shift state.

    //sendMidi(0xb1, this.buttons.plugin, 0x0); // Initialize the impulse on the device page.

    this.cursorTrack.addNameObserver(16, "", function(text) {
      self.templateTitle = text;
      self.displayText(text);
    });
  };

  this.getEventType = function(status, data1, data2) {
    if ((status == 0xb1 && data1 >= 0 && data1 <= 7) || (status == 0xb0 && data1 >= 71 && data1 <= 78)) {
      return 'rotary';
    }
    else if (status == 0xb0 || status == 0xb1) {
      return 'button';
    }
  };

  this.onMidiEvent = function(status, data1, data2) {
    printMidi(status, data1, data2);

    // I could not find documentation on what isChannelController checks,
    // but several controller scripts use it, so it looks like it's necessary.
    if (!isChannelController(status)) {
      return;
    }

    switch (self.getEventType(status, data1, data2)) {
      case 'rotary':
        self.handleRotaryChange(status, data1, data2);
        break;

      case 'button':
        self.handleButtonPress(status, data1, data2);
        break;
    }
  };

  this.onSysexEvent = function(data) {
    printSysex(data);

  };

  this.handleRotaryChange = function(status, data1, data2) {
    switch (this.rotaryState) {
      case 'plugin':
        this.handlePluginRotaryChange(status, data1, data2);
        break;

      case 'mixer':
        this.handleMixerRotaryChange(status, data1, data2);
        break;

      case 'midi':
        this.handleMidiRotarychange(status, data1, data2);
        break;
    }
  };

  this.handlePluginRotaryChange = function(status, data1, data2) {
    // Data1 is 0-7, so we can use it directly as index.
    var target;

    if (this.shiftPressed) {
      // We default to modifying macro values, and only modify plugin values
      // directly if shift is pressed.
      target = this.cursorDevice.getParameter(data1);
    }
    else {
      target = this.cursorTrack.getPrimaryInstrument().getMacro(data1).getAmount();
    }

    var delta = data2 - 64; // +/- 1 depending on direction
    target.inc(delta, 100); // The second parameter is the full range.
  };

  this.handleMixerRotaryChange = function(status, data1, data2) {
    // Data1 is 0-7, so we can use it as index in combination with the mixer page.
    var track = self.trackBank.getTrack(data1), target, delta;
    if (!track || !track.exists()) {
      return;
    }
    delta = data2 - 64;

    switch (this.mixerPage) {
      case 0:
        track.getVolume().inc(delta, 100);
        break;

      case 1:
        track.getPan().inc(delta, 100);
        break;

      case 2:
        target = track.getSend(0);
        if (target) {
          target.inc(delta, 100);
        }
        break;

      case 3:
        track.arm.set(delta > 0);
        break;

      case 4:
        track.solo.set(delta > 0);
        break;

      case 5:
        track.mute.set(delta > 0);
        break;
    }
  };

  this.handleMidiRotarychange = function (status, data1, data2) {
    // TODO: What should be modified when in midi mode?
    var target;
    var parameterIndex = data1 - 71;
    // Data1 is 71-78, so we subtract 71 to get 0-7.

    if (7 == parameterIndex) {
      // The last rotary does zooming.
      var delta = data2 - self.midiRotary8Value;
      self.midiRotary8Value += delta;
      if (delta > 0) {
        self.application.zoomIn();
      }
      else {
        self.application.zoomOut();
      }
    }
    else if (6 == parameterIndex) {
      var delta = data2 - self.midiRotary7Value;
      self.midiRotary7Value += delta;
      if (delta > 0) {
        self.application.arrowKeyRight();
      }
      else {
        self.application.arrowKeyLeft();
      }
    }

    // For plugin mode data1 is 0-7, but when in rotary state midi it's 21-28.
    // So we need to subtract 21 to get the correct index.
    // !!! NOTE: Suddenly this is not 21 but 71 and I don't know yet what caused the change

    // When in rotary state midi, data2 is an absolute midi value, so we
    // need to set it instead of incresing.
    // The set method (like the inc method) expects a range parameter.
    // This must be 128 because data2 is an absolute midi value (0-127) so it has 128 values.
    //target.set(data2, 128);
  };

  this.handleButtonPress = function(status, button, value) {

    switch (button) {
      case this.buttons.shift:
        this.handleShiftPress(value);
        break;

      case this.buttons.plugin:
        this.rotaryState = 'plugin';
        this.displayText(this.templateTitle);
        break;

      case this.buttons.mixer:
        this.rotaryState = 'mixer';
        this.displayText(this.mixerPages[0]);
        this.highlightModifyableTracks();
        break;

      case this.buttons.midi:
        this.displayText(this.defaultTemplateTitle);
        this.rotaryState = 'midi';
        break;

      case this.buttons.pageUp:
        switch (this.rotaryState) {
          case 'mixer':
            this.mixerPage++;
            if (this.mixerPage < 0) {
              this.mixerPage = this.mixerPages.length - 1;
            }
            else if (this.mixerPage >= this.mixerPages.length) {
              this.mixerPage = 0;
            }
            this.displayText(this.mixerPages[this.mixerPage]);
            this.highlightModifyableTracks();
            break;  
        }
        break;

      case this.buttons.pageDown:
        switch (this.rotaryState) {
          case 'mixer':
            this.mixerPage--;
            if (this.mixerPage < 0) {
              this.mixerPage = this.mixerPages.length - 1;
            }
            else if (this.mixerPage >= this.mixerPages.length) {
              this.mixerPage = 0;
            }
            this.displayText(this.mixerPages[this.mixerPage]);
            this.highlightModifyableTracks();
            break;  
        }
        break;

      case this.buttons.rewind:
        this.rewindPressed = !!value;


        if (!!value) {
          host.scheduleTask(this.moveTransport, [this.shiftPressed ? -0.3 : -0.02], 0);
        }
        break;

      case this.buttons.forward:
        this.forwardPressed = !!value;

        if (!!value) {
          host.scheduleTask(this.moveTransport, [this.shiftPressed ? 0.3 : 0.02], 0);
        }
        break;

      case this.buttons.stop:
        if (!!value) {
          this.transport.stop();
        }
        break;

      case this.buttons.play:
        if (!!value) {
          this.transport.togglePlay();
        }
        break;

      case this.buttons.loop:
        if (!!value) {
          this.transport.toggleLoop();
        }
        break;

      case this.buttons.record:
        if (!!value) {
          this.transport.record();
        }
        break;

      case this.buttons.nextTrack:
        this.cursorTrack.selectNext();
        this.highlightModifyableTracks();
        break;

      case this.buttons.prevTrack:
        this.cursorTrack.selectPrevious();
        this.highlightModifyableTracks();
        break;
    }
  };

  this.handleShiftPress = function(value) {
    value = !!value; // Convert to boolean
    self.shiftPressed = value;

    switch (this.rotaryState) {
      case 'plugin':
        for (var i=0;i<8;i++) {
          self.cursorTrack.getPrimaryInstrument().getMacro(i).getAmount().setIndication(!value);
          self.cursorDevice.getParameter(i).setIndication(value);
        }
        break;
    }
  };

  this.highlightModifyableTracks = function() {
    var track, send;
    for (var i=0;i<this.tracksPerPage;i++) {
      track = this.trackBank.getTrack(i);
      if (track && track.exists()) {
        track.getVolume().setIndication(this.mixerPage === 0);
        track.getPan().setIndication(this.mixerPage === 1);
        send = track.getSend(0);
        if (send) {
          send.setIndication(this.mixerPage === 2);
        }
      }
    }
  };

  this.moveTransport = function(amount) {
    self.transport.incPosition(amount, false);

    if ((amount > 0 && self.forwardPressed) || (amount < 0 && self.rewindPressed)) {
      host.scheduleTask(self.moveTransport, [amount], 5);
    }
  };

  this.displayText = function(text, delay) {
    delay = delay || 0;
    host.scheduleTask(function(text) {
      var message = self.sysexHeader + '08' + text.forceLength(8).toHex(8) +'F7';
      sendSysex(message);
    }, [text], delay);
  };
}
