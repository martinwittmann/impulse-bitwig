
function BitwigController() {
  var controller = this, util = new ImpulseUtil(this);
  this.util = util;

  this.defaultTemplateTitle = 'Bitwig';
  this.sysexHeader = 'F0 00 20 29 67';
  this.tracksPerPage = 8;
  this.trackBankPage = 0;

  // Device state values.
  this.shiftPressed = false;
  this.loopPressed = false;
  this.forwardPressed = false;
  this.rewindPressed = false;
  this.mixerPage = 0;
  this.mixerPages = ['Mixer', 'Pan', 'Send', 'Record', 'Solo', 'Mute'];

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

  this.state = {
    mode: 'performance',
    performance: {
      page: 'plugin', // Init the performance mode in plugin state by default.
      mixerPage: 0
    },
    daw: {
      page: 'mixer', // Init the daw mode in mixer state by default.
      mixerPage: 0
    },
    display: {
      text: '',
      value: '',
      host: ''
    },
    textDisplayTimeouts: {
      text: -1,
      value: -1,
      host: -1
    },
    pads: {
      useAsButtons: false,
      blinkIntervalId: false,
      blinking: {},
      1: {
        down: false,
        lastPress: 0
      },
      2: {
        down: false,
        lastPress: 0
      },
      3: {
        down: false,
        lastPress: 0
      },
      4: {
        down: false,
        lastPress: 0
      },
      5: {
        down: false,
        lastPress: 0
      },
      6: {
        down: false,
        lastPress: 0
      },
      7: {
        down: false,
        lastPress: 0
      },
      8: {
        down: false,
        lastPress: 0
      }
    },
    tracks: {
      currentOffset: 0,
    }
  };

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

  this.midiIns = [];
  this.noteInputs = [];

  this.init = function() {
    this.cursorTrack = host.createArrangerCursorTrack(this.tracksPerPage, 0);
    this.cursorDevice = host.createEditorCursorDevice();
    this.browser = this.cursorDevice.createDeviceBrowser(5, 7);
    this.trackBank = host.createTrackBank(this.tracksPerPage, 0, 0); // numTracks, numSends, numScenes
    this.mainTrack = host.createMasterTrack(0);
    this.transport = host.createTransport();
    this.application = host.createApplication();


    this.template = new ImpulseTemplate({
      title: this.defaultTemplateTitle
    });
    this.events = new ImpulseEvents(this.template, this);
    // Note: We declared util in the ImpulseController class. So it's available in all class functions.

    var midiCallback = function(status, data1, data2) {
      controller.events.onMidi.call(controller.events, status, data1, data2);
    };

    var sysexCallback = function(data) {
      controller.events.onSysex.call(controller.events, data);
    };

    // Map all device midi out ports to host in ports.
    for (var i=0;i<impulse25.device.numMidiOutPorts;i++) {
      this.midiIns[i] = host.getMidiInPort(i);
      this.midiIns[i].setMidiCallback(midiCallback);
      this.midiIns[i].setSysexCallback(sysexCallback);
    }

    this.createNoteInputs();

    // Send host midi clock to device in ports.
    for (i=0;i<impulse25.device.numMidiInPorts;i++) {
      host.getMidiOutPort(i).setShouldSendMidiBeatClock(true);
    }

    this.sysexHeader = 'F0 00 20 29 67';
    sendSysex(this.sysexHeader + ' 06 01 01 01 F7');

    /*
    var actions = this.application.getActions();
    for (var property in actions) {
      println(property + ': ' + actions[property].getId() + ': ' + actions[property].getName());
    }
    */

    this.events.handleShiftPress(false); // Init the default shift state.

    sendMidi(0xb1, this.buttons.plugin, 0x0); // Initialize the impulse on the device page.

    // Both of these observer are *not* documented :)
    this.cursorTrack.addNameObserver(16, "", function(text) {
      controller.currentTrackName = text;
      // The addPositionObserver fires before this, so we update the current
      // track info there instead of here.
    });

    this.cursorTrack.addPositionObserver(function(index) {
      controller.activeTrack = parseInt(index, 10);
      controller.scrollToTrackBankPage();
      controller.displayModePageTrackOnHost();
      controller.setTextDisplay(controller.getCurrentTrackDisplayText(), 'text');
    });

    this.trackBank.addTrackScrollPositionObserver(function(value) {
      var c = controller;
      c.state.tracks.currentOffset = value;
      if (c.state.pads.useAsButtons) {
        // NOTE: We need to delay updating the padLights because this observer
        //       is executed before the mute and solo status observers.
        //       If the user starts the script with a track of the first page
        //       selected and then changes to a track of another page this would
        //       throw an error.
        //util.setTimeout(c.updatePadLights, [], 300);
        controller.resetPads();
      }
    }, 0);

    this.cursorDevice.addNameObserver(20, 'none', function(name) {
      controller.displayModePageTrackOnHost();
    });

    this.cursorDevice.addPositionObserver(function(index) {
      controller.activeDeviceIndex = index;
    });

    this.cursorDevice.hasDrumPads().addValueObserver(function(value) {
      controller.currentDevicehasDrumpads = value;
    });

    this.transport.addIsLoopActiveObserver(function(value) {
      controller.isLoopActive = value;
    });

    for (i=0;i<this.tracksPerPage;i++) {
      var track = this.trackBank.getChannel(i);
      track.getMute().addValueObserver((function() {
        var c = controller;
        var index = i;
        return function(value) {
          var tracks = c.state.tracks;
          var realIndex = tracks.currentOffset + index + 1;
          if ('undefined' == typeof tracks[realIndex]) {
            tracks[realIndex] = {
              mute: false,
              solo: false,
              arm: false
            };
          }
          tracks[realIndex].mute = value;
          if (c.state.pads.useAsButtons) {
            c.trackMuteChanged(realIndex - 1, value);
          }
        };
      })());

      track.getSolo().addValueObserver((function() {
        var c = controller;
        var index = i;
        return function(value) {
          var tracks = c.state.tracks;
          var realIndex = tracks.currentOffset + index + 1;
          if ('undefined' == typeof tracks[realIndex]) {
            tracks[realIndex] = {
              mute: false,
              solo: false,
              arm: false
            };
          }
          tracks[realIndex].solo = value;
          if (c.state.pads.useAsButtons) {
            c.trackSoloChanged(realIndex - 1, value);
          }
        };
      })());

      track.getArm().addValueObserver((function() {
        var c = controller;
        var index = i;
        return function(value) {
          var tracks = c.state.tracks;
          var realIndex = tracks.currentOffset + index + 1;
          if ('undefined' == typeof tracks[realIndex]) {
            tracks[realIndex] = {
              mute: false,
              solo: false,
              arm: false
            };
          }
          tracks[realIndex].arm = value;
          if (c.state.pads.useAsButtons) {
            c.trackArmChanged(realIndex - 1, value);
          }
        };
      })());
    }

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


  this.highlightModifyableTracks = function() {
    var track, send;
    var page = this.state[this.state.mode].page;
    var mixerPage = this.state[this.state.mode].mixerPage;

    for (var i=0;i<this.tracksPerPage;i++) {
      track = this.trackBank.getChannel(i);
      if (track && track.exists()) {
        track.getVolume().setIndication('mixer' == page && mixerPage === 0);
        track.getPan().setIndication('mixer' == page && mixerPage === 1);
        send = track.getSend(0);
        if (send) {
          send.setIndication('mixer' == page && mixerPage === 2);
        }
      }
    }
  };

  this.moveTransport = function(amount) {
    this.transport.incPosition(amount, false);

    if ((amount > 0 && this.forwardPressed) || (amount < 0 && this.rewindPressed)) {
      host.scheduleTask(function(amount) {
        controller.moveTransport.call(controller, amount);
      }, [amount], 5);
    }
  };

  this.getTextSysexMessage = function(text, location) {
    text = text || '';
    // The value display has 3 characters, the text display 8.
    var length = 'value' == location ? 3 : 8;
    var sysexCode = 'value' == location ? '09' : '08';
    return controller.sysexHeader + sysexCode + ' ' + text.forceLength(length).toHex(length) +' F7';
  };

  this.scrollToTrackBankPage = function(page) {
    if ('undefined' == typeof page) {
      // Reset the mixer page to the one of the currently selected track.
      page = Math.floor(this.activeTrack / this.tracksPerPage);
    }
    if (page != this.trackBankPage) {
      var diff = this.trackBankPage - page;
      for (var i=0;i<Math.abs(diff);i++) {
        // Honestly, I don't understand why we need to scroll a page up but
        // decrease the trackBankPage value.
        // But otherwise the indicators for the selected trackbank went into the
        // wrong direction :)
        if (diff > 0) {
          this.trackBank.scrollTracksPageUp();
          this.trackBankPage--;
        }
        else {
          this.trackBankPage++;
          this.trackBank.scrollTracksPageDown();
        }
      }
      this.highlightModifyableTracks();
    }
  };

  this.createNoteInputs = function() {
    for (var i=0;i<this.device.numMidiOutPorts;i++) {
      // Set up note input to ignore the last midi channel.
      this.noteInputs[i] = this.midiIns[i].createNoteInput('Impulse keyboard ' + i);


      // For some reason, when creating a note input the rotary 2 would stop working
      // because the midi event gets handled/consumed as note input and does not
      // call our this.onMidiEvent.
      // We work around this by telling bitwig, that the note inputs should not
      // consume the midi events, which means that all midi events get passed along
      // to our midi callbacks.
      this.noteInputs[i].setShouldConsumeEvents(false);
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
    this.setVelocityTranslationTable(this.silentVelocityTranslationTable);
  };

  this.sendMidiToBitwig = function(status, data1, data2) {
    for (var i=0,len=this.noteInputs.length;i<len;i++) {
      this.noteInputs[i].sendRawMidiEvent(status, data1, data2);
    }
  };

  this.setPluginIndications = function(value) {
    for (var i=0;i<8;i++) {
      this.cursorTrack.getPrimaryInstrument().getMacro(i).getAmount().setIndication(value);
      this.cursorDevice.getParameter(i).setIndication(value && this.shiftPressed);
    }
  };

  this.setMode = function(mode) {
    this.state.mode = mode;
    var pageText = this.getPageText();

    // We want to revert to the current page after showing the new mode.
    this.setTextDisplayDefault('text', pageText);
    var modeText = 'daw' == mode ? 'Edi' : 'Per';
    this.setTextDisplay(modeText, 'value', 2000);
    this.setPage(this.state[mode].page);
  };

  this.setPage = function(page, updateDisplayedTexts) {
    updateDisplayedTexts = updateDisplayedTexts || true;

    var mode = this.state.mode;
    this.state[mode].page = page;

    var setPluginIndicationsPerformance = 'performance' == mode && 'plugin' == page && this.shiftPressed;
    var setPluginIndicationsDaw = 'daw' == mode && 'plugin' == page;

    controller.setPluginIndications(setPluginIndicationsPerformance || setPluginIndicationsDaw);
    controller.highlightModifyableTracks();

    // Set the page indicators accordingly.
    sendMidi(0xB1, controller.buttons[page], 0x0);

    if ('mixer' == page) {
      this.usePadsAsButtons(true);
    }

    if (updateDisplayedTexts) {
      var pageText = this.getPageText();
      this.setTextDisplay(pageText, 'value');
      this.displayModePageTrackOnHost();

      switch (this.getPage()) {
        case 'mixer':
          this.setTextDisplay(this.getMixerStatusStr);
          break;

        case 'midi':
          this.setTextDisplay(this.getClipStatusStr);
          break;

        default:
          this.setTextDisplay(this.getCurrentTrackDisplayText(), 'text');
      }
    }
  };

  this.getCurrentTrackDisplayText = function() {
    return (this.activeTrack + 1) + this.currentTrackName;

  };

  this.getMixerStatusStr = function() {
    var str = '', c = controller, offset = c.state.tracks.currentOffset;
    for (var i=1;i<9;i++) {
      str += i;
    }
    return str;
  };

  this.getClipStatusStr = function() {
    return 'Clip Status';
  };

  this.getPage = function() {
    return this.state[this.state.mode].page;
  };

  this.getPageText = function() {
    switch (this.getPage()) {
      case 'mixer':
        return 'Mix';

      case 'midi':
        return 'Clp';

      default:
        return 'Plg';
    }
  };

  this.setTextDisplayDefault = function(text, location) {
    location = location || 'text';
    this.state.display[location] = text;
  };

  this.setTextDisplay = function(text, location, duration, delay) {
    text = text || '';
    location = location || 'text';
    duration = duration || 0;
    delay = delay || 0;

    var callback = function() {
      controller._setTextDisplay(text, location, duration);
    };

    if (delay > 0) {
      util.setTimeout(callback, [], delay);
    }
    else {
      callback();
    }
  };

  this._setTextDisplay = function(text, location, duration) {
    location = location || 'text';
    duration = duration || 0;

    if (0 === duration) {
      // Only set the text to fallback to if the text we show should be visible permanently.
      this.setTextDisplayDefault(text, location);
    }

   this._outputText(text, location);

    if (duration > 0) {
      util.clearTimeout(this.state.textDisplayTimeouts[location]);
      this.state.textDisplayTimeouts[location] = util.setTimeout(function(location) {
        controller._outputText(controller.state.display[location], location);
      }, [location], duration);
    }
  };

  this._outputText = function(text, location) {
    location = location || 'text';
    if ('function' == typeof text) {
      text = text();
    }

    if ('host' == location) {
      host.showPopupNotification(text);
    }
    else {
      sendSysex(controller.getTextSysexMessage(text, location));
    }
  };

  this.displayModePageTrackOnHost = function() {
    var mode = this.state.mode;
    var page = this.state[mode].page;
    var modeText = 'daw' == mode ? 'Edit' : 'Perform';
    var pageText = page.substr(0, 1).toUpperCase() + page.substr(1);
    this.setTextDisplay(modeText + ' / ' + pageText + ' / ' + this.currentTrackName, 'host');
  };


  this.usePadsAsButtons = function(value) {
    value = !!value;
    this.state.pads.useAsButtons = value;
    this.updatePadLights();
  };

  this.updatePadLights = function() {
    var value = 0, blink = false, c = controller, track;
    if (c.state.pads.useAsButtons) {
      var tracks = c.state.tracks;
      var offset = c.state.tracks.currentOffset;
      for (var i=offset;i<offset+8;i++) {
        value = 0;
        blink = false;
        track = tracks[i + 1];

        if (!track) {
          host.errorln('Track state for track: ' + (i + 1) + ' is not set. You will see incorrect values on the pad light indicators.');
          continue;
        }

        if (tracks[i + 1].solo) {
          blink = true;
          value = 127;
        }
        else if (tracks[i + 1].mute) {
          value = 127;
        }
        c._setPadLight(i % 8, value, blink);
      }
    }
  };

  this._setPadLight = function(index, value, blink) {
    var c = controller;
    blink = blink || false;
    cc = c.template.data['pad' + (index % 8 + 1) + 'Note'];
    sendMidi(0xB0, '0x' + cc, value);
    // The value we assign only hold the information whether or not it's currently
    // on or off. 
    if (blink) {
      c.state.pads.blinking[index + 1] = !!value;
      if (false === c.state.pads.blinkIntervalId) {
        c.state.pads.blinkIntervalId = util.setInterval(c.padBlinkingHandler, [], 700);
      }
    }
    else {
      delete c.state.pads.blinking[index + 1];
    }
  }

  this.padBlinkingHandler = function() {
    var blinkPads = [], c = controller;
    for (key in c.state.pads.blinking) {
      blinkPads.push(key);
    }
    if (!blinkPads.length) {
      util.clearInterval(c.state.pads.blinkIntervalId);
      c.state.pads.blinkIntervalId = false;
    }
    else {
      var value;
      for (var i=0;i<blinkPads.length;i++) {
        value = c.state.pads.blinking[blinkPads[i]] ? 0 : 127;
        c._setPadLight(blinkPads[i] - 1, value, true);
      }
    }
  };

  this.trackMuteChanged = function(index, value) {
    util.setTimeout(function(index, value) {
      var c = controller;
      var trackIndex = index + 1;
      var isSoloed = c.state.tracks[trackIndex].solo;
      //var isBlinking = !!c.state.pads.blinking[index + 1];
      // We do not change a blinking pad (= a soloed track) because solo overrides
      // mute.
      if (!isSoloed) {
        controller._setPadLight(index, value ? 127 : 0);
      }
    }, [index, value], 100);
  };

  this.trackSoloChanged = function(index, value) {
    util.setTimeout(function(index, value) {
      var c = controller;
      var trackIndex = index + 1;
      var isMuted = c.state.tracks[trackIndex].mute;

      // If the track is muted and the user just unsoloed the track we set it to light on.
      if (isMuted && !value) {
        controller._setPadLight(index, 127);
      }
      else {
        controller._setPadLight(index, value ? 127 : 0, value);
      }
    }, [index, value], 100);
  };

  this.trackArmChanged = function(index, value) {};

  this.resetPads = function() {
    for (var i=0;i<8;i++) {
      this._setPadLight(i, 0);
    };
  };
}
