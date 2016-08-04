
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

    // Init the default shift state.
    controller.shiftPressed = false;
    controller.setDefaultVelocityTranslationTable();      

    sendMidi(0xb1, this.buttons.plugin, 0x0); // Initialize the impulse on the device page.

    // Both of these observer are *not* documented :)
    this.cursorTrack.addNameObserver(16, "", function(text) {
      controller.currentTrackName = text;
      // The cursorTrack.addPositionObserver fires before this, so we update the current
      // track info there instead of here.
    });

    this.cursorTrack.addPositionObserver(function(index) {
      controller.activeTrack = parseInt(index, 10);
      // The offset gets set in a later observer causing function calls made here
      // to return incorrect state data. We work around that by manually setting
      // the track offset wihch a bit later gets set again in another observer.
      controller.state.tracks.currentOffset = index - index % 8;
      controller.scrollToTrackBankPage();
      controller.displayModePageTrackOnHost();
      var duration = 'mixer' == controller.getPage() ? 1500 : 0;
      //controller.setTextDisplay(controller.getTrackDisplayText(), 'text', duration);

      if ('mixer' == controller.getPage()) {
        controller.setTextDisplayDefault(controller.getMixerStatusStr, 'text');
        println('pos: ' + index + ' ' + controller.state.tracks.currentOffset);
        controller.setTextDisplayDefault(controller.getMixerValueText(), 'value');
        controller.updateTrackDetailsOnDisplay(index, 80, 1000)
      }
      else {
        controller.updateTrackDetailsOnDisplay(index, 100);
      }
    });

    this.trackBank.addTrackScrollPositionObserver(function(value) {
      var c = controller;
      c.state.tracks.currentOffset = value;
      if (c.state.pads.useAsButtons) {
        // We only reset the pads since the mute, solo and arm observers
        // handle updating the pad lights by themselves.
        c.resetPads();
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
    this.setTextDisplayDefault(pageText, 'text');
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

    this.usePadsAsButtons('mixer' == page);

    if (updateDisplayedTexts) {
      //var pageText = this.getPageText();
      this.displayModePageTrackOnHost();

      switch (this.getPage()) {
        case 'mixer':
          this.setTextDisplay(this.getMixerStatusStr);
          this.setTextDisplay(this.getMixerValueText(), 'value');
          break;

        case 'midi':
          this.setTextDisplay(this.getClipStatusStr);
          break;

        default:
          this.setTextDisplay(this.getTrackDisplayText(), 'text');
      }
    }
  };

  this.getMixerValueText = function() {
    var offset = this.state.tracks.currentOffset;
    return (offset < 10 ? '0' : '') + (offset + 1) + '-';
  };

  this.getTrackValueText = function(trackIndex) {
    var text = '';
    var track = this.state.tracks[trackIndex + 1];
    text += track.mute ? 'M' : ' ';
    text += track.solo ? 'S' : ' ';
    text += track.arm ? 'R' : ' ';

    return text;
  };

  this.getTrackDisplayText = function(index) {
    index = 'undefined' == typeof index ? this.activeTrack + 1 : index;
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

  this.setTextDisplayToDefault = function(location) {
    location = location || 'text';
    controller._outputText(controller.state.display[location], location);
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

    // Clear any possible timeouts. If we set the display with a timeout and before
    // that timeout gets executed set the display text again, we don't want the
    // old timeout to mess with the new text.
    util.clearTimeout(this.state.textDisplayTimeouts[location]);
    this._outputText(text, location);

    if (duration > 0) {
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

  this.updatePadLights = function(delay) {
    delay = 'undefined' == typeof delay ? 100 : delay;
    var value = 0, blink = false, c = controller, track;

    if (c.state.pads.useAsButtons) {
      var tracks = c.state.tracks;
      var offset = c.state.tracks.currentOffset;
      for (var i=offset;i<offset+8;i++) {
        controller.updatePadLight(i);
      }
    }
  };

  this._setPadLight = function(index, value, blink) {
    var c = controller;
    blink = blink || false;
    cc = c.template.data['pad' + (index % 8 + 1) + 'Note'];
    //println('set pad ' + index + ' / ' + cc + ' to ' + value);
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
    this.updatePadLight(index);
  };

  this.trackSoloChanged = function(index, value) {
    this.updatePadLight(index);
  };

  this.updatePadLight = function(index, delay) {
    delay = delay || 100;
    host.scheduleTask(function(index) {
      var c = controller;
      var trackIndex = index + 1;
      var isMuted = c.state.tracks[trackIndex].mute;
      var isSoloed = c.state.tracks[trackIndex].solo;
      var isArmed = c.state.tracks[trackIndex].arm;
      println(index + ' ' + (isMuted ? 'M' : 'm') + ' ' + (isSoloed ? 'S' : 's') + ' ' + (isArmed ? 'R' : 'r'));

      // When the user presses shift we show the record arm status instead mute/solo.
      if (c.shiftPressed) {
        controller._setPadLight(index, isArmed ? 127 : 0);
        return;
      }

      // If the track is muted and the user just unsoloed the track we set it to light on.
      if (isSoloed) {
        controller._setPadLight(index, 127, true);
      }
      else if (isMuted) {
        controller._setPadLight(index, 127);
      }
      else {
        controller._setPadLight(index,0, false);
      }
    }, [index], delay);
  };

  this.trackArmChanged = function(index, value) {
  };

  this.resetPads = function() {
    for (var i=0;i<8;i++) {
      this._setPadLight(i, 0);
    };
  };

  this.updateTrackDetailsOnDisplay = function(index, delay, duration) {
    index = 'undefined' == typeof index ? this.activeTrack + 1 : index;
    delay = 'undefined' == typeof delay ? 0 : delay;
    duration = 'undefined' == typeof duration ? 0 : duration;

    util.setTimeout(function(index) {
      controller.setTextDisplay(controller.getTrackValueText(index), 'value', duration);
      controller.setTextDisplay(controller.getTrackDisplayText(index), 'text', duration);
    }, [index], delay);
  }
}
