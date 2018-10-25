const moment = require('moment')

function addPeriod (date, amount, period) {
  return moment(date)
    .add(amount, period)
    .toDate()
}

function toStartOf (date, period) {
  return moment(date)
    .startOf(period)
    .toDate()
}

function toEndOf (date, period) {
  return moment(date)
    .endOf(period)
    .toDate()
}

function diff (date1, date2, period) {
  return moment(date2)
    .diff(date1, period)
}

function nowIsBetween (date1, date2) {
  return moment().isBetween(date1, date2)
}

function newDate (date, format) {
  return moment(date, format)
}

module.exports = {
  addPeriod,
  toStartOf,
  toEndOf,
  diff,
  nowIsBetween,
  newDate
}
