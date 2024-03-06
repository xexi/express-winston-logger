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
const default_maxSize = '1m';
const default_maxFiles = '14d';
const default_path = {
    windows : 'C:\\nodeLogs',
    linux : '/data/logs/node'
};
const default_datePattern = 'YYYY-MM-DD-HH';

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

class optionFormata{
    constructor(o){
        if(typeof(o)==='undefined'){
            this.maxSize = default_maxSize;
            this.maxFiles = default_maxFiles;
            this.path = default_path;
            this.datePattern = default_datePattern;
        } else {
            this.maxSize = typeof(o.maxSize) === 'undefined' ? default_maxSize : o.maxSize;
            this.maxFiles = typeof(o.maxFiles) === 'undefined' ? default_maxFiles : o.maxFiles;
            this.path = typeof(o.path) === 'undefined' ? default_path : {
                windows : typeof(o.path.windows) === 'undefined' ? default_path.windows : o.path.windows,
                linux : typeof(o.path.linux) === 'undefined' ? default_path.linux : o.path.linux
            };
            this.datePattern = typeof(o.datePattern) === 'undefined' ? default_datePattern : o.datePattern
        }
    }
}

module.exports = function (appName, option) {
    const opt = new optionFormata(option);
    const path = opt.path
    const base_dir = process.platform === "win32" ? path.windows : path.linux;
    if (!fs.existsSync(base_dir)){
        fs.mkdirSync(base_dir, {recursive: true});
    }
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
    if (!fs.existsSync(project_dir)){
        fs.mkdirSync(project_dir, {recursive: true});
    }
    tport.push(new transports.File({
        filename : project_dir+ '/warn.json',
        level: 'warn',
        eol: ",\n"
    }));
    tport.push(new DailyRotateFile({
        dirname : project_dir,
        localTime: true,
        filename: appName+ '-%DATE%.json',
        datePattern: opt.datePattern,
        maxSize : opt.maxSize,
        maxFiles : opt.maxFiles,
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
