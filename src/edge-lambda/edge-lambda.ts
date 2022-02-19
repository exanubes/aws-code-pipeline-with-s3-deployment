import {CloudFrontRequestEvent, Callback, Context} from "aws-lambda"
export function main (event: CloudFrontRequestEvent, context: Context, callback: Callback) {
    const request = event.Records[0].cf.request;
    request.uri = request.uri.replace(/\/$/, '\/index.html');
    return callback(null, request);
}
