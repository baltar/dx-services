const loggerNamespace = 'dx-service:api:routes'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)

const dateUtil = require('../../helpers/dateUtil')
const formatUtil = require('../../helpers/formatUtil')

const AUCTIONS_REPORT_MAX_NUM_DAYS = 15
let requestId = 1

function createRoutes ({ reportService }) {
  const routes = []

  // AuctionsReport
  //    test:
  //      curl http://localhost:8081/api/v1/reports/auctions-report/requests
  //      curl http://localhost:8081/api/v1/reports/auctions-report/requests?from-date=26/11/1984&to-date=26/11/1984
  routes.push({
    path: '/auctions-report/requests',
    get (req, res) {
      const id = requestId++
      // Get the date range
      const { fromDate, toDate } = _getDateRangeFromRequest(req)

      // Make sure we don't exceed the maximun number of days
      const numDaysDifference = dateUtil.diff(fromDate, toDate, 'days')
      // logger.debug('numDaysDifference: ', numDaysDifference)
      if (numDaysDifference > AUCTIONS_REPORT_MAX_NUM_DAYS) {
        const error = new Error("'toDate' must be greater than 'fromDate")
        error.type = 'MAX_NUM_DAYS_EXCEEDED'
        error.data = {
          fromDate,
          toDate,
          numberOfDays: numDaysDifference,
          maxNumberOfDays: AUCTIONS_REPORT_MAX_NUM_DAYS
        }
        error.status = 412
        throw error
      }

      logger.info('Requested AuctionsReport from "%s" to "%s"',
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )

      // Generate report file
      reportService.getAuctionsReportFile({
        fromDate,
        toDate
      }).then(({ name, mimeType, content }) => {
        // Sen the file to slack
        logger.info('[requestId=%d] Report file "%s" was generated. Sending it to slack',
          id, name)
        // TODO: Send XLS to SLACK
      })

      return res.json({
        message: 'The report request has been submited',
        id
      })
    }
  })

  return routes
}

function _getDateRangeFromRequest (req) {
  let [ fromDateStr, toDateStr, period ] = [
    'from-date',
    'to-date',
    'period'
  ].map(p => req.query[p])

  let toDate, fromDate, error
  if (fromDateStr && toDateStr) {
    fromDate = formatUtil.parseDate(fromDateStr)
    toDate = formatUtil.parseDate(toDateStr)
  } else if (period) {
    const today = new Date()
    switch (period) {
      case 'today':
        fromDate = today
        toDate = today
        break

      case 'yesterday':
        const yesterday = dateUtil.addPeriod(today, -1, 'days')
        fromDate = yesterday
        toDate = yesterday
        break

      case 'week':
        const oneWeekAgo = dateUtil.addPeriod(today, -7, 'days')
        fromDate = oneWeekAgo
        toDate = today
        break

      case 'last-week':
        const lastWeek = dateUtil.addPeriod(today, -1, 'weeks')
        fromDate = dateUtil.toStartOf(lastWeek, 'isoWeek')
        toDate = dateUtil.toEndOf(lastWeek, 'isoWeek')
        break

      case 'current-week':
        fromDate = dateUtil.toStartOf(today, 'isoWeek')
        toDate = dateUtil.toEndOf(today, 'isoWeek')
        break

      default:
        error = new Error(`Unknown 'period': ${period}. Valid values are: day, week`)
        error.type = 'DATE_RANGE_INVALID'
        error.data = { period }
    }
  } else {
    error = new Error("Either 'from-date' and 'to-date' params or 'period' params, are required.")
    error.type = 'DATE_RANGE_INVALID'
    error.data = {
      fromDate: fromDateStr || null,
      toDate: toDateStr || null
    }
  }

  if (!error) {
    // We include the fromDate day amd the toDate day in the date range
    fromDate = dateUtil.toStartOf(fromDate, 'day')
    toDate = dateUtil.toEndOf(toDate, 'day')
    
    // Validate that the range is valid
    if (fromDate > toDate) {
      error = new Error("'toDate' must be greater than 'fromDate")
      error.type = 'DATE_RANGE_INVALID'
      error.data = {
        fromDate,
        toDate
      }
    }
  }

  if (error) {
    error.status = 412
    throw error
  }


  return { fromDate, toDate }
}

module.exports = createRoutes
