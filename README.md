# AWSLambdaImageResizer

AWS [recently added support](https://aws.amazon.com/about-aws/whats-new/2016/11/binary-data-now-supported-by-api-gateway/) for sending and receiving binary data through API gateway, making it possible to serve images directly.

This AWS Lambda function loads an image from S3, optionally resizes it using [sharp](http://sharp.dimens.io/), and serves it. It is configured using Lambda environment variables (and optionally also by using HTTP request headers). Instructions for configuration are shown at the top of `handler.js`:

    // You can set these config items as environment variables on the Lambda.
    // If you set the value to "HTTPHEADER", it will instead take the value from an X-[config key] HTTP header passed to the Lambda's API Gateway (headers can be set in CloudFront).
    const configKeys = [
        'S3BUCKET',          // Required: name of the s3 bucket
        'S3ROOT',            // Optional: a path, with trailing slash and not leading, to be prepended to the path from the URL
        'S3REGION',          // Optional: region of the s3 bucket, if different from that of the Lambda
        'S3ACCESSKEYID',     // Optional: an Access Key ID with access to the s3 bucket, if the Lambda's account does not have access
        'S3SECRETACCESSKEY', // Optional: a Secret Access Key with access to the s3 bucket, if the Lambda's account does not have access
        'CACHEMAXAGE',       // Optional: if specified, adds a Cache-Control header with max-age set to this number of seconds
    ];

As a minimum, you must set the S3BUCKET environment variable.

If you run it behind a CloudFront instance, you can set CACHEMAXAGE in order to cache images and avoid resizing them frequently. You can also configure CloudFront to send HTTP headers to control other configuration parameters, so that you can use a single CloudFront instance to resize images for multiple buckets (by setting the X-S3BUCKET header).

Keep in mind that any variable set to HTTPHEADER is open for manipulation by end users if they can hit the Lambda's API Gateway directly.

Resizing is enabled by prefixing the URL path with /w123, where 123 is the desired width.

Requesting an API Gateway URL like `https://1234fake.execute-api.amazonaws.com/prod/w640/images/sample/home.jpg` with the HTTP headers `X-S3BUCKET: imgmain` and `X-S3ROOT: testimages/main/` (assuming the S3BUCKET and S3ROOT environment variables are set to HTTPHEADER) would attempt to load `testimages/main/images/sample/home.jpg` from the `imgmain` bucket (in the same region as the Lambda), resize it to a width of 640, and serve it up.

When creating an API gateway for the Lambda function, check the box to "Configure as [proxy resource](https://docs.aws.amazon.com/console/apigateway/proxy-resource)", so it will capture all URL paths. In the ANY method's Integration Request, check the box to "Use Lambda Proxy Integration". And in the gateway's Binary Support section, add `*/*`.

I had trouble building sharp on Windows, so I used an EC2 instance as described in [the sharp documentation](http://sharp.dimens.io/en/stable/install/#aws-lambda).
