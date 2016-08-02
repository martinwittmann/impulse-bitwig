
function BitwigController() {
  var controller = this;

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
      blinking: [],
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

  this.timeouts = [];
  this.clearedTimeouts = [];
  this.intervals = [];
  this.clearedIntervals = [];

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
    this.i = -1;

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
      controller.displayModePageTrackOnHost();
      controller.setTextDisplay(text, 'text');
    });

    this.cursorTrack.addPositionObserver(function(index) {
      controller.activeTrack = parseInt(index, 10);
      controller.scrollToTrackBankPage();
    });

    this.trackBank.addTrackScrollPositionObserver(function(value) {
      var c = controller;
      c.state.tracks.currentOffset = value;
      if (c.state.pads.useAsButtons) {
        c.updatePadLights();
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
          if ('undefined' == typeof tracks[tracks.currentOffset + index + 1]) {
            tracks[tracks.currentOffset + index + 1] = {
              mute: false,
              solo: false
            };
          }
          tracks[tracks.currentOffset + index + 1].mute = value;
          if (c.state.pads.useAsButtons) {
            c.trackMuteChanged(tracks.currentOffset + index, value);
          }
        };
      })());

      track.getSolo().addValueObserver((function() {
        var index = i;
        return function(value) {
          var c = controller;
          var tracks = c.state.tracks;
          if ('undefined' == typeof tracks[tracks.currentOffset + index + 1]) {
            tracks[tracks.currentOffset + index + 1] = {
              mute: false,
              solo: false
            };
          }
          tracks[tracks.currentOffset + index + 1].solo = value;
          if (c.state.pads.useAsButtons) {
            c.trackSoloChanged(index, value);
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
          textDisplay = this.getMixerStatusStr;
          break;

        case 'midi':
          textDisplay = this.getClipStatusStr;
          break;

        default:
          textDisplay = this.currentTrackName;
      }
      this.setTextDisplay(textDisplay, 'text');
    }
  };

  this.getMixerStatusStr = function() {
    return 'mm r M  ';
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
      controller.setTimeout(callback, [], delay);
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
      this.clearTimeout(this.state.textDisplayTimeouts[location]);
      this.state.textDisplayTimeouts[location] = controller.setTimeout(function(location) {
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
    //this.setTextDisplay(modeText + ' / ' + pageText + ' / ' + this.currentTrackName, 'host');
  };

  this.setTimeout = function(callback, params, delay) {
    delay = delay || 0;
    params = params || [];
    var index = this.getNextTimeoutId();
    this.timeouts[index] = callback;

    host.scheduleTask(function(index) {
      var callback = controller.timeouts[index];
      if (callback) {
        callback.apply(controller, params);
      }
    }, [index], delay);

    return index;
  };

  this.clearTimeout = function(id) {
    delete this.timeouts[id];
    this.clearedTimeouts.push(id);
  };

  this.getNextTimeoutId = function() {
    var index = this.clearedTimeouts.pop();
    return 'undefined' !== typeof index ? index : this.timeouts.length; 
  };

  this.setInterval = function(callback, params, interval) {
    println('setting');
    if (!interval || !callback) {
      return false;
    }
    params = params || [];
    var index = this.getNextIntervalId();
    this.intervals[index] = callback;
    host.scheduleTask(this.intervalHandler, [index, params, interval], interval);
    return index;
  };

  this.intervalHandler = function(index, params, interval) {
    var callback = controller.intervals[index];
    if (callback) {
      callback.apply(controller, params);
      host.scheduleTask(controller.intervalHandler, [index, params, interval], interval);
    }
  };

  this.clearInterval = function(id) {
    delete this.intervals[id];
    this.clearedIntervals.push(id);
  };

  this.getNextIntervalId = function() {
    var index = this.clearedIntervals.pop();
    return 'undefined' !== typeof index ? index : this.intervals.length; 
  };

  this.usePadsAsButtons = function(value) {
    value = !!value;
    this.state.pads.useAsButtons = value;
    this.updatePadLights();
  };

  this.updatePadLights = function() {
    var value = 0, blink = false;
    if (this.state.pads.useAsButtons) {
      var tracks = this.state.tracks;
      var offset = this.state.tracks.currentOffset;
      for (var i=offset;i<offset+8;i++) {
        value = 0;
        blink = false;

        if (tracks[i + 1].solo) {
          blink = true;
          value = 127;
        }
        else if (tracks[i + 1].mute) {
          value = 127;
        }
        this._setPadLight(i % 8, value, blink);
      }
    }
  };

  this._setPadLight = function(index, value, blink) {
    blink = blink || false;
    cc = this.template.data['pad' + (index % 8 + 1) + 'Note'];
    sendMidi(0xB0, '0x' + cc, value);
    // The value we assign only hold the information whether or not it's currently
    // on or off. 
    if (blink) {
      this.state.pads.blinking[index + 1] = !!value;
      if (false === this.state.pads.blinkIntervalId) {
        this.state.pads.blinkIntervalId = this.setInterval(this.padBlinkingHandler, [], 800);
      }
    }
  }

  this.padBlinkingHandler = function() {
    var blinkPads = [];
    for (key in this.state.pads.blinking) {
      blinkPads.push(key);
    }
    if (!blinkPads.length) {
      this.clearInterval(this.state.pads.blinkIntervalId);
    }
    else {
      var value;
      for (var i=0;i<blinkPads.length;i++) {
        value = this.state.pads.blinking[blinkPads[i]] ? 0 : 127;
        this._setPadLight(blinkPads[i] - 1, value, true);
      }
    }
  };

  this.trackMuteChanged = function(index, value) {
    this.setTimeout(function(index, value) {
      value = value ? 127 : 0;
      this._setPadLight(index, value);
    }, [index, value], 100);
  };

  this.trackSoloChanged = function(index, value) {
    this.setTimeout(function(index, value) {
      var lightValue = value ? 127 : 0;
      this._setPadLight(index, lightValue, !!value);
    }, [index, value], 100);
  };
}


function debug(data, recurse, showHeader) {
  var value;
  showHeader = showHeader || false;
  recurse = recurse || false;
  println('[' + typeof data + ']: ' + data);
  if ('object' == typeof data) {
    for (key in data) {
      value = data[key];
      switch (typeof value) {
        case 'object':
        case 'function':
          value = '[' + typeof value + ']';
      }
      println('  ' + key + ': ' + value);
      //if ('object' == data[key] && recurse) {
        //debug(data[key], recurse, false);
      //}
    }
  }
}