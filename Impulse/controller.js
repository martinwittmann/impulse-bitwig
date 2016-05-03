
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
  this.dawMode = false;

  this.pad1Pressed = false;
  this.pad2Pressed = false;
  this.pad3Pressed = false;
  this.pad4Pressed = false;
  this.pad5Pressed = false;
  this.pad6Pressed = false;
  this.pad7Pressed = false;
  this.pad8Pressed = false;

  this.midiRotary1Value = 0;
  this.midiRotary2Value = 0;
  this.midiRotary3Value = 0;
  this.midiRotary4Value = 0;
  this.midiRotary5Value = 0;
  this.midiRotary6Value = 0;
  this.midiRotary7Value = 0;
  this.midiRotary8Value = 0;

  // TODO documentation
  this.defaultVelocityTranslationTable = [];
  this.silentVelocityTranslationTable = [];
  for (var i=0;i<128;i++) {
    this.defaultVelocityTranslationTable.push(i);
    this.silentVelocityTranslationTable.push(0);
  }

  this.device = {
    vendor:           'Novation',
    name:             'Impulse 25',
    version:          '1.1',
    uuid:             '3B1F8670-2433-11E2-81C1-0800200C9A66',
    numMidiOutPorts:  2,
    numMidiInPorts:   1 
  };


  // These are all hardcoded CC values that can't be modified on the impulse.
  // All settings that *can* be modified are set in the template (Impulse.template.js).

  this.faders = {
    channel:        49,
    master:         8
  };

  this.buttons = {
    midi:           8,
    mixer:          9,
    plugin:         10,
    pageUp:         11,
    pageDown:       12,
    rewind:         27,
    forward:        28,
    stop:           29,
    play:           30,
    loop:           31,
    record:         32,
    midiMode:       33,
    mixerMode:      34,
    nextTrack:      37,
    prevTrack:      38,
    shift:          39
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

    this.sysexHeader = 'F0 00 20 29 67';
    sendSysex(this.sysexHeader + ' 06 01 01 01 F7');

    this.template = new ImpulseTemplate({
      title: this.defaultTemplateTitle
    });



    this.test = function(i) {
      //var m = 'F0 00 20 29 43 00 00' + uint8ToHex(i) + self.msg + 'F7';
      //sendSysex(m);
      sendMidi(0xb1, 0x39, i);
      println(i);
      i++;

      if (i<128) {
        host.scheduleTask(self.test, [i], 100);
      }
    };

    //host.scheduleTask(this.test, [0], 2000);
    //return;


    this.cursorTrack = host.createArrangerCursorTrack(this.tracksPerPage, 0);
    this.cursorDevice = host.createEditorCursorDevice();
    this.browser = this.cursorDevice.createDeviceBrowser(5, 7);
    this.trackBank = host.createTrackBank(this.tracksPerPage, 0, 0); // numTracks, numSends, numScenes
    this.mainTrack = host.createMasterTrack(0);
    this.transport = host.createTransport();
    this.application = host.createApplication();

    /*
    var actions = this.application.getActions();
    for (var property in actions) {
      println(property + ': ' + actions[property].getId() + ': ' + actions[property].getName());
    }
    */

    this.handleShiftPress(false); // Init the default shift state.

    sendMidi(0xb1, this.buttons.plugin, 0x0); // Initialize the impulse on the device page.

    // Both of these observer are *not* documented :)
    this.cursorTrack.addNameObserver(16, "", function(text) {
      self.templateTitle = text;
      self.currentTrackName = text;
      host.showPopupNotification(text);
      self.displayText(text);
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
    if (0xb1 == status && data1 >= 0 && data1 <= 7) {
      // In plugin or mixer mode.
      return 'rotary';
    }
    else if (isChannelController(status)) {
      // TODO: Add fader codes for 49 and 61 key versions.
      if (0 === MIDIChannel(status) && (data1 == self.faders.channel || data1 == self.faders.master)) {
        return 'fader';
      }
      else if (
        data1 == self.buttons.play ||
        data1 == self.buttons.stop ||
        data1 == self.buttons.record ||
        data1 == self.buttons.rewind ||
        data1 == self.buttons.forward ||
        data1 == self.buttons.loop ||
        data1 == self.buttons.pageUp ||
        data1 == self.buttons.pageDown ||
        data1 == self.buttons.mixer ||
        data1 == self.buttons.plugin ||
        data1 == self.buttons.midi ||
        data1 == self.buttons.nextTrack ||
        data1 == self.buttons.prevTrack ||
        data1 == self.buttons.midiMode ||
        data1 == self.buttons.mixerMode ||
        data1 == self.buttons.shift) {
        return 'button';
      }
      else if (
        // TODO: Update event type detection to be able to handle all possible
        //       template settings for rotaries.
        data1 == self.template.data.rotary1Note.hexByteAt(0) ||
        data1 == self.template.data.rotary2Note.hexByteAt(0) ||
        data1 == self.template.data.rotary3Note.hexByteAt(0) ||
        data1 == self.template.data.rotary4Note.hexByteAt(0) ||
        data1 == self.template.data.rotary5Note.hexByteAt(0) ||
        data1 == self.template.data.rotary6Note.hexByteAt(0) ||
        data1 == self.template.data.rotary7Note.hexByteAt(0) ||
        data1 == self.template.data.rotary8Note.hexByteAt(0)) {
          return 'rotary';
      }
      else if (
        // TODO: Update event type detection to be able to handle all possible
        //       template settings for rotaries.
        data1 == self.template.data.pad1Note.hexByteAt(0) ||
        data1 == self.template.data.pad2Note.hexByteAt(0) ||
        data1 == self.template.data.pad3Note.hexByteAt(0) ||
        data1 == self.template.data.pad4Note.hexByteAt(0) ||
        data1 == self.template.data.pad5Note.hexByteAt(0) ||
        data1 == self.template.data.pad6Note.hexByteAt(0) ||
        data1 == self.template.data.pad7Note.hexByteAt(0) ||
        data1 == self.template.data.pad8Note.hexByteAt(0)) {
          return 'pad';
      }
    } 

    return 'unknown';
  };

  this.pad1NoteStatus = false;

  this.onMidiEvent = function(status, data1, data2) {
    printMidi(status, data1, data2);
    var eventType = self.getEventType(status, data1, data2);

    if (isChannelController(status)) {
      switch (eventType) {
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

        case 'pad':
          self.handlePadPress(status, data1, data2);
          break;

        default:
          //println('unknown event type for midi msg: ' + status + ' ' + data1 + ' ' + data2);
      }
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

    var target, delta;
    var parameterIndex = data1 - 50;
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
      host.scheduleTask(self.moveTransport, [0.00001], 10);
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

      case this.buttons.midiMode:
        // We (ab)use the midi mode as daw/edit mode.
        this.dawMode = true;
        break;

      case this.buttons.mixerMode:
        this.dawMode = false;
        break;

      case this.buttons.shift:
        this.handleShiftPress(value);
        break;

      case this.buttons.plugin:
        this.rotaryState = 'plugin';
        this.displayText(this.templateTitle);
        host.showPopupNotification(this.templateTitle);
        this.highlightModifyableTracks();
        this.setPluginIndications(true);
        break;

      case this.buttons.mixer:
        this.rotaryState = 'mixer';
        this.displayText(this.mixerPages[0]);
        host.showPopupNotification(this.mixerPages[0]);
        // Scroll to the current trackBankPage (in case the active track was changed after leaving mixer mode).
        this.scrollToTrackBankPage();
        this.highlightModifyableTracks();
        this.setPluginIndications(false);
        break;

      case this.buttons.midi:
        this.displayText(this.defaultTemplateTitle);
        host.showPopupNotification(this.defaultTemplateTitle);
        this.rotaryState = 'midi';
        this.highlightModifyableTracks();
        this.setPluginIndications(false);
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

        // See "Regarding shift" at the top
        this.handleShiftPress(0);
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

  this.handlePadPress = function(status, data1, data2) {
    var padIndex, midiChannel, padPressed;

    switch (data1) {
      case self.template.data.pad1Note.hexByteAt(0):
        padIndex = 1;
        break;

      case self.template.data.pad2Note.hexByteAt(0):
        padIndex = 2;
        break;

      case self.template.data.pad3Note.hexByteAt(0):
        padIndex = 3;
        break;

      case self.template.data.pad4Note.hexByteAt(0):
        padIndex = 4;
        break;

      case self.template.data.pad5Note.hexByteAt(0):
        padIndex = 5;
        break;
        
      case self.template.data.pad6Note.hexByteAt(0):
        padIndex = 6;
        break;
        
      case self.template.data.pad7Note.hexByteAt(0):
        padIndex = 7;
        break;
        
      case self.template.data.pad8Note.hexByteAt(0):
        padIndex = 8;
        break;

      default:
        // This is not a pad press. If we get here, we have a bug somehwere.
        println('handlePadPress(): Could not determine which pad was pressed. data1 == ' + data1);
        return;
    }



    midiChannel = MIDIChannel(status);
    padPressed = self['pad' + padIndex + 'Pressed'];

    if (self.shiftPressed) {
      var isKeyDown = !padPressed && data2 > 0;
      if (isKeyDown) {
        //self.application.toggleBrowserVisibility();
        this.application.getAction('show_insert_popup_browser').invoke();
        this.application.getAction('focus_or_toggle_browser_panel').invoke();
      }
    }
    else {
      if (false === padPressed) {
        if (data2 > 0) {
          // We have a audible velocity value and the note is not playing, so we
          // send note on.
          self['pad' + padIndex + 'Pressed'] = true;
          self.sendMidiToBitwig(0x90 | midiChannel, data1, data2);
        }
        else {
          // The note is already playing so we could send channel aftertouch.
          // But aftertouch on the pads ist sent independent from the note/cc settings.
          // So we dont need to to send it manually.
        }
      }
      else if (0 === data2) {
        // The note is already playing and the velocity is 0. So we send note off.
        self['pad' + padIndex + 'Pressed'] = false;
        self.sendMidiToBitwig(0x80 | midiChannel, data1, 0x00);
      }
    }
  };

  this.handleShiftPress = function(value) {
    value = !!value; // Convert to boolean
    self.shiftPressed = value;

    if (value) {
      self.setSilentVelocityTranslationTable();      
    }
    else {
      this.setDefaultVelocityTranslationTable();      
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

  this.createNoteInputs = function() {
    for (var i=0;i<self.device.numMidiOutPorts;i++) {
      // Set up note input to ignore the last midi channel.
      self.noteInputs[i] = this.midiIns[i].createNoteInput('Impulse keyboard ' + i);


      // For some reason, when creating a note input the rotary 2 would stop working
      // because the midi event gets handled/consumed as note input and does not
      // call our this.onMidiEvent.
      // We work around this by telling bitwig, that the note inputs should not
      // consume the midi events, which means that all midi events get passed along
      // to our midi callbacks.
      self.noteInputs[i].setShouldConsumeEvents(false);
    }
  };

  this.setVelocityTranslationTable = function(table) {
    for (var i=0;i<this.noteInputs.length;i++) {
      this.noteInputs[i].setVelocityTranslationTable(table);
    }
  };

  this.setDefaultVelocityTranslationTable = function() {
    this.setVelocityTranslationTable(this.defaultVelocityTranslationTable);
  };

  this.setSilentVelocityTranslationTable = function() {
    self.setVelocityTranslationTable(self.silentVelocityTranslationTable);
  };

  this.sendMidiToBitwig = function(status, data1, data2) {
    for (var i=0,len=this.noteInputs.length;i<len;i++) {
      self.noteInputs[i].sendRawMidiEvent(status, data1, data2);
    }
  };

  this.setPluginIndications = function(value) {
    for (var i=0;i<8;i++) {
      self.cursorTrack.getPrimaryInstrument().getMacro(i).getAmount().setIndication(value);
      self.cursorDevice.getParameter(i).setIndication(value && self.shiftPressed);
    }
  };
}
