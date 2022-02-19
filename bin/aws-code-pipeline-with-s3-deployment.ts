#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {DistributionStack} from "../lib/distribution.stack";
import {PipelineStack} from "../lib/pipeline.stack";
import {getRegion} from "../utils";

async function main() {
    const app = new cdk.App();
    const region = await getRegion()
    const distribution = new DistributionStack(app, DistributionStack.name, {env: {region}})
    new PipelineStack(app, PipelineStack.name, {bucket: distribution.bucket, env: {region}})
}


main().catch(error => {
    console.log(error)
    process.exit(1)
})
