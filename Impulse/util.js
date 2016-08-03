function ImpulseUtil(controller) {
  var util = this;
  this.controller = controller;
  this.template = controller.template;
  this.events = controller.events;


  this.timeouts = [];
  this.clearedTimeouts = [];
  this.intervals = [];
  this.clearedIntervals = [];
  this.readClearedDelay = 15000;


  this.setTimeout = function(callback, params, delay) {
    delay = delay || 0;
    params = params || [];
    var index = this.getNextTimeoutId();
    this.timeouts[index] = callback;
    //println('set ' + index + ': ' + delay);
    host.scheduleTask(this.timeoutHandler, [index, params], delay);
    return index;
  };

  this.timeoutHandler = function(index, params) {
    var callback = util.timeouts[index];
    if (callback) {
      //println('execute ' + index);
      callback.apply(util, params);
      util.clearTimeout(index);
    }
  };

  this.clearTimeout = function(id) {
    delete util.timeouts[id];
    //println('clear ' + id);

    // This is to avoid possible race conditions when there's one timeout set
    // and cleared often in a short period of time:
    // The first timeout is set but before it's executed it's cleared and set again.
    // Since we can't clear host.scheduleTask the timeoutHandler gets executed
    // for each setTimeout (regardless whether or not it's cleared afterwards).
    // So the new timeout gets the same id as the old one and the execution of the
    // first timeoutHandler sees that the id exist and executes its callback.

    // We could just make timeout ids unique, but I think this would consume a
    // lot of resources after prolonged usage.
    // So we work around this problem by delaying adding a cleared id to
    // clearedTimeouts by a timespan way longer than a typical timeout that would
    // be set/cleared on a short period of time.

    // So we wait for 15s to free each cleared timeout id.
    host.scheduleTask(function(id) {
      //println('readd cleared id ' + id);
      util.clearedTimeouts.push(id);
    }, [id], util.readClearedDelay);
  };

  this.getNextTimeoutId = function() {
    // Reuse the oldest cleared timeout id.
    var index = this.clearedTimeouts.shift();
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
    var callback = util.intervals[index];
    if (callback) {
      callback.apply(util, params);
      host.scheduleTask(util.intervalHandler, [index, params, interval], interval);
    }
  };

  this.clearInterval = function(id) {
    delete this.intervals[id];

    // See this.clearTimeout for details about possible race conditions.
    host.scheduleTask(util.clearedIntervals.push, [id], util.readClearedDelay);
  };

  this.getNextIntervalId = function() {
    // Reuse the oldest cleared interval id.
    var index = this.clearedIntervals.shift();
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
