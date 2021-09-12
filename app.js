const fs = require('fs')
const { CronJob } = require('cron')
const { differenceInMilliseconds, format, parseISO } = require('date-fns')
const ping = require('ping')
const express = require('express')
const app = express()

require('dotenv').config()

const host = process.env.TARGET_HOST
const STATE = { DOWN: 'down', UP: 'up' }

const downDB = require('./db.json')
const e = require('express')
let currentState = STATE.UP
let stateSince = new Date()

if(downDB.length > 0) {
    currentState = downDB[downDB.length - 1].state
    stateSince = parseISO(downDB[downDB.length - 1].start)
}

async function save() {
    fs.writeFileSync('./db.json', JSON.stringify(downDB, null, 2))
}

const job = new CronJob('* * * * * *', async () => {
    const { alive, time } = await ping.promise.probe(host)
    const diff = differenceInMilliseconds(new Date(), stateSince)

    if (diff >= process.env.DELAY_MS) {
        console.log(`Alive:`, alive, `Time: ${time}ms`)
        if (currentState === STATE.UP) {
            if (!alive) {
                // UP -> Down
                downDB[downDB.length - 1].end = new Date()
                currentState = STATE.DOWN
                stateSince = new Date()
                downDB.push({ time: new Date(), state: currentState, start: stateSince, end: null })
                save()
            } else {
                // UP -> UP
                downDB.pop()
                downDB.push({ time: new Date(), state: currentState, start: stateSince, end: null })
                currentState = STATE.UP
                save()
            }
        } else {
            if (alive) {
                // Down -> UP
                downDB[downDB.length - 1].end = new Date()
                currentState = STATE.UP
                stateSince = new Date()
                downDB.push({ time: new Date(), state: currentState, start: stateSince, end: null })
                save()
            } else {
                // Down -> Down
                downDB.pop()
                downDB.push({ time: new Date(), state: currentState, start: stateSince, end: null })
                currentState = STATE.DOWN
                save()
            }
        }
    }
}, null, false, 'Asia/Bangkok')

app.get('/', (req, res) => {
    let html = '<!DOCTYPE html>'
    html += '<html><head>'
    html += '<meta charset="UTF-8">'
    html += '<meta http-equiv="X-UA-Compatible" content="IE=edge">'
    html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    html += '<title>Uptime Status</title>'
    html += '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-BmbxuPwQa2lc/FVzBcNJ7UAyJxM6wuqIj61tLrc4wSX0szH/Ev+nYRRuWlolflfl" crossorigin="anonymous">'
    html += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.3.0/font/bootstrap-icons.css">'
    html += '</head><body class="py-3">'
    try {
        var reversedDB = [].concat(downDB).reverse();

        html += '<div class="container">'

        html += '<div class="mt-3 alert '
        if (reversedDB[0].state === STATE.UP) {
            html += 'alert-success">'
            html += 'Great! Server is currently up!'
        }else{
            html += 'alert-danger">'
            html += 'Oops! Server is currently down!'
        }
        html += '</div>'

        html += '<div class="card">'
        html += '<div class="card-header">Uptime table</div>'
        html += '<table class="table mb-0">'
        for (record of reversedDB) {
            const start = typeof record.start === 'string' ? parseISO(record.start) : record.start
            let end
            if(record.end === null) {
                end = new Date()
            } else {
                end = typeof record.end === 'string' ? parseISO(record.end) : record.end
            }

            const diff = differenceInMilliseconds(end, start)
            const diffs = Math.floor(diff / 1000)
            const second = diffs % 60
            const minute = Math.floor(diffs / 60)
            const hour = Math.floor(diffs / 3600)

            let duration = `.${diff % 1000}` // Milliseconds
            duration = `:${(second < 10 ? '0' : '') + second}` + duration // seconds
            duration = `:${(minute < 10 ? '0' : '') + minute}` + duration // seconds
            duration = `${(hour < 10 ? '0' : '') + hour}` + duration // seconds

            const time = typeof record.time === 'string' ? parseISO(record.time) : record.time
            html += `<tr>`
            html += `<td>${format(time, 'dd/MM/yyyy HH:mm:ss')}</td>`
            if(record.state === STATE.UP) {
                html += `<td class="text-success"><i class="bi-arrow-up"></i> ${record.state}</td>`
            } else {
                html += `<td class="text-danger"><i class="bi-arrow-down"></i> ${record.state}</td>`
            }
            html += `<td>Duration: ${duration}</td>`
            html += `</tr>`
        }
        html += '</table></div></div></body></html>'

        return res.send(html)
    } catch (err) {
        console.error(err)
        return res.status(500)
    }
})

app.get('/api/status', (req, res) => {
    var reversedDB = [].concat(downDB).reverse();
    let isUp = reversedDB[0].state === STATE.UP;
    return res.send({
        status: isUp
    });
})

app.listen(process.env.PORT || 22222)
job.start()
