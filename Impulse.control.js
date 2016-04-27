/*

Features I'd like to add:
  When rotating a value: display on the impulse what it is: the channel in mixer mode, channel pan?, the macro or the parameter in plugin mode
    plus show the actual value on the impulse display too.



Bugs:
  Mixer pagination does not work. In what circumstances?
*/


load('Impulse.template.js');
var impulse25 = new BitwigController();

loadAPI(1);

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
  this.trackBankPage = 0;

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

  this.faders = {
    channel:        49,
    master:         08
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

  this.messageFilters = [];
  // We skip the last midi channel, to make bitwig ignore it.
  // We use this channel to route midi events there, when we don't want bitwig
  // to consume them.
  // This way we can use shift + keyboard to quickly select a track and
  // shift + pad the keyboard to assign midi nodes to pads directly.
  var channel;
  for (var i=0;i<15;i++) {
    channel = i;
    if (i > 9) {
      switch (i) {
        case 10:
          channel = 'A';
          break;
        case 11:
          channel = 'B';
          break;
        case 12:
          channel = 'C';
          break;
        case 13:
          channel = 'D';
          break;
        case 14:
          channel = 'E';
          break;
        case 15:
          channel = 'F';
          break;
      }
    }
    this.messageFilters.push('9' + channel + '????');
    this.messageFilters.push('8' + channel + '????');
  }


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

  this.midiIns = [];
  this.noteInputs = [];

  this.init = function() {
    // Map all device midi out ports to host in ports.
    for (var i=0;i<impulse25.device.numMidiOutPorts;i++) {
      this.midiIns[i] = host.getMidiInPort(i);
      this.midiIns[i].setMidiCallback(this.onMidiEvent);
      this.midiIns[i].setSysexCallback(this.onSysexEvent);
    }

    this.createNoteInputs();

    // Send host midi clock to device in ports.
    for (i=0;i<impulse25.device.numMidiInPorts;i++) {
      host.getMidiOutPort(i).setShouldSendMidiBeatClock(true);
    }

    // I'm not sure whether or not this is necessary.
    // I don't know what these values mean, but this make the impulse aware of
    // the connection with bitwig
    this.sysexHeader = 'F0 00 20 29 67';
    // 06  setting some state? at least leds and pc connection I know of.
    // 00/01.. sets midi status led below fader, if set to 00 the fader is not recognized, and the mixer page is not accessible, showing an error.
    // 00 == plugin state, 01 == midi state; whats mixer?
    // 01 == create connection to bitwig, 00, anything else: no connection

    // first byte == action?
    // 06 == status,
    // 07 ??
    // 08 == display text in text area on screen's top
    // 09 == display text in the big 3 charachter area


    // After setting this, the impulse shows transport messages when pressing transport buttons.
    sendSysex(this.sysexHeader + ' 06 01 01 01 F7');

    this.template = new ImpulseTemplate({
      title: this.defaultTemplateTitle,
      midiRotaties: this.midiRotaties
    });

    //sendSysex(this.sysexHeader + "07 19 F7");

  //F0 00 20 29 43 00 00 [t] [i] [t] [l] [e] [ ] [ ] [ ]

  /*
  Get firmware version: Boot == 658, Main == 693
  F0 00 20 29 00 70 F7 returns Sysex: F0 00 20 29 00 70 00 00 06 05 08 00 00 06 09 03 0D F7
  */


  // Firmware update:
             //F0 00 20 29 00 71 0F 5A 00 00 00 06 09 05 F7
             //F0 00 20 29 00 72 5C 4D 40 00 45 64 6C 00 04 2E 26 60 00 20 00 00 00 00 00 F7
             //F0 00 20 29 00 72 00 00 00 00 00 00 00 00 00 00 00 00 00 02 72 36 00 02 17 F7
             //F0 00 20 29 00 72 5C 4D 40 00 40 00 00 00 00 2E 26 60 00 22 72 36 00 02 17 F7
             //F0 00 20 29 00 72 5C 4D 40 00 45 64 6C 00 04 2E 26 60 00 22 72 36 00 02 17 F7
             //F0 00 20 29 00 72 5C 4D 40 00 45 64 6C 00 04 2E 26 60 00 22 72 36 00 02 17 F7
             //F0 00 20 29 00 72 5C 4D 40 00 45 64 6C 00 04 2E 26 60 00 20 72 45 00 02 19 F7
             //F0 00 20 29 00 72 64 4E 60 00 45 64 6C 00 04 2E 26 60 00 22 72 36 00 02 17 F7

    this.test = function(i) {
      //var message = 'F0 00 20 29 67 ' + uint8ToHex(i) + '00 03 44 05 06 07 08 09 0a 0b 0c 0d 0e 0f F7';
      msg = 'F0 00 20 29 00 ' + uint8ToHex(i) + '0F 5A 01 02 03 04 0a F7';
      sendSysex(msg);
      println(msg);
      i++;

      if (i<112) {
        host.scheduleTask(self.test, [i], 200);
      }
    };

    //host.scheduleTask(this.test, [0], 0);
    //return;


    this.cursorTrack = host.createArrangerCursorTrack(this.tracksPerPage, 0);
    this.cursorDevice = host.createEditorCursorDevice();
    this.trackBank = host.createTrackBank(this.tracksPerPage, 0, 0); // numTracks, numSends, numScenes
    this.mainTrack = host.createMasterTrack(0);
    this.transport = host.createTransport();
    this.application = host.createApplication();

    this.handleShiftPress(false); // Init the default shift state.

    sendMidi(0xb1, this.buttons.plugin, 0x0); // Initialize the impulse on the device page.

    // Both of these observer are *not* documented :)
    this.cursorTrack.addNameObserver(16, "", function(text) {
      self.templateTitle = text;
      self.currentTrackName = text;
      host.showPopupNotification(text);
      //self.displayText(text);
    });

    this.cursorTrack.addPositionObserver(function(index) {
      self.activeTrack = parseInt(index, 10);
      self.scrollToTrackBankPage();
    });


    this.notifications = host.getNotificationSettings();

    this.notifications.setShouldShowChannelSelectionNotifications(true);
    this.notifications.setShouldShowDeviceLayerSelectionNotifications(true);
    this.notifications.setShouldShowDeviceSelectionNotifications(true);
    this.notifications.setShouldShowMappingNotifications(true);
    this.notifications.setShouldShowPresetNotifications(true);
    this.notifications.setShouldShowSelectionNotifications(true);
    this.notifications.setShouldShowTrackSelectionNotifications(true);
    this.notifications.setShouldShowValueNotifications(true);
  };

  this.getEventType = function(status, data1, data2) {
    if ((status == 0xb1 && data1 >= 0 && data1 <= 7) || (status == 0xb0 && data1 >= 71 && data1 <= 78)) {
      return 'rotary';
    }
    else if (status == 0xb0 && (data1 == self.faders.channel || data1 == self.faders.master)) {
      return 'fader';
    }
    else if (status == 0xb0 && (data1 == self.faders.channel || data1 == self.faders.master)) {
      return 'fader';
    }
    else if (status == 0xb0 || status == 0xb1) {
      return 'button';
    }
  };

  this.onMidiEvent = function(status, data1, data2) {
    printMidi(status, data1, data2);

    // I could not find documentation on what isChannelController checks,
    // but several controller scripts use it, so it looks like it's necessary.
    if (isChannelController(status)) {
      switch (self.getEventType(status, data1, data2)) {
        case 'fader':
          self.handleFaderChange(status, data1, data2);
          sendMidi(status, data1, data2);
          break;

        case 'rotary':
          self.handleRotaryChange(status, data1, data2);
          break;

        case 'button':
          self.handleButtonPress(status, data1, data2);
          break;
      }
    }
    else if (isNoteOn(status) && self.shiftPressed) {
      //println(status);

    }
  };

  this.onSysexEvent = function(data) {
    printSysex(data);
  };

  this.handleFaderChange = function(status, data1, data2) {
    var target;
    switch (this.rotaryState) {

      case 'mixer':
      case 'midi':
        target = this.mainTrack;
        break;

      default:
        //  Note: We default to setting the channel volume even though the impulse
        // is in mixer mode, because initializing it in midi mode creates an
        // error everytime you want to go to the mixer page.
        // So I simply swapped the meaning of the button below the fader.
        if (this.faders.channel == data1) {
          target = this.mainTrack;
          this.displayText('Master');
        }
        else {
          target = this.trackBank.getChannel(this.activeTrack);
        }
        break;
    }

    target.getVolume().set(data2, 128);
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
    var track = self.trackBank.getChannel(data1), target, delta;
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
    var target, delta;
    var parameterIndex = data1 - 71;
    // Data1 is 71-78, so we subtract 71 to get 0-7.

    if (7 == parameterIndex) {
      // The last rotary does zooming.
      delta = data2 - self.midiRotary8Value;
      self.midiRotary8Value += delta;
      if (delta > 0) {
        self.application.zoomIn();
      }
      else {
        self.application.zoomOut();
      }
    }
    else if (6 == parameterIndex) {
      delta = data2 - self.midiRotary7Value;
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
        host.showPopupNotification(this.templateTitle);
        this.highlightModifyableTracks();
        break;

      case this.buttons.mixer:
        this.rotaryState = 'mixer';
        this.displayText(this.mixerPages[0]);
        host.showPopupNotification(this.mixerPages[0]);
        // Scroll to the current trackBankPage (in case the active track was changed after leaving mixer mode).
        this.scrollToTrackBankPage();
        this.highlightModifyableTracks();
        break;

      case this.buttons.midi:
        this.displayText(this.defaultTemplateTitle);
        host.showPopupNotification(this.defaultTemplateTitle);
        this.rotaryState = 'midi';
        this.highlightModifyableTracks();
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
        if ('mixer' == this.rotaryState) {
          this.trackBank.scrollTracksPageDown();
        }
        else {
          this.cursorTrack.selectNext();
          this.highlightModifyableTracks();
        }
        break;

      case this.buttons.prevTrack:
        if ('mixer' == this.rotaryState) {
          this.trackBank.scrollTracksPageUp();
        }
        else {
          this.cursorTrack.selectPrevious();
          this.highlightModifyableTracks();
        }
        break;
    }
  };

  this.handleShiftPress = function(value) {
    value = !!value; // Convert to boolean
    self.shiftPressed = value;

    if (value) {
      //this.template.toShiftMode();
    }
    else {
      //this.template.toRegularMode();
    }

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
      track = this.trackBank.getChannel(i);
      if (track && track.exists()) {
        track.getVolume().setIndication('mixer' == this.rotaryState && this.mixerPage === 0);
        track.getPan().setIndication('mixer' == this.rotaryState && this.mixerPage === 1);
        send = track.getSend(0);
        if (send) {
          send.setIndication('mixer' == this.rotaryState && this.mixerPage === 2);
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

  this.scrollToTrackBankPage = function(page) {
    if ('undefined' == typeof page) {
      // Reset the mixer page to the one of the currently selected track.
      page = Math.floor(self.activeTrack / self.tracksPerPage);
    }
    if (page != self.trackBankPage) {
      var diff = self.trackBankPage - page;
      for (var i=0;i<Math.abs(diff);i++) {
        // Honestly, I don't understand why we need to scroll a page up but
        // decrease the trackBankPage value.
        // But otherwise the indicators for the selected trackbank went into the
        // wrong direction :)
        if (diff > 0) {
          self.trackBank.scrollTracksPageUp();
          self.trackBankPage--;
        }
        else {
          self.trackBankPage++;
          self.trackBank.scrollTracksPageDown();
        }
      }
      self.highlightModifyableTracks();
    }
  };

  this.removeNoteInput = function() {
    for (var i=0;i<self.noteInputs.length;i++) {
      println(this.noteInputs[i].name);
    }
  };

  this.createNoteInputs = function() {
    for (var i=0;i<self.device.numMidiOutPorts;i++) {
      // Set up note input to ignore the last midi channel.
      self.noteInputs[i] = this.midiIns[i].createNoteInput('Impulse keyboard ' + i,
        self.messageFilters[0],
        self.messageFilters[1],
        self.messageFilters[2],
        self.messageFilters[3],
        self.messageFilters[4],
        self.messageFilters[5],
        self.messageFilters[6],
        self.messageFilters[7],
        self.messageFilters[8],
        self.messageFilters[9],
        self.messageFilters[10],
        self.messageFilters[11],
        self.messageFilters[12],
        self.messageFilters[13],
        self.messageFilters[14],
        self.messageFilters[15],
        self.messageFilters[16],
        self.messageFilters[17],
        self.messageFilters[18],
        self.messageFilters[19],
        self.messageFilters[20],
        self.messageFilters[21],
        self.messageFilters[22],
        self.messageFilters[23],
        self.messageFilters[24],
        self.messageFilters[25],
        self.messageFilters[26],
        self.messageFilters[27],
        self.messageFilters[28],
        self.messageFilters[29]
      );


      // For some reason, when creating a note input the rotary 2 would stop working
      // because the midi event gets handled/consumed as note input and does not
      // call our this.onMidiEvent.
      // We work around this by telling bitwig, that the note inputs should not
      // consume the midi events, which means that all midi events get passed along
      // to our midi callbacks.
      self.noteInputs[i].setShouldConsumeEvents(false);
    }
  };
}
