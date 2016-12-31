"use strict";

const AWS = require('aws-sdk');
const sharp = require('sharp');

// You can set these config items as environment variables on the Lambda.
// If you set the value to "HTTPHEADER", it will instead take the value from an X-[config key] HTTP header passed to the Lambda's API Gateway (headers can be set in CloudFront).
const configKeys = [
    'S3BUCKET',          // Required: name of the s3 bucket
    'S3ROOT',            // Optional: a path, with trailing slash and not leading, to be prepended to the path from the URL
    'S3REGION',          // Optional: region of the s3 bucket, if different from that of the Lambda
    'S3ACCESSKEYID',     // Optional: an Access Key ID with access to the s3 bucket, if the Lambda's account does not have access
    'S3SECRETACCESSKEY', // Optional: a Secret Access Key with access to the s3 bucket, if the Lambda's account does not have access
    'CACHEMAXAGE',       // Optional: if specified, adds a Cache-Control header with max-age set to this number of seconds
    'DEBUG'              // Optional: if set, logs function calls to console
];

module.exports.handler = (event, context, callback) => {
    if(process.env.DEBUG) { console.log('handler:', arguments); }
    try {
        const regex = /^(?:\/w(\d+))?\/(.*\.(.+?))$/;
        const [,resizeWidth,path,extension] = event.path.match(regex);
        const contentType = getContentType(extension);

        const config = configKeys.reduce((accum, configKey) => (
            {
                ...accum,
                [configKey]: process.env[configKey] == 'HTTPHEADER' ? event.headers['X-' + configKey] : process.env[configKey]
            }
        ), { contentType, resizeWidth });
        config.key = decodeURI(config.S3ROOT + path); // Lambda rejects URLs with [] brackets, so I'll need to encode those, I guess, and decode here. Ugly.

        getFileFromS3AndContinue(config, callback);
    } catch (errorMessage) {
        returnErrorResponse(errorMessage, callback);
    }
};	

function returnErrorResponse(errorMessage, callback) {
    const response = {
        statusCode: 400,
        body: 'Error: ' + JSON.stringify(errorMessage)
    };

    callback(null, response);
}

function returnResponse(content, config, callback) {
    try {
        const response = {
            statusCode: 200,
            headers: {
                "Content-Type": config.contentType
            },
            body: content.toString("base64"),
            isBase64Encoded: true
        };
        if(config.CACHEMAXAGE) {
            response.headers['Cache-Control'] = 'max-age=' + config.CACHEMAXAGE;
        }
        callback(null, response);
    } catch (errorMessage) {
        returnErrorResponse(errorMessage, callback);
    }
}

function resizeAndContinue(content, config, callback) {
    try {
        if(config.DEBUG) { console.log('resizeAndContinue:', arguments); }
        const width = +config.resizeWidth;
        if(width > 0 && width < 10000) {
            sharp(content)
                .resize(width)
                .toBuffer((err, buffer, info) => {
                    if(err) {
                        returnErrorResponse(err, callback);
                    } else {
                        returnResponse(buffer, config, callback);
                    }
                });
        } else {
            returnResponse(content, config, callback);
        }
    } catch (errorMessage) {
        returnErrorResponse(errorMessage, callback);
    }
}

function getFileFromS3AndContinue(config, callback) {
    try {
        if(config.DEBUG) { console.log('getFileFromS3AndContinue:', arguments); }
        const opts = {
            accessKeyId: config.S3ACCESSKEYID,
            secretAccessKey: config.S3SECRETACCESSKEY,
            region: config.REGION
        };

        var s3 = new AWS.S3(opts);
        s3.getObject({Bucket: config.S3BUCKET, Key: config.key}, (err, result) => {
            if(config.DEBUG) { console.log('getObject:', err, result); }
            if(err) {
                returnErrorResponse(err, callback);
            } else {
                resizeAndContinue(result.Body, config, callback);
            }
        });
    } catch (errorMessage) {
        returnErrorResponse(errorMessage, callback);
    }
}

function getContentType(extension) {
    switch(extension.toLowerCase()) {
        case 'png':
            return 'image/png';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'tif':
        case 'tiff':
            return 'image/tiff';
        default:
            return 'application/octet-stream';
    }
}
