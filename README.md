# AWSLambdaImageResizer

AWS [recently added support](https://aws.amazon.com/about-aws/whats-new/2016/11/binary-data-now-supported-by-api-gateway/) for sending and receiving binary data through API gateway, making it possible to serve images directly.

This AWS Lambda function loads an image from S3, optionally resizes it using [sharp](http://sharp.dimens.io/), and serves it. It is meant to be used behind a CloudFront instance configured to send HTTP headers specifying the bucket from which to load the image; this way a single Lambda can be used by multiple CloudFront instances to serve from different buckets (or paths within a bucket).

The headers to send are:
* X-S3-Bucket: the bucket name
* X-S3-Region (optional): the bucket's region, if different from the Lambda's region
* X-S3-Root (optional): a root directory within the bucket to prepend to requested paths, with a trailing slash and no leading slash

Resizing is enabled by prefixing the URL path with /w123, where 123 is the desired width.

Requesting an API Gateway URL like `https://1234fake.execute-api.amazonaws.com/prod/w640/images/sample/home.jpg` with the HTTP headers `X-S3-Bucket: imgmain` and `X-S3-Root: testimages/main/` would attempt to load `testimages/main/images/sample/home.jpg` from the `imgmain` bucket (in the same region as the Lambda), resize it to a width of 640, and serve it up.

If the Lambda does not have permission to access the bucket, you can specify different credentials by adding environment variables to the Lambda's configuration to specify the keys to use:
* S3KEY: Access Key ID
* S3SECRET: Secret Access Key

When creating an API gateway for the Lambda function, check the box to "Configure as [proxy resource](https://docs.aws.amazon.com/console/apigateway/proxy-resource)", so it will capture all URL paths. In the ANY method's Integration Request, check the box to "Use Lambda Proxy Integration". And in the gateway's Binary Support section, add `*/*`.

I had trouble building sharp on Windows, so I used an EC2 instance as described in [the sharp documentation](http://sharp.dimens.io/en/stable/install/#aws-lambda).
