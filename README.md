# AWS Code Pipeline with S3 deployment

Repository from [exanubes.com](https://exanubes.com) for [AWS Code Pipeline with S3 Deployment and Github Repository](https://exanubes.com/blog/aws-code-pipeline-with-s3-deployment-from-github-repository).


## Commands:

Run the following commands for deploying and destroying the stacks

```
npm run cdk:deploy
npm run cdk:destroy
```


Both of these commands use the `aws-cli sts` service to get the account id and aws IAM role `exanubes-cloudformation-access` in order to dynamically provide role arn. Make sure you're using the account you want to deploy the stacks to and that you have the role created either with the same name or different name and change the scripts in `package.json`.
