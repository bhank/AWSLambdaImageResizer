"use strict";

const AWS = require('aws-sdk');

/*
    To configure, set up CloudFront to point at this lambda's API Gateway URL, and add custom headers X-S3-Bucket and (optionally) X-S3-Region and X-S3-Root (with trailing slash, not leading!).
*/

module.exports.handler = (event, context, callback) => {
    //console.log('handler:', arguments);

    try {
        const { path: originalPath, headers: { 'X-S3-Bucket': bucket, 'X-S3-Root': root, 'X-S3-Region': region } } = event;
        const regex = /^(?:\/w(\d+))?\/(.*\.(.+?))$/;
        const [,resizeWidth,path,extension] = originalPath.match(regex);
        const contentType = getContentType(extension);
        const key = decodeURI(root + path); // TODO: test with weird chars to see if any encoding/decoding is necessary. Lambda rejects URLs with [] brackets, so I'll need to encode those, I guess, and decode here. Ugly.

        getFileFromS3AndContinue(bucket, region, key, resizeWidth, contentType, callback);
    } catch (errorMessage) {
        returnErrorResponse(errorMessage, callback);
    }
};	

function returnErrorResponse(errorMessage, callback) {
        console.log(errorMessage);

        const response = {
            statusCode: 400,
            body: 'Error: ' + JSON.stringify(errorMessage)
        };

        callback(null, response);
}

function returnResponse(content, contentType, callback) {
    try {
        const response = {
            statusCode: 200,
            headers: {
                "Content-Type": contentType
            },
            body: content.toString("base64"),
            isBase64Encoded: true
        };
        callback(null, response);
    } catch (errorMessage) {
        returnErrorResponse(errorMessage, callback);
    }
    
}

function resizeAndContinue(content, resizeWidth, contentType, callback) {
    try {
        console.log('resizeAndContinue:', arguments);
        // TODO: resize...
        returnResponse(content, contentType, callback);
    } catch (errorMessage) {
        returnErrorResponse(errorMessage, callback);
    }
    
}

function getFileFromS3AndContinue(Bucket, Region, Key, resizeWidth, contentType, callback) {
    try {
        console.log('getFileFromS3AndContinue:', arguments);
        const opts = {};

        // Optionally provide credentials in the Lambda environment config, in case the Lambda account doesn't have access to the S3 bucket.
        opts.accessKeyId = process.env.S3KEY;
        opts.secretAccessKey = process.env.S3SECRET;

        if(Region) {
            opts.region = Region;
        }

        var s3 = new AWS.S3(opts);
        s3.getObject({Bucket, Key}, (err, result) => {
            console.log('getObject:', err, result);
            if(err) {
                returnErrorResponse(err, callback);
            } else {
                resizeAndContinue(result.Body, resizeWidth, contentType, callback);
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
