import {
    BuildSpec,
    EventAction,
    FilterGroup,
    GitHubSourceCredentials,
    LinuxBuildImage,
    Project,
    Source
} from "aws-cdk-lib/aws-codebuild";
import {Construct} from "constructs";
import {SecretValue, Stack, StackProps} from "aws-cdk-lib";
import {IBucket} from "aws-cdk-lib/aws-s3";
import {PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Artifact, Pipeline} from "aws-cdk-lib/aws-codepipeline";
import {CodeBuildAction, GitHubSourceAction, GitHubTrigger, S3DeployAction} from "aws-cdk-lib/aws-codepipeline-actions";

const SECRET_ARN = 'arn:aws:secretsmanager:eu-central-1:123456789012:secret:github/secret-XYZ'

interface Props extends StackProps {
    bucket: IBucket;
}

export class PipelineStack extends Stack {
    constructor(scope: Construct, id: string, props: Props) {
        super(scope, id, props);
        new GitHubSourceCredentials(this, 'code-build-credentials', {
            accessToken: SecretValue.secretsManager('github/secret')
        })
        const source = Source.gitHub({
            owner: 'exanubes',
            repo: 'aws-pipeline',
            webhook: true,
            webhookFilters: [
                FilterGroup.inEventOf(EventAction.PUSH).andBranchIs('master')
            ]
        })
        const buildSpec = this.getBuildSpec();
        const project = new Project(this, 'project', {
            projectName: 'pipeline-project',
            source,
            environment: {
                buildImage: LinuxBuildImage.STANDARD_5_0,
                privileged: true,
            },
            buildSpec
        })
        project.addToRolePolicy(new PolicyStatement({
            actions: ["secretsmanager:GetSecretValue"],
            resources: [SECRET_ARN]
        }))
        props.bucket.grantReadWrite(project.grantPrincipal)

        const artifacts = {
            source: new Artifact("Source"),
            build: new Artifact("BuildOutput"),
        }
        const pipelineActions = {
            source: new GitHubSourceAction({
                actionName: "Github",
                owner: "exanubes",
                repo: "app",
                branch: "master",
                oauthToken: SecretValue.secretsManager("github/secret"),
                output: artifacts.source,
                trigger: GitHubTrigger.WEBHOOK,
            }),
            build: new CodeBuildAction({
                actionName: "CodeBuild",
                project,
                input: artifacts.source,
                outputs: [artifacts.build],
            }),
            deploy: new S3DeployAction({
                actionName: "S3Deploy",
                bucket: props.bucket,
                input: artifacts.build,
            }),
        }

        const pipeline = new Pipeline(this, "DeployPipeline", {
            pipelineName: `s3-pipeline`,
            stages: [
                { stageName: "Source", actions: [pipelineActions.source] },
                { stageName: "Build", actions: [pipelineActions.build] },
                { stageName: "Deploy", actions: [pipelineActions.deploy] },
            ],
        })
    }

    private getBuildSpec() {
        return BuildSpec.fromObject({
            version: '0.2',
            env: {
                shell: 'bash'
            },
            phases: {
                pre_build: {
                    commands: [
                        'echo Build started on `date`',
                        'aws --version',
                        'node --version',
                        'npm install',
                    ],
                },
                build: {
                    commands: [
                        'npm run build',
                    ],
                },
                post_build: {
                    commands: [
                        'echo Build completed on `date`',
                    ]
                }
            },
            artifacts: {
                ['base-directory']: 'public',
                files: ['**/*']
            },
            cache: {
                paths: ['node_modules/**/*']
            }
        })
    }
}
