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

module.exports = function (appName, maxSize, maxFiles, path) {
    const os = typeof(path) ==='undefined' ? {
        windows : 'C:\\nodeLogs',
        linux : '/data/logs/node'
    } : {
        windows : typeof(path.windows) === 'undefined' ? 'C:\\nodeLogs' : path.windows,
        linux : typeof(path.linux) === 'undefined' ? '/data/logs/node' : path.linux
    };
    const base_dir = process.platform === "win32" ? os.windows : os.linux;
    if (!fs.existsSync(base_dir)) fs.mkdirSync(base_dir);
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
    const project_dir = base_dir + '/' + appName;
    if (!fs.existsSync(project_dir)) fs.mkdirSync(project_dir);
    tport.push(new transports.File({
        filename : project_dir+ '/warn.json',
        level: 'warn',
        eol: ",\n"
    }));
    tport.push(new DailyRotateFile({
        dirname : project_dir,
        localTime: true,
        filename: appName+ '-%DATE%.json',
        datePattern: 'YYYY-MM-DD-HH',
        maxSize : typeof(maxSize) ==='undefined' ? '1m' : maxSize,
        maxFiles : typeof(maxFiles) === 'undefined' ? '14d' : maxFiles,
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
            new transports.File({ filename: project_dir + '/exceptions.log' })
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
