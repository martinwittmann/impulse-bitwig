function ImpulseUtil(controller) {
  this.controller = controller;
  this.template = controller.template;
  this.events = controller.events;


  this.timeouts = [];
  this.clearedTimeouts = [];
  this.intervals = [];
  this.clearedIntervals = [];


  this.setTimeout = function(callback, params, delay) {
    delay = delay || 0;
    params = params || [];
    var index = this.getNextTimeoutId();
    this.timeouts[index] = callback;

    host.scheduleTask(function(index) {
      var callback = controller.util.timeouts[index];
      if (callback) {
        callback.apply(controller.util, params);
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
    var callback = controller.util.intervals[index];
    if (callback) {
      callback.apply(controller.util, params);
      host.scheduleTask(controller.util.intervalHandler, [index, params, interval], interval);
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


  this.debug = function(data, showHeader,level) {
    if ('undefined' === typeof showHeader) {
      showHeader = true;
    }
    level = level || 0;
    var value, indent = level > 0 ? '  '.repeat(level) : '';

    if (showHeader) {
      println('');
      println(indent + '[' + typeof data + ']: ' + data);
    }

    if ('object' == typeof data) {
      for (key in data) {
        value = data[key];
        switch (typeof value) {
          case 'object':
          case 'function':
            value = '[' + typeof value + ']';
        }
        println(indent + '  ' + key + ': ' + value);
        if ('object' == typeof data[key] && level < 2) {
          this.debug(data[key], false, level+1);
        }
      }
    }
  };
}
