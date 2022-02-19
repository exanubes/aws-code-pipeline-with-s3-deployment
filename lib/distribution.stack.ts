import {Bucket, IBucket} from "aws-cdk-lib/aws-s3";
import {RemovalPolicy, Stack, StackProps} from "aws-cdk-lib";
import {Construct} from "constructs";
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as path from "path";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {Code, Runtime, Tracing} from "aws-cdk-lib/aws-lambda";
import {Certificate} from "aws-cdk-lib/aws-certificatemanager";
import {Distribution, LambdaEdgeEventType, ViewerProtocolPolicy} from "aws-cdk-lib/aws-cloudfront";
import {S3Origin} from "aws-cdk-lib/aws-cloudfront-origins";
import {ARecord, CnameRecord, HostedZone, RecordTarget} from "aws-cdk-lib/aws-route53";
import * as targets from 'aws-cdk-lib/aws-route53-targets'

const certificateArn = 'arn:aws:acm:us-east-1:123456789012:certificate/XYZ'

export class DistributionStack extends Stack {
    public readonly bucket: IBucket

    constructor(app: Construct, id: string, props: StackProps) {
        super(app, id, props);
        this.bucket = new Bucket(this, 'deploy-bucket', {
            publicReadAccess: true,
            bucketName: 'random-static-hosting-bucket-name-123451234123',
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            websiteIndexDocument: 'index.html',
        })
        const edgeLambda = new cloudfront.experimental.EdgeFunction(
            this,
            "request-url-proxy",
            {
                runtime: Runtime.NODEJS_14_X,
                handler: "edge-lambda.main",
                code: Code.fromAsset(path.join(__dirname, "../src/", `edge-lambda`)),
                memorySize: 128,
                logRetention: RetentionDays.ONE_DAY,
                tracing: Tracing.DISABLED, // x-ray tracing
                currentVersionOptions: {
                    removalPolicy: RemovalPolicy.DESTROY,
                },
            }
        )
        const certificate = Certificate.fromCertificateArn(
            this,
            "cloudfront-ssl-certificate",
            certificateArn
        )
        const distribution = new Distribution(this, "distribution", {
            defaultBehavior: {
                origin: new S3Origin(this.bucket),
                edgeLambdas: [
                    {
                        functionVersion: edgeLambda.currentVersion,
                        eventType: LambdaEdgeEventType.VIEWER_REQUEST,
                    },
                ],
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            certificate,
            defaultRootObject: "index.html",
            domainNames: ["www.dev.exanubes.com", "dev.exanubes.com"],
        })
        const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hosted-zone", {
            hostedZoneId: "Z09747622HB25HPBEB7U5",
            zoneName: "dev.exanubes.com",
        })
        new CnameRecord(this, "www.cname", {
            zone: hostedZone,
            recordName: "www",
            domainName: distribution.distributionDomainName,
        })
        new ARecord(this, "apex.alias", {
            zone: hostedZone,
            target: RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        })
    }
}
