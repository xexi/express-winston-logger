/**
 * Created by xexi on 2018-07-23.
 */
'use strict';
const fs = require('fs')
const appIp = require('ip').address()
const { createLogger, format, transports } = require('winston')
const { combine, label, timestamp, printf, colorize, simple } = format
const DailyRotateFile  = require('winston-daily-rotate-file')
const tport = []
const locale = process.platform === "win32" ? 'C:\\nodeLogs' : '/data/logs/node'
if (!fs.existsSync(locale)) fs.mkdirSync(locale);
if(process.env.NODE_ENV!=='production') {
    tport.push(new transports.Console({
        level: 'debug',
        handleExceptions: true,
        json: false,
        format: combine(
            colorize(),
            simple()
        )
    }));
}
class loggerFormata{
    constructor(level, label, code, requestdata, message, responsetime){
        this.level = level;
        this.label = label;
        this.code = code;
        this.requestdata = requestdata;
        this.message = message;
        this.responsetime = responsetime;
    }
}
module.exports = function (appName) {
    const location = process.platform === "win32" ? 'C:\\nodeLogs\\' + appName : '/data/logs/node/' + appName
    if (!fs.existsSync(location)) fs.mkdirSync(location);
    tport.push(new transports.File({
        filename : location+ '/warn.log',
        level: 'warn'
    }));
    tport.push(new DailyRotateFile({
        dirname : location,
        localTime: true,
        filename: appName+ '-%DATE%.json',
        datePattern: 'YYYY-MM-DD-HH',
        maxSize : '1m',
        maxFiles : '14d',
        eol: ",\n"
    }));
    const logger = createLogger({
        level : 'debug',
        format: combine(
            timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
            printf(info => `{ "appName": "`+ appName +`", "timeStamp":"${info.timestamp}", "level":"${info.level}", "label":"${info.label}", "code": ${info.code}, "requestdata": ${info.requestdata}, "message": ${info.message}, "responseTime": ${info.responsetime}, "serverIp": "`+appIp+`" }`)
        ),
        transports : tport,
        exceptionHandlers: [
            new transports.File({ filename: location + '/exceptions.log' })
        ],
        exitOnError: false
    });
    return {
        start : () =>{
            return function a(req, res, next){
                req['st'] = new Date()
                next()
            }
        },
        info: (label, code, req, msg, st)=>{
            logger.log(new loggerFormata('info', label, code, req, msg, new Date()-st))
        },
        error: (label, code, req, msg, st)=>{
            logger.log(new loggerFormata('error', label, code, req, msg, new Date()-st))
        },
        warn: (label, code, req, msg, st)=>{
            logger.log(new loggerFormata('warn', label, code, req, msg, new Date()-st))
        },
        verbose: (label, code, req, msg, st)=>{
            logger.log(new loggerFormata('verbose', label, code, req, msg, new Date()-st))
        },
        debug : (label, code, req, msg, st)=>{
            logger.log(new loggerFormata('debug', label, code, req, msg, new Date()-st))
        }
    }
};
