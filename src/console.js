/*global module, window*/
'use strict';

function noop() {}

module.exports = window.console || {
  assert: noop,
  clear: noop,
  constructor: noop,
  count: noop,
  debug: noop,
  dir: noop,
  dirxml: noop,
  error: noop,
  group: noop,
  groupCollapsed: noop,
  groupEnd: noop,
  info: noop,
  log: noop,
  markTimeline: noop,
  profile: noop,
  profileEnd: noop,
  table: noop,
  time: noop,
  timeEnd: noop,
  timeStamp: noop,
  timeline: noop,
  timelineEnd: noop,
  trace: noop,
  warn: noop
};
