const { ConfigServiceClient } =  require('@aws-sdk/client-config-service')
const client = new ConfigServiceClient({})

export async function getRegion (){
    return client.config.region()
}
